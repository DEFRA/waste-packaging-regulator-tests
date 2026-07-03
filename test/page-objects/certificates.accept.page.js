import { Page } from './page.js'

class CertificatesAcceptPage extends Page {
  get yesRadio() {
    return this.page.getByRole('radio', { name: 'Yes' })
  }

  get noRadio() {
    return this.page.getByRole('radio', { name: 'No' })
  }

  get continueButton() {
    return this.page.getByRole('button', { name: 'Continue' })
  }

  get badRequestHeading() {
    return this.page.getByRole('heading', { name: '400' })
  }

  async selectYes() {
    await this.yesRadio.click()
    await this.continueButton.click()
    await this.page.waitForLoadState('networkidle')
  }

  async selectNo() {
    await this.noRadio.click()
    await this.continueButton.click()
    await this.page.waitForLoadState('networkidle')
  }
}

export { CertificatesAcceptPage }
