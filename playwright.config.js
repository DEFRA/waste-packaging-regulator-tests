import dotenv from 'dotenv'
import { defineConfig, devices } from '@playwright/test'
import { isAccessibility, isSecurity } from './utils/profile.js'

const env = process.env.ENVIRONMENT || 'dev'
dotenv.config({ path: `.env.${env}` })

function resolveProxy() {
  if (process.env.HTTP_PROXY) return { server: process.env.HTTP_PROXY }
  if (isSecurity) return { server: 'http://127.0.0.1:8080' }
  return undefined
}

const proxy = resolveProxy()

const baseURL = process.env.baseURL ?? process.env.dashboardBaseURL
const packagingRegulatorBaseURL = process.env.packagingRegulatorBaseURL

const nationId = process.env.NATION_ID ?? 'EN'
const authFile = `playwright/.auth/nation${nationId}.json`

// entrypoint.sh sets this to 1 for the second Playwright invocation of the
// security profile — after auth.setup.js has already been run un-proxied. The
// browser projects then skip the setup dependency so credentials never traverse
// the ZAP proxy on the way to Azure B2C.
const SKIP_AUTH_SETUP = process.env.SKIP_AUTH_SETUP === '1'
const authSetupDeps = SKIP_AUTH_SETUP ? [] : ['setup']

export default defineConfig({
  globalSetup: './global-setup.js',
  globalTeardown: './global-teardown.js',
  testDir: '.',
  testMatch: ['test/specs/**/*.spec.js'],
  testIgnore: isAccessibility ? [] : ['test/specs/**/*.accessibility.spec.js'],
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
    packagingRegulatorBaseURL,
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
      testMatch: /.*\.setup\.js/,
      // Never proxy auth through ZAP: credentials must not traverse the
      // security scanner on the way to the B2C login host.
      use: { launchOptions: { proxy: undefined } }
    },
    {
      name: 'Regulator Dashboard Functional Tests',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile
      },
      dependencies: authSetupDeps
    }
  ]
})
