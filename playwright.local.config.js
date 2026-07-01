import dotenv from 'dotenv'
import { defineConfig, devices } from '@playwright/test'
import baseConfig from './playwright.config.js'

dotenv.config({ path: '.env.local', override: true })

const nationId = process.env.NATION_ID ?? 'EN'
const authFile = `playwright/.auth/nation${nationId}.json`

const baseURL = process.env.baseURL
const baseURLCompliance = process.env.baseURLCompliance

export default defineConfig({
  ...baseConfig,
  workers: 1,
  retries: 0,
  use: {
    ...baseConfig.use,
    baseURL,
    baseURLCompliance,
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
