import { Page } from './page.js'

export const HELP_DESK_EMAIL = 'eprcustomerservice@defra.gov.uk'

class ErrorPage extends Page {
  get helpDeskLink() {
    return this.page.getByRole('link', { name: HELP_DESK_EMAIL })
  }

  headingWithText(text) {
    return this.page.getByRole('heading', { name: text, level: 1 })
  }

  bodyText(text) {
    return this.page.getByText(text).first()
  }

  // Navigations return the response so specs can assert the status code the
  // page was served with, not just what it renders.
  // The preview routes are only registered outside production, so they are
  // reachable locally and in the CDP test environments, but not in production.
  openExample(statusCode) {
    return this.page.goto(
      `${process.env.packagingRegulatorBaseURL}/error-examples/${statusCode}`
    )
  }

  openExamplesIndex() {
    return this.page.goto(
      `${process.env.packagingRegulatorBaseURL}/error-examples`
    )
  }

  openUnknownPath() {
    return this.page.goto(
      `${process.env.packagingRegulatorBaseURL}/this-page-does-not-exist`
    )
  }

  exampleLink(statusCode) {
    return this.page.locator(`a[href="/error-examples/${statusCode}"]`)
  }

  helpDeskMailtoHref() {
    return this.helpDeskLink.first().getAttribute('href')
  }

  screenshot(name) {
    return this.page.screenshot({
      path: `test-results/error-pages/${name}.png`,
      fullPage: true
    })
  }
}

export { ErrorPage }
