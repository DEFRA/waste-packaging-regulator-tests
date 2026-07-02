import dotenv from 'dotenv'
import { defineConfig, devices } from '@playwright/test'
import baseConfig from './playwright.config.js'

dotenv.config({ path: '.env.local', override: true })

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
    {
      name: 'Regulator Dashboard Functional Tests',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile
      }
    }
  ]
})
