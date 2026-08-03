import { test, expect } from '../fixtures.js'
import { ErrorPage, HELP_DESK_EMAIL } from '../page-objects/error.page.js'

const helpDeskSentence = `Email ${HELP_DESK_EMAIL} if you need help.`

const ERROR_PAGES = [
  {
    statusCode: 403,
    name: 'access-denied',
    heading: 'You do not have permission to access this page',
    body: [helpDeskSentence]
  },
  {
    statusCode: 404,
    name: 'not-found',
    heading: 'Page not found',
    body: [
      'If you typed the web address, check it is correct.',
      'If you pasted the web address, check you copied the entire address.',
      'If the web address is correct or you selected a link or a button, email'
    ]
  },
  {
    statusCode: 500,
    name: 'problem-with-service',
    heading: 'Sorry, there is a problem with the service',
    body: ['Try again later.', helpDeskSentence]
  },
  {
    statusCode: 503,
    name: 'service-unavailable',
    heading: 'Sorry, the service is unavailable',
    body: [helpDeskSentence]
  }
]

test.describe('Error pages', () => {
  test.beforeEach(() => {
    test.skip(
      !process.env.packagingRegulatorBaseURL,
      'Requires the packaging regulator base URL'
    )
  })

  for (const errorPage of ERROR_PAGES) {
    test(`${errorPage.statusCode} shows the heading, guidance and help desk email`, async ({
      page
    }) => {
      const errorPageObject = new ErrorPage(page)
      const response = await errorPageObject.openExample(errorPage.statusCode)

      expect(response.status()).toBe(errorPage.statusCode)
      await expect(
        errorPageObject.headingWithText(errorPage.heading)
      ).toBeVisible()

      for (const text of errorPage.body) {
        await expect(errorPageObject.bodyText(text)).toBeVisible()
      }

      await expect(errorPageObject.helpDeskLink.first()).toBeVisible()
      expect(await errorPageObject.helpDeskMailtoHref()).toBe(
        `mailto:${HELP_DESK_EMAIL}`
      )

      await errorPageObject.screenshot(errorPage.name)
    })
  }

  test('an unknown web address shows the page not found page', async ({
    page
  }) => {
    const errorPageObject = new ErrorPage(page)
    const response = await errorPageObject.openUnknownPath()

    expect(response.status()).toBe(404)
    await expect(errorPageObject.headingWithText('Page not found')).toBeVisible()
    await errorPageObject.screenshot('not-found-unknown-address')
  })

  test('the examples index links to every error page', async ({ page }) => {
    const errorPageObject = new ErrorPage(page)
    await errorPageObject.openExamplesIndex()

    for (const { statusCode } of ERROR_PAGES) {
      await expect(errorPageObject.exampleLink(statusCode)).toBeVisible()
    }
  })
})
