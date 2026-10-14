import dotenv from 'dotenv'
import { defineConfig, devices } from '@playwright/test'
import {
  isAccessibility,
  isSecurity,
  isCompatibility,
  profile
} from './utils/profile.js'

const env = process.env.ENVIRONMENT || 'dev'
dotenv.config({ path: `.env.${env}` })

function resolveProxy() {
  if (process.env.HTTP_PROXY) return { server: process.env.HTTP_PROXY }
  if (isSecurity) return { server: 'http://127.0.0.1:8080' }
  return undefined
}

const proxy = resolveProxy()

const baseURL = process.env.baseURL ?? process.env.dashboardBaseURL

const nationId = process.env.NATION_ID ?? 'EN'
const authFile = `playwright/.auth/nation${nationId}.json`

// entrypoint.sh sets this to 1 for the second Playwright invocation of the
// security profile — after auth.setup.js has already been run un-proxied. The
// browser projects then skip the setup dependency so credentials never traverse
// the ZAP proxy on the way to Azure B2C.
const SKIP_AUTH_SETUP = process.env.SKIP_AUTH_SETUP === '1'
const authSetupDeps = SKIP_AUTH_SETUP ? [] : ['setup']

// csoc_journey.spec.js is a dedicated, one-test-per-screen file: accessibility
// (the axe-core scan fixtures.js runs after each test), security (ZAP
// passive-scan coverage of every screen, not just whichever ones the
// functional specs happen to end on), and compatibility (the same per-screen
// coverage across the BrowserStack browser/OS matrix) each run it
// exclusively. Functional is the only profile that excludes it outright.
const CSOC_JOURNEY_SPEC = 'test/specs/csoc_journey.spec.js'
const journeyOnlyProfile = isAccessibility || isSecurity || isCompatibility

// Per-profile project allowlist. Accessibility runs desktop Chrome and Edge —
// the scan is slow, so the rest of the matrix is left out to save budget.
// Security runs one browser: ZAP sees the same HTTP traffic from any of them.
// Compatibility here is the plain-Playwright run (PR build, Linux Chrome and
// Edge); the BrowserStack run replaces the projects entirely in
// playwright.compatibility.config.js. Profiles not in this map keep the full
// browser matrix.
const PROFILE_PROJECTS = {
  accessibility: ['setup', 'chrome-mac', 'edge-windows'],
  security: ['setup', 'chrome-mac'],
  compatibility: ['setup', 'chrome-windows', 'edge-windows']
}
const projectAllowed = (name) =>
  !PROFILE_PROJECTS[profile] || PROFILE_PROJECTS[profile].includes(name)

// Every browser project shares the setup project's storage state. Exported so
// playwright.local.config.js can reuse the same matrix.
export const browserProjects = (storageState, dependencies) => [
  {
    name: 'chrome-mac',
    use: { ...devices['Desktop Chrome'], channel: 'chrome', storageState },
    dependencies
  },
  {
    name: 'chrome-windows',
    use: { ...devices['Desktop Chrome'], channel: 'chrome', storageState },
    dependencies
  },
  {
    name: 'edge-windows',
    use: { ...devices['Desktop Edge'], channel: 'msedge', storageState },
    dependencies
  }
]

export default defineConfig({
  globalTeardown: './global-teardown.js',
  testDir: '.',
  testMatch: journeyOnlyProfile
    ? [CSOC_JOURNEY_SPEC]
    : ['test/specs/**/*.spec.js'],
  testIgnore: journeyOnlyProfile ? [] : [CSOC_JOURNEY_SPEC],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['allure-playwright', { resultsDir: 'allure-results' }],
    ['./utils/accessibility-reporter.js']
  ],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    trace: 'on',
    screenshot: 'only-on-failure',
    video: 'on',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      proxy
    }
  },
  projects: [
    {
      name: 'setup',
      testDir: './auth',
      testMatch: /.*\.setup\.js/
    },
    ...browserProjects(authFile, authSetupDeps)
  ].filter((project) => projectAllowed(project.name))
})
