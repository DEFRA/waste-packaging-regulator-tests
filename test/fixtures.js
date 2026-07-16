import { test as base, expect } from '@playwright/test'
import { analyzeAccessibility } from '../utils/accessibility.js'
import { isAccessibility } from '../utils/profile.js'

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    await use(page)
    // A test that called test.skip() mid-body never navigated the page —
    // scanning it here would flag the blank document's missing <title>/lang
    // as false "accessibility violations" instead of leaving it skipped.
    if (isAccessibility && testInfo.status !== 'skipped') {
      await analyzeAccessibility(page)
    }
  }
})

export { expect }
