import { Page } from './page.js'

class CertificatesDetailPage extends Page {
  get pageHeading() {
    return this.page.locator('.govuk-caption-l')
  }

  get complianceTypeLabel() {
    return this.page.locator('.govuk-caption-l')
  }

  get organisationNameHeading() {
    return this.page.getByRole('heading', { level: 1 })
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

  get serviceErrorMessage() {
    return this.page.getByText('Something went wrong')
  }

  summaryListRow(key) {
    return this.page.locator('.govuk-summary-list__row').filter({
      has: this.page.locator('.govuk-summary-list__key', { hasText: key })
    })
  }

  summaryRowValue(key) {
    return this.summaryListRow(key).locator('.govuk-summary-list__value')
  }

  get recyclingObligationsSummaryTag() {
    return this.page
      .locator('.govuk-summary-list')
      .first()
      .locator('.govuk-summary-list__row')
      .filter({
        has: this.page.locator('.govuk-summary-list__key', {
          hasText: 'Recycling obligations'
        })
      })
      .locator('.govuk-summary-list__value .govuk-tag')
  }

  summaryRowTag(key, tagText) {
    const tag = this.summaryRowValue(key).locator('.govuk-tag')
    return tagText ? tag.getByText(tagText, { exact: true }) : tag
  }

  get submittedOnValue() {
    return this.summaryRowValue('Submitted on')
  }
}

export { CertificatesDetailPage }
