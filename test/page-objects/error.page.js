import { Page } from './page.js'

class ErrorPage extends Page {
  headingWithText(text) {
    return this.page.getByRole('heading', { name: text, level: 1 })
  }

  bodyText(text) {
    return this.page.getByText(text).first()
  }

  // Navigations return the response so specs can assert the status code the
  // page was served with, not just what it renders.
  // The preview routes are gated on NODE_ENV, which every deployed CDP
  // environment sets to production — so they exist only when running the app
  // locally, not in dev, test or prod.
  openExample(statusCode) {
    return this.page.goto(
      `${process.env.packagingRegulatorBaseURL}/error-examples/${statusCode}`
    )
  }

  openUnknownPath() {
    return this.page.goto(
      `${process.env.packagingRegulatorBaseURL}/this-page-does-not-exist`
    )
  }

  screenshot(name) {
    return this.page.screenshot({
      path: `test-results/error-pages/${name}.png`,
      fullPage: true
    })
  }
}

export { ErrorPage }
