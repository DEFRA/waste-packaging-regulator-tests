import { Page } from './page.js'

class CertificatesCancelCheckPage extends Page {
  get confirmHeading() {
    return this.page.getByRole('heading', {
      name: 'Confirm and send cancellation email'
    })
  }

  get changeReasonLink() {
    return this.summaryListRow('Cancel reason').getByRole('link', {
      name: /Change/i
    })
  }

  get confirmAndSendButton() {
    return this.page.getByRole('button', { name: 'Confirm and send' })
  }

  async confirmAndSend() {
    await this.confirmAndSendButton.click()
    await this.page.waitForLoadState('networkidle')
  }
}

export { CertificatesCancelCheckPage }
