import { test as base, expect } from '@playwright/test'
import { analyzeAccessibility } from '../utils/accessibility.js'

export const test = base.extend({
  page: async ({ page }, use) => {
    await use(page)
    if (process.env.RUN_ACCESSIBILITY) {
      await analyzeAccessibility(page)
    }
  }
})

export { expect }
