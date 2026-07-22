import { Page } from './page.js'

class CertificatesCancelReasonPage extends Page {
  get reasonHeading() {
    return this.page.getByRole('heading', { name: /Why are you cancelling/i })
  }

  reasonRadio(label) {
    return this.page.getByRole('radio', { name: label })
  }

  get continueButton() {
    return this.page.getByRole('button', { name: 'Continue' })
  }

  get errorSummary() {
    return this.page.locator('.govuk-error-summary')
  }

  async selectReason(label) {
    await this.reasonRadio(label).click()
    await this.continueButton.click()
    await this.page.waitForLoadState('networkidle')
  }

  async continueWithoutReason() {
    await this.continueButton.click()
    await this.page.waitForLoadState('networkidle')
  }
}

export { CertificatesCancelReasonPage }
