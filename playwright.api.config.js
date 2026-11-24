import dotenv from 'dotenv'
import { defineConfig } from '@playwright/test'

const env = process.env.ENVIRONMENT || 'dev'
dotenv.config({ path: `.env.${env}` })

// API tests call waste-regulator-case-management directly — no browser, no
// B2C sign-in — so they run from their own config instead of joining the
// browser project matrix in playwright.config.js. The URLs match the Bruno
// collection's environments in waste-regulator-case-management/bruno.
const CASE_MANAGEMENT_BASE_URLS = {
  local: 'http://localhost:8085',
  dev: 'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/waste-regulator-case-management'
}

const baseURL =
  process.env.caseManagementBaseURL ?? CASE_MANAGEMENT_BASE_URLS[env]

if (!baseURL) {
  throw new Error(
    `No case management URL for ENVIRONMENT "${env}". Set caseManagementBaseURL in .env.${env}.`
  )
}

export default defineConfig({
  testDir: './test/api',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report/api' }],
    ['allure-playwright', { resultsDir: 'allure-results' }]
  ],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { accept: 'application/json' }
  },
  projects: [{ name: 'api' }]
})
