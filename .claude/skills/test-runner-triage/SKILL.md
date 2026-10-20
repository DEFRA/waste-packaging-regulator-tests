---
name: test-runner-triage
description: Use this skill when the user wants to run this repo's Playwright suite or a single spec/test — locally against the mock frontend, against a deployed environment (dev / test, "test env"), or for a profile (functional, accessibility, security/ZAP, compatibility/BrowserStack) — or wants failures, skips, slowness, accessibility violations or ZAP alerts explained. Triggers on "run the tests", "run X.spec.js against test env", "run full functional suite", "run against test and local", "why are tests skipped", "why did it fail", "why is it taking so long", "run accessibility tests", "run a security scan", "generate the allure report".
---

# Test runner & triage

Run the right command for the target, then turn the output into a short
summary: totals, a per-spec table, skip reasons grouped by cause, and a reason
for every failure. Don't paste raw logs.

## 1. Pick the target

| Target                                                                | Base command                                                                                         |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Local mock frontend (`waste-packaging-regulators-fe` running locally) | `npx cross-env ENVIRONMENT=local MOCK_AUTH=true playwright test --config=playwright.local.config.js` |
| Deployed `test` / `dev` (CDP)                                         | `env -u PROFILE -u MOCK_AUTH -u MOCK_DATA ENVIRONMENT=test npx playwright test --workers=1`          |
| GitHub-style run (docker-compose app)                                 | `npm run test:github` (sets `ENVIRONMENT=github`, mock auth/data)                                    |

Then add a spec path, `-g "<test title>"`, and `--project=<name>`:

- **Default project:** `chrome-mac` for single-browser runs; that's what CDP uses for functional and security. The projects are `chrome-mac`, `chrome-windows` and `edge-windows`. The PR workflow defaults to `edge-windows`.
- **"Full functional suite":** run with no spec path, on `chrome-mac`, with `PROFILE` unset.
- **"Against test env and local":** start the `test` run in the background and the local run in the foreground (local takes about 1.3 min; `test` takes about 7–12 min).

### Before running

- **Local:** check the frontend is up with `curl -sk -o /dev/null -w '%{http_code}' https://localhost:3000/signin-oidc` (expect `302`). If it isn't, ask the user to start it. Don't guess another port without telling them.
- **dev / test:** check the environment is reachable with `curl` to the `dashboardBaseURL` in `.env.<env>`. A connection failure usually means the VPN is off.
- **dev / test login:** it needs `TEST_PASSWORD_NATION_<ID>`. `.env.test` / `.env.dev` are **tracked in git**, so never add the password to them yourself. If it's empty, ask the user to pass it in the shell: `! TEST_PASSWORD_NATION_EN='…' ENVIRONMENT=test npx playwright test …`. If they put it in `.env.test` anyway, remind them to run `git checkout .env.test` before committing. Never print the value.
- **Before running against dev / test:** run the `shared-env-safety-check` skill (`node .claude/skills/shared-env-safety-check/scripts/check_guards.cjs <specs>`). If it exits 1 (`UNSAFE`), don't run against the shared environment. The accept and cancel specs really accept and cancel certificates, so every `selectYes()` / `confirmAndSend()` must be skipped outside local/github.

### Gotchas (all hit in practice)

- **Lowercase environment names:** use `ENVIRONMENT=test`, not `TEST`. The config loads `.env.${ENVIRONMENT}`, and Linux (CDP) is case-sensitive.
- **Unset `PROFILE`, `MOCK_AUTH` and `MOCK_DATA` for deployed environments:** if they're left over in the shell, a real environment can be treated as the mock. An empty-string `PROFILE` throws "Invalid PROFILE".
- **`MOCK_AUTH` must match the frontend's own setting.** If they differ, the login step "passes" but saves a session that isn't logged in, and every test then redirects to `/certificates-of-compliance/signin-oidc` and times out.
- **Login files are per environment:** `playwright/.auth/nation<ID>.<env>.json`. The local config reuses its file for 30 minutes; delete it to force a fresh login.
- **Use `--workers=1` against deployed environments.** The default (5 local workers, each running installed Chrome with video) overloads the Mac and makes every test 20–30s.
- **`--reporter=json` output gets mixed with dotenv's log lines.** Write the report to a file instead: `PLAYWRIGHT_JSON_OUTPUT_NAME=<scratchpad>/x.json … --reporter=json >/dev/null 2>&1`.
- **Retries:** they only happen when `CI` is set, so a local run has none.

## 2. Profiles

`PROFILE` = `functional` (the default when unset), `accessibility`, `security` or `compatibility`. Accessibility and security run **only** `test/specs/csoc_journey.spec.js` (one test per screen). Compatibility runs the functional tests tagged `@compat` (a smoke subset; the login test is tagged `@auth-setup` so the filter keeps it). Functional runs every spec except `csoc_journey.spec.js`.

