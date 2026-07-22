import { expect } from '@playwright/test'
import { Page } from './page.js'

// "1 March 2026 at 09:15" — the format used for accepted/cancelled dates and
// the current-year action rows.
const dateTimePattern = /^\d{1,2} \w+ \d{4} at \d{2}:\d{2}$/

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

  get acceptStatementLink() {
    return this.page.getByRole('button', { name: /Accept statement/i })
  }

  get cancelCertificateButton() {
    return this.page.getByRole('button', { name: /Cancel certificate/i })
  }

  get cancelStatementButton() {
    return this.page.getByRole('button', { name: /Cancel statement/i })
  }

  get getNotificationBanner() {
    return this.page.locator('.govuk-notification-banner')
  }

  get serviceErrorMessage() {
    return this.page.getByText('Something went wrong')
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

  get currentYearHeading() {
    return this.page.getByRole('heading', { name: 'Current year' })
  }

  get currentYearTable() {
    return this.page
      .getByRole('heading', { name: 'Current year' })
      .locator('+ table')
  }

  currentYearRowWithAction(action) {
    return this.currentYearTable.locator('tbody tr').filter({
      has: this.page.locator('.govuk-tag', { hasText: action })
    })
  }

  notificationBannerHeading(text) {
    return this.getNotificationBanner.getByRole('heading', { name: text })
  }

  async expectAcceptedOutcomeSummary() {
    await expect(
      this.summaryRowTag('Submission status', 'Accepted')
    ).toBeVisible()
    await expect(this.summaryRowValue('Accepted by')).not.toHaveText('No data')
    await expect(this.summaryRowValue('Accepted by')).not.toBeEmpty()
    await expect(this.summaryRowValue('Accepted date')).toHaveText(
      dateTimePattern
    )
  }

  async expectCancelledOutcomeSummary(reasonLabel) {
    await expect(
      this.summaryRowTag('Submission status', 'Cancelled')
    ).toBeVisible()
    await expect(this.summaryRowTag('Submission status')).toHaveClass(
      /govuk-tag--yellow/
    )
    await expect(this.summaryRowValue('Cancelled by')).not.toHaveText('No data')
    await expect(this.summaryRowValue('Cancelled by')).not.toBeEmpty()
    await expect(this.summaryRowValue('Cancelled date')).toHaveText(
      dateTimePattern
    )
    await expect(this.summaryRowValue('Reason for cancellation')).toHaveText(
      reasonLabel
    )
  }

  async expectCurrentYearAcceptedRow() {
    const row = this.currentYearRowWithAction('Accepted').first()
    await expect(row).toBeVisible()
    await expect(row.locator('td').nth(0)).toHaveText(dateTimePattern)
    await expect(row.locator('.govuk-tag')).toHaveText('Accepted')
    await expect(row.locator('td').nth(2)).not.toBeEmpty()
    await expect(row.locator('td').nth(3)).toBeEmpty()
  }

  async expectCurrentYearCancelledRow(reason) {
    const row = this.currentYearRowWithAction('Cancelled').first()
    await expect(row).toBeVisible()
    await expect(row.locator('td').nth(0)).toHaveText(dateTimePattern)
    await expect(row.locator('.govuk-tag')).toHaveText('Cancelled')
    await expect(row.locator('td').nth(2)).not.toBeEmpty()
    await expect(row.locator('td').nth(3)).toHaveText(reason)
  }
}

export { CertificatesDetailPage }
