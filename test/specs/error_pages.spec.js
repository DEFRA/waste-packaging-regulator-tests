import { test, expect } from '../fixtures.js'
import { ErrorPage } from '../page-objects/error.page.js'

const pageNotFound = 'Page not found'
const checkTheAddress = 'If you typed the web address, check it is correct.'

// The preview routes are the only way to get the 403, 500 and 503 pages into a
// browser: their real triggers (a failing API, a maintenance shutter) need
// app-level environment changes this suite cannot make. What a browser adds is
// the accessibility scan fixtures.js runs under PROFILE=accessibility, plus
// screenshots for design review — so that is all these tests do. The copy and
// the status mapping are pinned by the frontend's own unit and journey tests,
// and are deliberately not restated here.
const PREVIEW_PAGES = [
  { statusCode: 403, name: 'access-denied' },
  { statusCode: 404, name: 'not-found' },
  { statusCode: 500, name: 'problem-with-service' },
  { statusCode: 503, name: 'service-unavailable' }
]

test.describe('Error page previews', () => {
  test.beforeEach(() => {
    test.skip(!process.env.dashboardBaseURL, 'Requires the dashboard base URL')
    // Deployed environments all run NODE_ENV=production, where the preview
    // routes are not registered.
    test.skip(
      process.env.ENVIRONMENT !== 'local',
      'Error page previews are only registered when running locally'
    )
  })

  for (const { statusCode, name } of PREVIEW_PAGES) {
    test(`${statusCode} renders for accessibility and visual review`, async ({
      page
    }) => {
      const errorPage = new ErrorPage(page)
      const response = await errorPage.openExample(statusCode)

      // Enough to prove the right page rendered, so the screenshot and the
      // accessibility scan are of a real page and not a blank frame.
      expect(response.status()).toBe(statusCode)
      await expect(errorPage.pageHeading).toBeVisible()

      await errorPage.screenshot(name)
    })
  }
})

// Needs no preview route, so in principle this could run in deployed
// environments too, unlike the previews above — but dev and test sit behind
// regulators-waste-proxy, which returns its own empty-body 404 for unmatched
// paths and never forwards the request to the app, so the app's real
// not-found page never renders there. Only reliable against local, where the
// app is hit directly.
test.describe('Page not found', () => {
  test.beforeEach(() => {
    test.skip(!process.env.dashboardBaseURL, 'Requires the dashboard base URL')
    test.skip(
      ['dev', 'test'].includes(process.env.ENVIRONMENT || 'dev'),
      'regulators-waste-proxy returns an empty 404 for unmatched paths in dev/test, so the app’s own not-found page never renders there'
    )
  })

  test('an unknown web address shows the page not found page', async ({
    page
  }) => {
    const errorPage = new ErrorPage(page)
    const response = await errorPage.openUnknownPath()

    expect(response.status()).toBe(404)
    await expect(errorPage.headingWithText(pageNotFound)).toBeVisible()
    await expect(errorPage.bodyText(checkTheAddress)).toBeVisible()
    await errorPage.screenshot('not-found-unknown-address')
  })
})
