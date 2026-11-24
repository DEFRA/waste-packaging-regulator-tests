import dotenv from 'dotenv'
import { defineConfig } from '@playwright/test'

const env = process.env.ENVIRONMENT || 'dev'
dotenv.config({ path: `.env.${env}` })

// API tests call the backend services directly — no browser, no B2C sign-in —
// so they run from their own config instead of joining the browser project
// matrix in playwright.config.js. Each service is its own project with its own
// baseURL.
//
// waste-regulator-case-management: URLs match the Bruno collection's
// environments in waste-regulator-case-management/bruno.
const CASE_MANAGEMENT_BASE_URLS = {
  local: 'http://localhost:8085',
  dev: 'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/waste-regulator-case-management'
}

// waste-obligations: URLs match the Waste-Obligations.API Postman collection
// (https://ephemeral-protected.api.{{env}}.cdp-int.defra.cloud/waste-obligations).
// Locally the service listens on 8080 (its compose.yml and launch profile).
const WASTE_OBLIGATIONS_BASE_URLS = {
  local: 'http://localhost:8080',
  dev: 'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/waste-obligations',
  test: 'https://ephemeral-protected.api.test.cdp-int.defra.cloud/waste-obligations'
}

// Specs request relative paths such as 'cases'. new URL('cases', base) drops
// the last path segment unless base ends in '/', so a base like
// .../waste-obligations must keep its trailing slash.
// The .env files list variables with blank values, so a blank URL means "not
// set" and falls back to the default instead of dropping the project.
const envValue = (name) => process.env[name]?.trim() || undefined

const withTrailingSlash = (url) => (url && !url.endsWith('/') ? `${url}/` : url)

const services = [
  {
    name: 'case-management',
    testDir: './test/api/case-management',
    baseURL:
      envValue('caseManagementBaseURL') ?? CASE_MANAGEMENT_BASE_URLS[env],
    variable: 'caseManagementBaseURL'
  },
  {
    name: 'waste-obligations',
    testDir: './test/api/waste-obligations',
    baseURL:
      envValue('wasteObligationsBaseURL') ?? WASTE_OBLIGATIONS_BASE_URLS[env],
    variable: 'wasteObligationsBaseURL'
  }
]

const projects = services
  .filter((service) => service.baseURL)
  .map(({ name, testDir, baseURL }) => ({
    name,
    testDir,
    use: { baseURL: withTrailingSlash(baseURL) }
  }))

if (projects.length === 0) {
  throw new Error(
    `No API URLs for ENVIRONMENT "${env}". Set ${services.map((s) => s.variable).join(' or ')} in .env.${env}.`
  )
}

export default defineConfig({
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
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { accept: 'application/json' }
  },
  projects
})
