import fs from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

process.env.ENVIRONMENT = 'local'

const { default: baseConfig } = await import('./playwright.config.js')

function toTestIgnoreArray(testIgnore) {
  if (!testIgnore) {
    return []
  }

  if (Array.isArray(testIgnore)) {
    return testIgnore
  }

  return [testIgnore]
}

const nationId = process.env.NATION_ID ?? 'EN'
const authFile = `playwright/.auth/nation${nationId}.json`
const packagingRegulatorBaseURL = process.env.packagingRegulatorBaseURL
const existingTestIgnore = toTestIgnoreArray(baseConfig.testIgnore)

// Re-authenticating against the real B2C sign-in form on every local run is
// slow and unnecessary while a session is still fresh. Only run 'setup' to
// (re)create authFile when it's missing or older than the session lifetime —
// otherwise a stale reused session fails partway through a run instead of
// just re-authenticating up front.
const AUTH_FILE_MAX_AGE_MS = 30 * 60 * 1000
const authFileAgeMs = fs.existsSync(authFile)
  ? Date.now() - fs.statSync(authFile).mtimeMs
  : Infinity
const isAuthFileFresh = authFileAgeMs < AUTH_FILE_MAX_AGE_MS

export default defineConfig({
  ...baseConfig,
  workers: 1,
  retries: 0,
  testIgnore: [...existingTestIgnore, 'test/specs/home.spec.js'],
  use: {
    ...baseConfig.use,
    packagingRegulatorBaseURL,
    trace: 'on',
    video: 'on'
  },
  projects: [
    ...(isAuthFileFresh
      ? []
      : [{ name: 'setup', testDir: './auth', testMatch: /.*\.setup\.js/ }]),
    {
      name: 'Regulator Dashboard Functional Tests',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile
      },
      dependencies: isAuthFileFresh ? [] : ['setup']
    }
  ]
})