| User wants                                    | Command                                                                                                                                                                                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Accessibility (axe after each test)           | `npm run test:accessibility` / `npm run test:local:accessibility` (`chrome-mac`, `edge-windows`)                                                                                                                                                       |
| Security (ZAP passive scan)                   | Start ZAP on `127.0.0.1:8080` first; check with `curl -sf http://127.0.0.1:8080/JSON/core/view/version/`. Then `npm run test:security` (`chrome-mac`). Nothing checks ZAP is up before the run, so if it's down the tests just fail with proxy errors. |
| Compatibility (real browsers on BrowserStack) | `npm run test:local:compatibility` / `npm run test:compatibility`; needs `BROWSERSTACK_USER` / `BROWSERSTACK_KEY`. Platforms come from `browserstack.yml` (Windows 11 Chrome and Edge).                                                                |
| PR-style cross-browser (no BrowserStack)      | `npm run test:github:cross-browser` (`chrome-windows`, `edge-windows`)                                                                                                                                                                                 |

## 3. Summarise

With a JSON report:

```bash
python3 .claude/skills/test-runner-triage/scripts/summarize.py <report.json> [--tests]
```

It prints totals excluding the login step, a per-spec passed/failed/flaky/skipped table, skip reasons with counts, and the first error line of every failure. Use `--tests` for a per-test list. Without JSON, use the list reporter's `N passed / N failed / N skipped` lines and the ✘ blocks.

Present it as:

1. **One line:** passed / failed / flaky / skipped, duration, target and project.
2. **The per-spec table.**
3. **Skips, sorted into three kinds:**
   - **By design:**
     - "Accepts a submission… / Cancels a submission in shared dev/test data": only runs on mock data.
     - "Requires stateful backend": the mock doesn't save accept or cancel changes.
     - "Error page previews are only registered when running locally"
     - "regulators-waste-proxy returns an empty 404…"
     - "only reliable against local / github mocked data"
   - **Missing data:** "No … in this environment", "currently has 0 record(s)". **Don't take these at face value.** See section 4.
   - **Out-of-date conditions:** for example a skip on a URL substring that no environment has.
4. **Each failure:** what it was waiting for, and why (section 4).
5. **Accessibility profile:** violation counts by impact from `allure-results/environment.properties`, and the report at `playwright-report/accessibility-assessment.html`.
6. **Security profile:** the ZAP report at `zap-report/zap-report.html`. In the container, `entrypoint.sh` fails the run (exit 4) on any High or Medium alert, and a root `FAILED` marker also fails it, so read that file if it's there and don't delete it.

## 4. Diagnose failures, skips and slowness

For any failed or suspicious test, read its trace (the folder is under `test-results/<output>/`):

```bash
python3 .claude/skills/test-runner-triage/scripts/trace_breakdown.py test-results/<output>/<test-folder>
```

It prints slow steps with errors, page and sign-in requests in order (status `-1` means the server never answered), the slowest requests, and how many analytics requests there were.

How to read it:

- **A "no data" skip, while the same group has other passing tests:** it's almost always a timing bug, not missing data. Look for an immediate read straight after a click or navigation: `isVisible()`, `count()`, `allTextContents()`, `textContent()`, or a `waitForURL(/\/certificates-of-compliance/)` that also matches the list URL. The fix is to wait first, with `waitForListParams` or a wait for `DETAIL_URL`, then decide from the tab's "(N)" count. Check the data is really missing by looking at the page snapshot or the screenshot.
- **A timeout where the last request has status `-1`:** the environment was slow and didn't answer. Re-run the test (`--repeat-each=3`); if it passes, report it as a one-off from the environment.
- **A `/signin-oidc` → `b2clogin` round trip during the test:** that's normal against real B2C, because the session cookie lasts only 30s.
- **Every page takes about 12–15s in installed Chrome:** that's analytics. `test/fixtures.js` blocks `googletagmanager.com` and `google-analytics.com`, and in the trace those requests should show `ERR_FAILED`.
- **The accessibility scan is slow:** look at the `Evaluate` time inside `Fixture "page"`. Installed Chrome and Edge run axe much more slowly than bundled Chromium, which is why local runs use bundled Chromium.
- **`ERR_TOO_MANY_REDIRECTS` on local:** a session from another environment was reused. Delete `playwright/.auth/nation*.json`.
- **The whole run is slow:** check `uptime` and the worker count (`Running N tests using N workers`).

When you change a test or page object to fix one of these, re-run that spec against both `test` and local before reporting it fixed.

## 5. Reports

| Report          | Where                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Playwright HTML | `playwright-report/index.html` (`npx playwright show-report`)                                                                                                                   |
| Accessibility   | `playwright-report/accessibility-assessment.html`                                                                                                                               |
| ZAP             | `zap-report/zap-report.html`                                                                                                                                                    |
| Allure          | `npm run report` → `allure-report/index.html` (single file). Run `npm run clean` first: `allure-results/` builds up across runs, and the local single-file report reached 2 GB. |
| Trace           | `npx playwright show-trace <folder>/trace.zip`                                                                                                                                  |
