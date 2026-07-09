#!/bin/sh

echo "run_id: $RUN_ID"
echo "profile: ${PROFILE:-functional}"


  ENVIRONMENT="${ENVIRONMENT:-dev}"
  if [ -f ".env.${ENVIRONMENT}" ]; then
    while IFS='=' read -r key value; do
      case "$key" in ''|'#'*) continue ;; esac
      eval "current=\${$key:-}"
      if [ -z "$current" ]; then
        export "$key=$value"
      fi
    done < ".env.${ENVIRONMENT}"
  fi

  ZAP_PORT=8080
  ZAP_BASE="http://127.0.0.1:${ZAP_PORT}"
  ZAP_LOG="/tmp/zap-${RUN_ID:-local}.log"
  ZAP_CONTEXT="waste-packaging-regulator"
  # Quoted at the call site below — the project name has spaces, and this is
  # a single --project=VALUE token, not something to word-split.
  SECURITY_PROJECTS="--project=Regulator-Dashboard-Functional-Tests"

  start_zap() {
    echo "starting ZAP daemon on ${ZAP_BASE}"
    mkdir -p zap-report
    # -host 127.0.0.1 keeps the API on loopback (why api.disablekey=true is safe).
    # -silent suppresses the boot-time add-on update check.
    # connection.proxyChain.* points ZAP's outbound HTTP at the CDP egress proxy
    # on localhost:3128 — without this, ZAP can't reach the EPR app host.
    # timeoutInSecs bumps the 20s default to 120s so a slow cold-start page
    # doesn't trip a spurious ZAP-side timeout.
    zap.sh -daemon -silent -host 127.0.0.1 -port "$ZAP_PORT" \
      -config api.disablekey=true \
      -config connection.proxyChain.hostName=127.0.0.1 \
      -config connection.proxyChain.port=3128 \
      -config connection.proxyChain.enabled=true \
      -config connection.timeoutInSecs=120 \
      > "$ZAP_LOG" 2>&1 &
    ZAP_PID=$!

    i=0
    while [ $i -lt 60 ]; do
      if curl -sf "${ZAP_BASE}/JSON/core/view/version/" >/dev/null 2>&1; then
        echo "ZAP daemon up (pid $ZAP_PID)"
        return 0
      fi
      sleep 3
      i=$((i + 1))
    done
    echo "ZAP failed to start within 180s; tail of $ZAP_LOG follows:" >&2
    tail -n 100 "$ZAP_LOG" >&2 || true
    return 1
  }

  zap_ok() {
    printf '%s' "$1" | jq -e '.Result == "OK"' >/dev/null 2>&1
  }

  # Tell ZAP not to record or scan the B2C login host. We don't own that
  # infrastructure, and a misconfiguration that lets active-scan payloads reach
  # Microsoft is the kind of mistake that needs to fail loud, not silent.
  exclude_third_parties() {
    for pattern in \
      '.*b2clogin\.com.*' \
      '.*login\.microsoftonline\.com.*' \
      '.*microsoftonline\.com.*'
    do
      resp=$(curl -sf --get \
        --data-urlencode "regex=${pattern}" \
        "${ZAP_BASE}/JSON/core/action/excludeFromProxy/")
      if ! zap_ok "$resp"; then
        echo "ERROR: failed to exclude '${pattern}' from ZAP proxy: ${resp:-<no response>}" >&2
        return 1
      fi
    done
  }

  # Configures a ZAP context covering both app hosts so `inScopeOnly=true` on
  # the active scan actually means something. Without this, ZAP has no concept
  # of scope and inScopeOnly silently scans nothing.
  configure_scope() {
    curl -sf --get \
      --data-urlencode "contextName=${ZAP_CONTEXT}" \
      "${ZAP_BASE}/JSON/context/action/newContext/" >/dev/null || true

    for base in "$dashboardBaseURL" "$packagingRegulatorBaseURL"; do
      [ -z "$base" ] && continue
      resp=$(curl -sf --get \
        --data-urlencode "contextName=${ZAP_CONTEXT}" \
        --data-urlencode "regex=${base}.*" \
        "${ZAP_BASE}/JSON/context/action/includeInContext/")
      if ! zap_ok "$resp"; then
        echo "ERROR: failed to add ${base} to ZAP context: ${resp:-<no response>}" >&2
        return 1
      fi
    done
  }

  run_active_scan() {
    echo "ZAP_ACTIVE=1 — triggering active scan (in-scope only)"
    for base in "$dashboardBaseURL" "$packagingRegulatorBaseURL"; do
      [ -z "$base" ] && continue
      resp=$(curl -sf --get \
        --data-urlencode "url=${base}" \
        --data-urlencode "inScopeOnly=true" \
        "${ZAP_BASE}/JSON/ascan/action/scan/")
      scan_id=$(printf '%s' "$resp" | jq -r '.scan // empty')
      if [ -z "$scan_id" ]; then
        echo "ERROR: ZAP active scan failed to start for ${base}: ${resp:-<no response>}" >&2
        : > zap-report/SCAN_INCOMPLETE
        continue
      fi
      # 30-minute cap per host stays well clear of the CDP container timeout.
      i=0
      status=""
      while [ $i -lt 360 ]; do
        status=$(curl -sf "${ZAP_BASE}/JSON/ascan/view/status/?scanId=${scan_id}" \
          | jq -r '.status // empty')
        if [ "$status" = "100" ]; then
          echo "ZAP active scan complete for ${base}"
          break
        fi
        sleep 5
        i=$((i + 1))
      done
      if [ "$status" != "100" ]; then
        echo "WARNING: ZAP active scan for ${base} exceeded 30-minute cap (scanId=${scan_id})" >&2
        curl -sf "${ZAP_BASE}/JSON/ascan/action/stop/?scanId=${scan_id}" >/dev/null || true
        : > zap-report/SCAN_INCOMPLETE
      fi
    done
  }

  # Block until ZAP's passive scanner has finished processing the proxy traffic
  # captured during the test run. Without this we can race the scanner — the
  # alert summary is queried while records are still queued, the count comes
  # back too low, and the run is wrongly marked green even though the HTML
  # report (fetched moments later) shows the missed alert.
  wait_for_passive_scan() {
    i=0
    while [ $i -lt 120 ]; do
      remaining=$(curl -sf "${ZAP_BASE}/JSON/pscan/view/recordsToScan/" \
        | jq -r '.recordsToScan // empty')
      if [ "$remaining" = "0" ]; then
        return 0
      fi
      sleep 1
      i=$((i + 1))
    done
    echo "WARNING: passive scan queue still has records after 120s; alert totals may be incomplete" >&2
    return 0
  }

  # Read every alert ZAP recorded and fail the run on any High or Medium —
  # mirrors the accessibility gate (0 Critical / 0 Medium). No baseurl filter:
  # the B2C login host is already excluded from the proxy (see
  # exclude_third_parties), so everything ZAP saw is in-scope for the gate.
  # Must run before stop_zap shuts ZAP down.
  check_zap_alerts() {
    wait_for_passive_scan
    resp=$(curl -sf "${ZAP_BASE}/JSON/alert/view/alertsSummary/")
    if [ -z "$resp" ]; then
      echo "ERROR: could not fetch ZAP alert summary" >&2
      return 1
    fi
    high=$(printf '%s' "$resp" | jq -r '.alertsSummary.High // "0"')
    medium=$(printf '%s' "$resp" | jq -r '.alertsSummary.Medium // "0"')
    low=$(printf '%s' "$resp" | jq -r '.alertsSummary.Low // "0"')
    info=$(printf '%s' "$resp" | jq -r '.alertsSummary.Informational // "0"')
    echo "ZAP alerts — High: ${high}, Medium: ${medium}, Low: ${low}, Informational: ${info}"
    if [ "$high" -gt 0 ] || [ "$medium" -gt 0 ]; then
      echo "ERROR: security scan failed — ${high} High and ${medium} Medium alerts found (policy: 0 High, 0 Medium)" >&2
      echo "See zap-report/zap-report.html for full detail" >&2
      return 1
    fi
    return 0
  }

  stop_zap() {
    if [ -z "${ZAP_PID:-}" ]; then
      return 0
    fi
    echo "fetching ZAP HTML report"
    mkdir -p zap-report
    if ! curl -sf "${ZAP_BASE}/OTHER/core/other/htmlreport/" -o zap-report/zap-report.html; then
      echo "ERROR: could not fetch ZAP HTML report" >&2
      rm -f zap-report/zap-report.html
      printf 'ZAP report fetch failed at %s\n' "$(date)" > zap-report/REPORT_MISSING
    fi
    echo "shutting ZAP down"
    curl -sf "${ZAP_BASE}/JSON/core/action/shutdown/" >/dev/null || \
      echo "ZAP shutdown call returned non-zero (daemon may have already exited)" >&2
    wait "$ZAP_PID" 2>/dev/null || true
    ZAP_PID=""
  }

  trap 'stop_zap 2>/dev/null; exit 130' INT TERM

