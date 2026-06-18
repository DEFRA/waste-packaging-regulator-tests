import { test as base, expect } from '@playwright/test'
import { analyzeAccessibility } from '../utils/accessibility.js'
import { isAccessibility } from '../utils/profile.js'

export const test = base.extend({
  page: async ({ page }, use) => {
    await use(page)
    if (isAccessibility) {
      await analyzeAccessibility(page)
    }
  }
})

export { expect }
