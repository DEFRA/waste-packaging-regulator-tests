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

  async selectYes() {
    await this.yesRadio.click()
    await this.continueButton.click()
  }

  async selectNo() {
    await this.noRadio.click()
    await this.continueButton.click()
  }
}

export { CertificatesAcceptPage }
