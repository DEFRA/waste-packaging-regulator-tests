import { Page } from './page.js'

class CertificatesDetailPage extends Page {
  get pageHeading() {
    return this.page.locator('.govuk-caption-l')
  }

  get acceptCertificateLink() {
    return this.page.getByRole('button', { name: /Accept certificate/i })
  }

  get cancelCertificateButton() {
    return this.page.getByRole('button', { name: /Cancel certificate/i })
  }

  get getNotificationBanner() {
    return this.page.locator('.govuk-notification-banner')
  }
}

export { CertificatesDetailPage }
