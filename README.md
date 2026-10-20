waste-packaging-regulator-tests

Playwright end-to-end test suite for the regulator certificates of compliance service (`waste-packaging-regulators-fe`). It covers functional, accessibility, security and cross-browser compatibility testing.

- [Local Development](#local-development)
  - [Requirements](#requirements)
  - [Setup](#setup)
- [Profiles](#profiles)
  - [Functional](#functional)
  - [Accessibility](#accessibility)
  - [Security](#security)
  - [Compatibility](#compatibility)
  - [Local](#local)
- [Cross-browser testing](#cross-browser-testing)
- [Analytics and the cookie banner](#analytics-and-the-cookie-banner)
- [Environment configuration](#environment-configuration)
- [Reporting](#reporting)
- [Running on GitHub](#running-on-github)
- [Security testing (OWASP ZAP)](#security-testing-owasp-zap)
- [Compatibility testing (BrowserStack)](#compatibility-testing-browserstack)
- [Production (CDP Portal)](#production-cdp-portal)
- [Requirements of CDP Environment Tests](#requirements-of-cdp-environment-tests)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Local Development

### Requirements

Install [Node.js](http://nodejs.org/) `>= v22.13.1` (see `.nvmrc`). The easiest way is the Node Version Manager [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm use
```

### Setup

Install dependencies and the Playwright browsers:

```bash
npm install
npx playwright install chromium chrome msedge
```

`chromium` is used by the auth `setup` project and local Chrome runs. `chrome` and `msedge` are the Google Chrome and Microsoft Edge channels used by the [browser projects](#cross-browser-testing). `npm run install:browsers` installs Chromium only.

## Profiles

The `PROFILE` environment variable selects which specs run. `utils/profile.js` rejects any other value.

| Profile         | Specs                                                           | What it does                                                                                                   |
| --------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `functional`    | Every spec in `test/specs/` except `csoc_journey.spec.js`       | Default. Functional assertions.                                                                                |
| `accessibility` | `csoc_journey.spec.js` only                                     | One test per screen; an axe-core scan runs after each test.                                                    |
| `security`      | `csoc_journey.spec.js` only                                     | Browser traffic goes through OWASP ZAP for passive (optionally active) scanning.                               |
| `compatibility` | Tests tagged `@compat` (a smoke subset of the functional specs) | Runs real interactions in each browser: on BrowserStack's real browsers, or on Chrome/Edge in the PR workflow. |

`csoc_journey.spec.js` visits every screen and state once (lists, search, detail, accept and cancel flows, validation errors). This gives the accessibility and security profiles full screen coverage without running the whole functional suite.

The compatibility smoke subset is the functional tests tagged `@compat` (`test('…', { tag: '@compat' }, …)`): list tabs, search and its validation, Clear search, pagination, a submitted and a not-submitted detail page, a status tag, choosing No on accept, the cancel reason validation and Change link, one CSV download, plus accepting and cancelling (mock data only; skipped on dev/test). To add a test to it, give it the `@compat` tag. The auth setup test is tagged `@auth-setup` so the tag filter keeps the login step.

### Functional

```bash
npm test             # every browser project, against ENVIRONMENT (default: dev)
npm run test:headed  # browser visible
npm run test:ui      # Playwright UI mode
```

### Accessibility

```bash
npm run test:accessibility
```

A test fails if axe-core finds a violation that isn't listed in `utils/accessibility-known-issues.js`. Known issues are still attached to the test result but don't fail it. Results are aggregated into `playwright-report/accessibility-assessment.html` and the Allure environment summary.

### Security

```bash
npm run test:security
```

See [Security testing (OWASP ZAP)](#security-testing-owasp-zap).

### Compatibility

```bash
npm run test:compatibility
```

See [Compatibility testing (BrowserStack)](#compatibility-testing-browserstack).

### Local

Runs against a locally running `waste-packaging-regulators-fe`. Check the frontend's startup output for its URL and set `dashboardBaseURL` in `.env.local` to match. Don't assume `https://localhost:3000`.

```bash
npm run test:local                # functional, headed
npm run test:local:accessibility  # accessibility, headed
npm run test:local:security       # security, headed (ZAP must be running)
npm run test:local:compatibility  # compatibility on BrowserStack, via the BrowserStack Local tunnel
npm run test:debug                # Playwright Inspector
```

Narrow any of these to one browser with `-- --project=<name>`, e.g. `npm run test:local -- --project=edge-windows`.

`.env.local`:

```
dashboardBaseURL=https://localhost:3000
MOCK_AUTH=true
MOCK_DATA=true

TEST_EMAIL_NATION_EN=your-email@example.com
TEST_PASSWORD_NATION_EN=your-password
```

`MOCK_AUTH` must match the frontend's own `MOCK_AUTH` setting:

- `true` on both: the `setup` project enters through `/signin-oidc`, which logs in a fixed mock user without a form.
- `false` on both: the `setup` project fills in the real Azure B2C sign-in form with `TEST_EMAIL_NATION_<ID>` / `TEST_PASSWORD_NATION_<ID>`.

If they differ, `setup` "passes" but saves a session that isn't logged in. Every test is then redirected to `/certificates-of-compliance/signin-oidc` and times out.

The `setup` project saves the session to `playwright/.auth/nation<ID>.<environment>.json` (e.g. `nationEN.local.json`, `nationEN.test.json`). The file name includes the environment so a real B2C session from `test` is never reused against the local mock frontend. The local config reuses its session for 30 minutes before logging in again; delete the file to force a fresh login.

## Cross-browser testing

Browser projects are defined in `playwright.config.js`, mirroring `waste-obligations-journey-tests`. They all share the session saved by the auth `setup` project.

| Project          | Browser                           | Script                        |
| ---------------- | --------------------------------- | ----------------------------- |
| `chrome-mac`     | Desktop Chrome (`chrome` channel) | `npm run test:chrome:mac`     |
| `chrome-windows` | Desktop Chrome (`chrome` channel) | `npm run test:chrome:windows` |
| `edge-windows`   | Desktop Edge (`msedge` channel)   | `npm run test:edge:windows`   |

`npm test` and `npm run test:matrix` run all three.

Local runs (`playwright.local.config.js`) use bundled Chromium instead of the `chrome` channel for the Chrome projects. The installed Google Chrome ran the accessibility scan much more slowly (about 45s against 2s per test). CDP and GitHub runs still use real Chrome.

Which projects each profile runs:

| Profile         | Local / `npm test`                     | CDP container (`entrypoint.sh`)        | GitHub PR workflow                       |
| --------------- | -------------------------------------- | -------------------------------------- | ---------------------------------------- |
| `functional`    | all three                              | `chrome-mac`                           | `project` input (default `edge-windows`) |
| `accessibility` | `chrome-mac`, `edge-windows`           | `chrome-mac`, `edge-windows`           | `edge-windows` (or the selected project) |
| `security`      | `chrome-mac`                           | `chrome-mac`                           | not run                                  |
| `compatibility` | BrowserStack: Windows 11 Chrome + Edge | BrowserStack: Windows 11 Chrome + Edge | `chrome-windows`, `edge-windows`         |

The per-profile limits live in `PROFILE_PROJECTS` in `playwright.config.js`:

- **Accessibility:** the scan is slow, so it runs on two browsers only.
- **Security:** ZAP sees the same HTTP traffic from any browser, so one is enough.
- **Functional:** it isn't in the allowlist, so the per-browser scripts keep working locally; `entrypoint.sh` limits it to `chrome-mac` in CDP.

Real cross-browser coverage comes from the `compatibility` profile on BrowserStack.

## Analytics and the cookie banner

The frontend loads Google Tag Manager and Google Analytics on every page; the IDs are defaults in its config, so they load in every environment. Two things in this suite handle that:

- **Analytics requests are blocked.** `test/fixtures.js` (and `auth/auth.setup.js`) abort every request to `googletagmanager.com` and `google-analytics.com`. With analytics allowed, a page took about 12–19s to finish loading in Google Chrome and about 1s in Edge, against 0.1–0.3s blocked. That caused click timeouts and slow accessibility scans. Blocking also keeps test traffic out of the real analytics data. No test asserts on analytics; a future analytics test can lift the block with `context.unroute(ANALYTICS_HOSTS)`.
- **The cookie banner is accepted once.** `auth/auth.setup.js` clicks "Accept analytics cookies" after login, so the `cookies_policy` cookie is saved with the session and no test sees the banner. The banner itself is therefore not covered by the accessibility scan.

## Environment configuration

Settings are loaded from `.env.<ENVIRONMENT>` (default `.env.dev`). Values already set in the shell take precedence.

| File          | Used when                                                     |
| ------------- | ------------------------------------------------------------- |
| `.env.dev`    | `ENVIRONMENT=dev` (default)                                   |
| `.env.test`   | `ENVIRONMENT=test`                                            |
| `.env.local`  | `npm run test:local*` (`playwright.local.config.js`)          |
| `.env.github` | `npm run test:github*` (docker-compose app in GitHub Actions) |

| Variable                                | Description                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| `ENVIRONMENT`                           | Which `.env.*` file is loaded (`dev`, `test`, `local`, `github`)                    |
| `PROFILE`                               | Which specs run; see [Profiles](#profiles)                                          |
| `dashboardBaseURL`                      | Application base URL                                                                |
| `NATION_ID`                             | Nation to authenticate as (`EN`, `SC`, `NI`, `WS`). Defaults to `EN`                |
| `TEST_EMAIL_NATION_<ID>`                | Login email for the nation (real B2C only)                                          |
| `TEST_PASSWORD_NATION_<ID>`             | Login password for the nation (real B2C only)                                       |
| `MOCK_AUTH`                             | `true` when the frontend runs with mock auth; must match the frontend               |
| `MOCK_DATA`                             | `true` when the frontend serves mock API data; some specs adjust their expectations |
| `BROWSERSTACK_USER`, `BROWSERSTACK_KEY` | BrowserStack Automate credentials (compatibility profile)                           |
| `ZAP_ACTIVE`                            | `1` to also run a ZAP active scan in the CDP container (security profile)           |

## Reporting

| Report                                            | Produced by                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| `playwright-report/index.html`                    | every run (`npx playwright show-report`)                            |
| `playwright-report/accessibility-assessment.html` | accessibility profile                                               |
| `zap-report/zap-report.html`                      | security profile                                                    |
| `allure-report/index.html`                        | `npm run report` (single-file Allure report from `allure-results/`) |

Traces and videos for each test are in `test-results/`. Open a trace with `npx playwright show-trace <path>/trace.zip`.

## Running on GitHub

GitHub Actions can't reach the CDP environments, so `.github/workflows/journey-tests.yml` builds `waste-packaging-regulators-fe` from source and runs it with docker compose (`compose.yml`) in mock mode (`MOCK_API`, `MOCK_AUTH`). It runs when triggered manually (**Run workflow**) or from another workflow. The `waste-packaging-regulators-fe` pull-request workflow calls it with `@main`, so changes here take effect on PR builds once merged.

Inputs:

| Input     | Default        | Description                                                                              |
| --------- | -------------- | ---------------------------------------------------------------------------------------- |
| `fe-ref`  | `main`         | `waste-packaging-regulators-fe` branch, tag or SHA to test                               |
| `project` | `edge-windows` | Browser project for the functional step (`chrome-mac`, `chrome-windows`, `edge-windows`) |

Steps:

1. **Journey tests** (`npm run test:github`): functional specs on the selected project.
2. **Accessibility tests** (`npm run test:github:accessibility`): on the selected project if the accessibility profile allows it, otherwise `chrome-mac`.
3. **Compatibility tests** (`npm run test:github:cross-browser`): the `@compat`-tagged tests on `chrome-windows` and `edge-windows`, using plain Playwright with the runner's Chrome and Edge. This doesn't use BrowserStack, so the browsers are the Linux builds, not real Windows.

Each step writes its own Playwright HTML report to `playwright-report/<step>/`. These reports include each test's trace and failure screenshot. After the tests, the workflow combines every step into one Allure report (`npm run report`). The `journey-test-results` artefact contains `playwright-report/` and `allure-report/index.html`; open either `index.html` directly in a browser.

To try it locally:

```bash
docker compose up --build --wait waste-packaging-regulators-fe   # needs ./waste-packaging-regulators-fe checked out
npm run test:github
```

## Security testing (OWASP ZAP)

Tests can be run with browser traffic proxied through [OWASP ZAP](https://www.zaproxy.org/) for passive (and optionally active) security scanning. The security profile runs `csoc_journey.spec.js` on `chrome-mac`.

### Running locally

Start the ZAP desktop app or daemon listening on `http://127.0.0.1:8080` first. Nothing checks that ZAP is up before the run starts, so if it isn't, the tests fail with proxy connection errors.

```bash
npm run test:security
```

This sets `PROFILE=security`, which:

- Routes browser traffic through ZAP on port `8080`. Locally this includes the auth `setup` project. Only the Docker/CDP flow below runs setup outside the proxy.
- After the run, waits for ZAP's passive scan queue to drain and saves `zap-report/zap-report.html` (`global-teardown.js`)

### Running in Docker / CDP

When the container runs with `PROFILE=security`, `entrypoint.sh` manages ZAP itself, so no external ZAP instance is needed. It:

- Starts the ZAP daemon bundled in the image, chained to CDP's egress proxy
- Excludes the B2C login hosts and the B2C styling storage account from the proxy
- Configures a scan scope covering `dashboardBaseURL`
- Runs the auth `setup` project **outside** the proxy, so credentials never pass through ZAP, then runs `chrome-mac` through it
- Optionally runs an active scan of `dashboardBaseURL` when `ZAP_ACTIVE=1` (passive only otherwise)
- Fails the run (exit code `4`) on any **High** or **Medium** alert
- Saves the report to `zap-report/zap-report.html` and shuts ZAP down

## Compatibility testing (BrowserStack)

The compatibility profile runs the `@compat`-tagged tests in **real browsers on BrowserStack Automate**. The browsers come from the `platforms` in `browserstack.yml`:

- Windows 11, Chrome (latest)
- Windows 11, Edge (latest)

`playwright.compatibility.config.js`:

- Sets no Playwright projects of its own: the SDK builds one project per platform from `browserstack.yml`, including that platform's auth setup project (`playwrightConfigOptions.setup`). The saved login file is set on the top-level `use`, so no local browser channel or device user agent is applied on top of the real browser.
- Sets up the outbound proxy the SDK needs to reach BrowserStack from behind CDP's network.

To add a browser, add a platform to `browserstack.yml`; don't add Playwright projects.

**Prerequisites:** set `BROWSERSTACK_USER` and `BROWSERSTACK_KEY` (the Username and Access Key from BrowserStack's Account Settings).

| Command                            | Where                                                            |
| ---------------------------------- | ---------------------------------------------------------------- |
| `npm run test:compatibility`       | CDP Portal: `entrypoint.sh` runs it when `PROFILE=compatibility` |
| `npm run test:local:compatibility` | Your machine, against a locally running frontend                 |

`browserstack.yml` sets `browserstackLocal: true`, so the SDK opens a BrowserStack Local tunnel automatically. That lets BrowserStack's browsers reach hosts that aren't publicly routable: CDP's `*.cdp-int.defra.cloud` environments or your local frontend. You can watch runs live on the [BrowserStack Automate dashboard](https://automate.browserstack.com/). Playwright video and trace recording aren't supported on BrowserStack's remote browsers; the session video is on the dashboard instead.

`entrypoint.sh` runs `npm run test:compatibility` instead of `npm test` because the SDK has to wrap the `playwright test` command itself.

The GitHub PR workflow doesn't use BrowserStack; see [Running on GitHub](#running-on-github).

## Production (CDP Portal)

Tests run from the CDP Portal under **Test Suites**. Merging to `main` builds a new Docker image (`.github/workflows/publish.yml`); check its progress under this repository's Actions tab. Changes only reach the Portal once that image is built.

The image installs `chromium`, `chrome`, `msedge` and OWASP ZAP. `entrypoint.sh` runs the profile set by `PROFILE` (default `functional`):

| `PROFILE`       | Runs                                                 |
| --------------- | ---------------------------------------------------- |
| `functional`    | `npm test -- --project=chrome-mac`                   |
| `accessibility` | `npm test` (`chrome-mac` and `edge-windows`)         |
| `security`      | auth setup un-proxied, then `chrome-mac` through ZAP |
| `compatibility` | `npm run test:compatibility` on BrowserStack         |

Results are published to S3 (`bin/publish-tests.sh`) and shown in the Portal. The container exits non-zero if tests fail, ZAP finds High/Medium alerts, or a `FAILED` marker file exists.

## Requirements of CDP Environment Tests

1. The service builds as a Docker container using `.github/workflows/publish.yml`. The workflow tags the image so the CDP Portal knows how to run it on the platform, and publishes it to the correct repository.
2. The Dockerfile's entrypoint script returns exit code `0` if the test suite passes, or non-zero if it fails.
3. Test reports are published to S3 using `./bin/publish-tests.sh`.

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government licence v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
