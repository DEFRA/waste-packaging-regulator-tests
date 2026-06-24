import dotenv from 'dotenv'
import { defineConfig, devices } from '@playwright/test'
import { isAccessibility, isSecurity } from './utils/profile.js'
import process from '~/.eslintrc.cjs'

const env = process.env.ENVIRONMENT || 'dev'
dotenv.config({ path: `.env.${env}` })

// entrypoint.sh sets this to 1 after auth has already run un-proxied,
// so the second playwright invocation skips auth and goes straight to tests.
const SKIP_AUTH_SETUP = process.env.SKIP_AUTH_SETUP === '1'

const proxy = isSecurity
  ? {
      server: 'http://127.0.0.1:8090',
      // Bypass ZAP for Azure B2C auth domains — ZAP MITM breaks the redirect flow.
      bypass: 'b2clogin.com, login.microsoftonline.com, microsoftonline.com'
    }
  : process.env.HTTP_PROXY
    ? { server: process.env.HTTP_PROXY }
    : undefined

const baseURLCompliance = process.env.baseURLCompliance

const nationId = process.env.NATION_ID ?? 'EN'
const authFile = `playwright/.auth/nation${nationId}.json`

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
    baseURLCompliance,
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
    {
      name: 'Regulator Dashboard Functional Tests',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile
      },
      dependencies: SKIP_AUTH_SETUP ? [] : ['setup']
    }
  ]
})
