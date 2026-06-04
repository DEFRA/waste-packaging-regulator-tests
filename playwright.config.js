import dotenv from 'dotenv'
import { defineConfig, devices } from '@playwright/test'

const env = process.env.ENVIRONMENT || 'dev'
dotenv.config({ path: `.env.${env}` })

const baseURL = process.env.baseURL

const nationId = process.env.NATION_ID ?? 'EN'
const authFile = `playwright/.auth/nation${nationId}.json`

const launchOptions = {
  headless: process.env.HEADLESS === 'false',
  slowMo: 50,
  trace: 'retain-on-failure'
}

export default defineConfig({
  testDir: '.',
  testMatch: ['test/specs/**/*.spec.js'],
  testIgnore: process.env.RUN_ACCESSIBILITY
    ? []
    : ['test/specs/**/*.accessibility.spec.js'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }], ['allure-playwright', { resultsDir: 'allure-results' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    viewport: { width: 1280, height: 720 }
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
        launchOptions,
        storageState: authFile
      },
      dependencies: ['setup']
    }
  ]
})
