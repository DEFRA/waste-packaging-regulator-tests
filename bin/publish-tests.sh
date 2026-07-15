#!/bin/sh
set -eu

# Publishes test artifacts to S3. The CDP Portal's report viewer renders the
# index.html at the run's S3 root, so a profile-aware landing page is
# generated there with links to whichever reports the profile produced.
#
# Layout:
#   $RESULTS_OUTPUT_S3_PATH/index.html              — landing page (links to reports)
#   $RESULTS_OUTPUT_S3_PATH/allure-report/          — Allure (run summary)
#   $RESULTS_OUTPUT_S3_PATH/accessibility-report/   — WCAG findings (accessibility profile)
#   $RESULTS_OUTPUT_S3_PATH/security-report/        — ZAP HTML + daemon log (security profile)

ALLURE_DIR="$PWD/allure-report"
ACCESSIBILITY_REPORT="$PWD/playwright-report/accessibility-assessment.html"
SECURITY_REPORT="$PWD/zap-report/zap-report.html"
ZAP_LOG="/tmp/zap-${RUN_ID:-local}.log"
PROFILE_VAL="${PROFILE:-functional}"

echo "Publishing test results to S3 (profile: $PROFILE_VAL)"

if [ -z "${RESULTS_OUTPUT_S3_PATH:-}" ]; then
   echo "RESULTS_OUTPUT_S3_PATH is not set" >&2
   exit 1
fi

if [ ! -d "$ALLURE_DIR" ]; then
   echo "$ALLURE_DIR is not found" >&2
   exit 1
fi

aws s3 cp --quiet "$ALLURE_DIR" "$RESULTS_OUTPUT_S3_PATH/allure-report" --recursive
echo "Allure report published to $RESULTS_OUTPUT_S3_PATH/allure-report/"

case "$PROFILE_VAL" in
   accessibility)
      if [ -f "$ACCESSIBILITY_REPORT" ]; then
         aws s3 cp --quiet "$ACCESSIBILITY_REPORT" "$RESULTS_OUTPUT_S3_PATH/accessibility-report/index.html"
         echo "Accessibility report published to $RESULTS_OUTPUT_S3_PATH/accessibility-report/"
      else
         echo "Accessibility report missing at $ACCESSIBILITY_REPORT" >&2
         exit 1
      fi
      ;;
   security)
      if [ -f "$SECURITY_REPORT" ]; then
         aws s3 cp --quiet "$SECURITY_REPORT" "$RESULTS_OUTPUT_S3_PATH/security-report/index.html"
         echo "Security report published to $RESULTS_OUTPUT_S3_PATH/security-report/"
      else
         echo "Security report missing at $SECURITY_REPORT" >&2
      fi
      if [ -f "$ZAP_LOG" ]; then
         aws s3 cp --quiet "$ZAP_LOG" "$RESULTS_OUTPUT_S3_PATH/security-report/zap-daemon.log"
      fi
      ;;
esac

PROFILE="$PROFILE_VAL" node ./bin/generate-portal-index.js
aws s3 cp --quiet ./index.html "$RESULTS_OUTPUT_S3_PATH/index.html"
echo "Portal landing page published to $RESULTS_OUTPUT_S3_PATH/index.html"
