import { test as base, expect } from '@playwright/test'
import { analyzeAccessibility } from '../utils/accessibility.js'
import { isAccessibility } from '../utils/profile.js'

// Live Google Tag Manager / Analytics tags held the page load event back by
// ~14s per navigation in Chrome, timing out clicks and the axe scan. No test
// asserts on analytics, so abort those requests for every page.
export const ANALYTICS_HOSTS =
  /^https?:\/\/([^/]+\.)?(googletagmanager\.com|google-analytics\.com)\//

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route(ANALYTICS_HOSTS, (route) => route.abort())
    await use(context)
  },
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
