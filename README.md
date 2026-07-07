waste-packaging-regulator-tests

The template to create a service that runs WDIO tests against an environment.

- [Local](#local)
  - [Requirements](#requirements)
    - [Node.js](#nodejs)
  - [Setup](#setup)
  - [Running local tests](#running-local-tests)
  - [Debugging local tests](#debugging-local-tests)
- [Production](#production)
  - [Debugging tests](#debugging-tests)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Local Development

### Requirements

#### Node.js

Please install [Node.js](http://nodejs.org/) `>= v20` and [npm](https://nodejs.org/) `>= v9`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
nvm use
```

### Setup

Install application dependencies:

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

**Prerequisites:** Start ZAP (desktop or daemon) and ensure it is listening on `http://127.0.0.1:8080`.

```bash
npm run test:security
```

This will:

- Route all browser traffic through ZAP on port `8080`
- Bypass ZAP for Azure B2C auth domains to prevent MITM issues
- Save an HTML report to `zap-report/zap-report.html`

### Local

Prerequisite : run waste-packaging-regulators-fe locally as npm

Runs tests against a locally running instance of the application (`https://localhost:3000`).

```bash
npm run test:local # to run functional against local instance
npm run test:local:accessibility # to run accessiblity against local instance
npm run test:local:security # to run security against local instance
```

The local config reads from `.env.local`. Create this file if it does not exist:

```
ENVIRONMENT=local
packagingRegulatorBaseURL=https://localhost:3000/certificates-of-compliance

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
| `dashboardBaseURL`          | Dashboard home URL                                                    |
| `packagingRegulatorBaseURL` | Certificates of compliance page URL                                   |
| `NATION_ID`                 | Nation to authenticate as (`EN`, `SC`, `NI`, `WS`). Defaults to `EN`. |
| `TEST_EMAIL_NATION_<ID>`    | Login email for the given nation                                      |
| `TEST_PASSWORD_NATION_<ID>` | Login password for the given nation                                   |

## Reporting

Generate an Allure report after a test run:

```bash
npm run report
```

## Production

### Running the tests

Tests are run from the CDP-Portal under the Test Suites section. Before any changes can be run, a new docker image must be built, this will happen automatically when a pull request is merged into the `main` branch.
You can check the progress of the build under the actions section of this repository. Builds typically take around 1-2 minutes.

The results of the test run are made available in the portal.

## Requirements of CDP Environment Tests

1. Your service builds as a docker container using the `.github/workflows/publish.yml`
   The workflow tags the docker images allowing the CDP Portal to identify how the container should be run on the platform.
   It also ensures its published to the correct docker repository.

2. The Dockerfile's entrypoint script should return exit code of 0 if the test suite passes or 1/>0 if it fails

3. Test reports should be published to S3 using the script in `./bin/publish-tests.sh`

## Running on GitHub

Alternatively you can run the test suite as a GitHub workflow.
Test runs on GitHub are not able to connect to the CDP Test environments. Instead, they run the tests agains a version of the services running in docker.
A docker compose `compose.yml` is included as a starting point, which includes the databases (mongodb, redis) and infrastructure (localstack) pre-setup.

Steps:

1. Edit the compose.yml to include your services.
2. Modify the scripts in docker/scripts to pre-populate the database, if required and create any localstack resources.
3. Test the setup locally with `docker compose up` and `npm run test:github`
4. Set up the workflow trigger in `.github/workflows/journey-tests`.

By default, the provided workflow will run when triggered manually from GitHub or when triggered by another workflow.

If you want to use the repository exclusively for running docker composed based test suites consider displaying the publish.yml workflow.

## Security testing (OWASP ZAP)

Tests can be run with traffic proxied through [OWASP ZAP](https://www.zaproxy.org/) for passive (and optionally active) security scanning.

### Running locally

Start the ZAP desktop application or daemon and ensure it is listening on `http://127.0.0.1:8080`, then:

```bash
npm run test:security
```

This sets `PROFILE=security`, which:

- Verifies ZAP is reachable before any tests run (exits with an error if not)
- Routes browser traffic through the ZAP proxy on port `8080` — the auth `setup` project is exempt, so login credentials never traverse the proxy on the way to the B2C login host
- Waits for ZAP's passive scan queue to drain after tests finish
- Saves an HTML report to `zap-report/zap-report.html`

### Running in Docker / CDP

When the container is run with `PROFILE=security`, `entrypoint.sh` manages ZAP's full lifecycle itself — no external ZAP instance is required:

- Starts the ZAP daemon bundled in the image
- Excludes the B2C login host from the proxy
- Configures a scan scope covering `dashboardBaseURL` and `packagingRegulatorBaseURL`
- Runs the test suite proxied through ZAP
- Optionally triggers an active scan of both hosts when `ZAP_ACTIVE=1` is set (passive-only otherwise)
- Fails the run (exit code `4`) if any **High** or **Medium** severity alerts are found, mirroring the accessibility gate
- Publishes the HTML report to `zap-report/zap-report.html` and shuts ZAP down

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