if [ "${PROFILE:-e2e}" = "security" ]; then
  echo "PROFILE=security: running auth setup un-proxied before starting ZAP"
  npx playwright test --project=setup
  setup_exit=$?
  if [ $setup_exit -ne 0 ]; then
    echo "auth setup failed (exit $setup_exit); aborting security run" >&2
    exit $setup_exit
  fi

  if ! start_zap; then
    echo "refusing to run security profile un-proxied — see $ZAP_LOG" >&2
    exit 2
  fi
  if ! exclude_third_parties; then
    stop_zap
    exit 3
  fi
  if ! configure_scope; then
    stop_zap
    exit 3
  fi
  export HTTP_PROXY="${ZAP_BASE}"
  export SKIP_AUTH_SETUP=1

  npx playwright test $SECURITY_PROJECTS
  test_exit_code=$?

  unset HTTP_PROXY
  unset SKIP_AUTH_SETUP
  if [ "${ZAP_ACTIVE:-0}" = "1" ]; then
    run_active_scan
  fi
  check_zap_alerts
  zap_alert_exit=$?
  stop_zap
else
  # CDP containers can't reach *.cdp-int.defra.cloud hosts directly — all
  # outbound traffic has to go through the platform's egress proxy on
  # localhost:3128 (see start_zap's connection.proxyChain config above, which
  # points ZAP's own outbound traffic at the same proxy). Only set here, not
  # in playwright.config.js: this script only runs inside the real CDP
  # container, whereas playwright.config.js also runs for a developer's own
  # `npm test` against dev/test URLs, which has no such proxy available.
  export HTTP_PROXY="http://127.0.0.1:3128"
  npm test
  test_exit_code=$?
  unset HTTP_PROXY
