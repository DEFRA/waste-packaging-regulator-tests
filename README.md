# waste-packaging-regulator-tests

Playwright end-to-end test suite for the Waste Packaging Regulator Dashboard.

- [Requirements](#requirements)
- [Setup](#setup)
- [Profiles](#profiles)
- [Running tests](#running-tests)
  - [Functional](#functional)
  - [Accessibility](#accessibility)
  - [Security](#security)
  - [Local](#local)
- [Environment configuration](#environment-configuration)
- [Reporting](#reporting)
- [Production](#production)
- [Licence](#licence)

## Requirements

[Node.js](http://nodejs.org/) `>= v22.13.1` and [npm](https://nodejs.org/) `>= v9`.

Use [nvm](https://github.com/creationix/nvm) to switch to the correct version:

```bash
nvm use
```

## Setup

```bash
npm install
npm run install:browsers
```

## Profiles

The `PROFILE` environment variable controls which test suite runs. Valid values:

| Profile         | Description                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| `functional`    | Default. Runs all functional specs.                                         |
| `accessibility` | Runs functional specs plus accessibility specs (`*.accessibility.spec.js`). |
| `security`      | Proxies traffic through OWASP ZAP for passive security scanning.            |

## Running tests

### Functional

Runs all functional tests against the configured environment (default: `dev`).

```bash
npm test
```

Headed (browser visible):

```bash
npm run test:headed
```

### Accessibility

Runs functional tests plus accessibility specs using axe-core.

```bash
npm run test:accessibility
```

### Security

Runs tests with traffic proxied through [OWASP ZAP](https://www.zaproxy.org/) for passive scanning.

**Prerequisites:** Start ZAP (desktop or daemon) and ensure it is listening on `http://127.0.0.1:8090`.

```bash
npm run test:security
```

This will:

- Route all browser traffic through ZAP on port `8090`
- Bypass ZAP for Azure B2C auth domains to prevent MITM issues
- Save an HTML report to `zap-report/zap-report.html`

### Local

Prerequisite : run waste-packaging-regulators-fe locally as npm

Runs tests against a locally running instance of the application (`https://localhost:3000`).

```bash
npm run test:local # to run functional against local instance
npm run test:local:accessibility # to run accessiblity against local instance
```

The local config reads from `.env.local`. Create this file if it does not exist:

```
ENVIRONMENT=local
baseURL=https://localhost:3000/certificates-of-compliance
baseURLCompliance=https://localhost:3000/certificates-of-compliance

TEST_EMAIL_NATION_EN=your-email@example.com
TEST_PASSWORD_NATION_EN=your-password
```

## Environment configuration

Environment-specific settings are loaded from `.env.<ENVIRONMENT>` (default: `.env.dev`). The local config
loads `.env.local` with override, so local values always take precedence.

| File         | Used when                           |
| ------------ | ----------------------------------- |
| `.env.dev`   | `ENVIRONMENT=dev` (default)         |
| `.env.local` | Local runs via `npm run test:local` |

Key variables:

| Variable                    | Description                                                           |
| --------------------------- | --------------------------------------------------------------------- |
| `ENVIRONMENT`               | Controls which `.env.*` file is loaded (`dev`, `local`, etc.)         |
| `baseURL`                   | Dashboard home URL                                                    |
| `baseURLCompliance`         | Certificates of compliance page URL                                   |
| `NATION_ID`                 | Nation to authenticate as (`EN`, `SC`, `NI`, `WS`). Defaults to `EN`. |
| `TEST_EMAIL_NATION_<ID>`    | Login email for the given nation                                      |
| `TEST_PASSWORD_NATION_<ID>` | Login password for the given nation                                   |

## Reporting

Generate an Allure report after a test run:

```bash
npm run report
```

## Production

Tests run from the CDP Portal under **Test Suites**. A new Docker image is built automatically when a PR is merged into `main`. The Dockerfile entrypoint must exit `0` on pass or `1` on failure. Results are published to S3 via `./bin/publish-tests.sh`.

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

> Contains public sector information licensed under the Open Government licence v3