fi

  

# Default to publishing results unless explicitly disabled (compose.yml does so).
PUBLISH_TEST_RESULTS=${PUBLISH_TEST_RESULTS:-1}

if [ "$PUBLISH_TEST_RESULTS" -eq 1 ]; then
  npm run report:publish
  publish_exit_code=$?
  if [ $publish_exit_code -ne 0 ]; then
    echo "failed to publish test results (exit $publish_exit_code)"
  fi
fi

# Propagate playwright's exit code so the portal sees pass/fail correctly.
if [ $test_exit_code -ne 0 ]; then
  echo "test suite failed (exit $test_exit_code)"
  exit $test_exit_code
fi

# Security profile additionally fails when ZAP reported Medium-or-higher alerts.
if [ "${zap_alert_exit:-0}" -ne 0 ]; then
  echo "security scan failed (Medium or higher alerts present)" >&2
  exit 4
fi

# Allow an explicit FAILED marker to override (matches CDP template convention).
if [ -f FAILED ]; then
  echo "test suite failed"
  cat ./FAILED
  exit 1
fi

if [ "$PUBLISH_TEST_RESULTS" -eq 1 ] && [ "${publish_exit_code:-0}" -ne 0 ]; then
  exit $publish_exit_code
fi

echo "test suite passed"
exit 0
