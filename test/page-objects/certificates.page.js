import { Page } from './page.js'

class CertificatesPage extends Page {
  get viewCertificatesLink() {
    return this.page.getByRole('link', {
      name: 'View certificates and statements of compliance'
    })
  }

  get pageHeading() {
    return this.page.getByRole('heading', {
      name: 'View certificates and statements of compliance'
    })
  }

  get searchInput() {
    return this.page.getByLabel('Search by organisation name or ID')
  }

  get searchButton() {
    return this.page.getByRole('button', { name: 'Search' })
  }

  get directProducersTab() {
    return this.page.getByRole('link', { name: 'Direct producers' })
  }

  get complianceSchemesTab() {
    return this.page.getByRole('link', { name: 'Compliance schemes' })
  }

  get pendingTab() {
    return this.page.getByRole('link', { name: /Pending/i })
  }

  get acceptedTab() {
    return this.page.getByRole('link', { name: /Accepted/i })
  }

  get notSubmittedTab() {
    return this.page.getByRole('link', { name: /Not submitted/i })
  }

  get firstTableRowLink() {
    return this.page.locator(
      'tbody.govuk-table__body tr:first-child td:first-child a'
    )
  }

  tableRowWithTag(tagText) {
    return this.page
      .locator('tbody.govuk-table__body tr')
      .filter({
        has: this.page.locator('.govuk-tag', { hasText: tagText })
      })
      .first()
  }

  tableRowLinkWithTag(tagText) {
    return this.tableRowWithTag(tagText).locator('td:first-child a')
  }

  tableRowLinkWithRecyclingTag(tagText) {
    return this.page
      .locator('tbody.govuk-table__body tr')
      .filter({
        has: this.page.locator('td:nth-child(3) .govuk-tag', {
          hasText: new RegExp(`^${tagText}$`)
        })
      })
      .first()
      .locator('td:first-child a')
  }

  tableRowLinkWithRegulation43Tag(tagText) {
    return this.page
      .locator('tbody.govuk-table__body tr')
      .filter({
        has: this.page.locator('td:nth-child(4) .govuk-tag', {
          hasText: tagText
        })
      })
      .first()
      .locator('td:first-child a')
  }

  get downloadCsvButton() {
    return this.page
      .getByRole('button', { name: 'Download list (CSV)' })
      .or(this.page.getByRole('link', { name: 'Download list (CSV)' }))
  }

  async open() {
    await super.open('/')
  }

  async openDirect() {
    await super.open(
      process.env.packagingRegulatorBaseURL + '/certificates-of-compliance'
    )
  }

  async navigateToCertificates() {
    await this.viewCertificatesLink.click()
  }

  async clickDirectProducers() {
    await this.directProducersTab.click()
  }

  async clickComplianceSchemes() {
    await this.complianceSchemesTab.click()
  }

  async clickPendingTab() {
    await this.pendingTab.click()
  }

  async clickAcceptedTab() {
    await this.acceptedTab.click()
  }

  async clickNotSubmittedTab() {
    await this.notSubmittedTab.click()
  }

  async openDetailForRowWithTag(tagText) {
    await this.tableRowLinkWithTag(tagText).click()
  }

  async openDetailForRecyclingTag(tagText) {
    await this.tableRowLinkWithRecyclingTag(tagText).click()
  }

  async openDetailForRegulation43Tag(tagText) {
    await this.tableRowLinkWithRegulation43Tag(tagText).click()
  }

  async openListTab(organisationType, tab) {
    await this.openDirect()
    if (organisationType === 'compliance-schemes') {
      await this.clickComplianceSchemes()
    } else {
      await this.clickDirectProducers()
    }
    if (tab === 'pending') {
      await this.clickPendingTab()
    } else if (tab === 'accepted') {
      await this.clickAcceptedTab()
    } else if (tab === 'not-submitted') {
      await this.clickNotSubmittedTab()
    }
  }

  async openPendingList(organisationType = 'compliance-schemes') {
    await this.openListTab(organisationType, 'pending')
  }

  recyclingObligationsDetailTag() {
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

  async getRowIndexesWithRecyclingTag(tagText) {
    const rows = this.page.locator('tbody.govuk-table__body tr')
    const rowCount = await rows.count()
    const matchingIndexes = []

    for (let i = 0; i < rowCount; i++) {
      const listTag = rows.nth(i).locator('td:nth-child(3) .govuk-tag')

      if ((await listTag.count()) === 0) {
        continue
      }

      if ((await listTag.innerText()).trim() === tagText) {
        matchingIndexes.push(i)
      }
    }

    return matchingIndexes
  }

  async openDetailRowAtIndex(index) {
    const row = this.page.locator('tbody.govuk-table__body tr').nth(index)
    await row.locator('td:first-child a').click()
    await this.page.waitForURL(/\/certificates-of-compliance/)
  }

  async detailRecyclingTagMatches(tagText) {
    if (await this.page.getByText('Something went wrong').isVisible()) {
      return false
    }

    const detailTag = this.recyclingObligationsDetailTag()

    if ((await detailTag.count()) === 0) {
      return false
    }

    return (await detailTag.innerText()).trim() === tagText
  }

  async tryOpenRecyclingDetailFromRow(organisationType, tab, index, tagText) {
    await this.openListTab(organisationType, tab)
    await this.openDetailRowAtIndex(index)
    return this.detailRecyclingTagMatches(tagText)
  }

  async openDetailForRecyclingTagFromAnyList(tagText) {
    const views = [
      ['compliance-schemes', 'pending'],
      ['compliance-schemes', 'accepted'],
      ['direct-producers', 'pending'],
      ['direct-producers', 'accepted']
    ]

    for (const [organisationType, tab] of views) {
      await this.openListTab(organisationType, tab)

      const matchingIndexes = await this.getRowIndexesWithRecyclingTag(tagText)

      for (const index of matchingIndexes) {
        if (
          await this.tryOpenRecyclingDetailFromRow(
            organisationType,
            tab,
            index,
            tagText
          )
        ) {
          return true
        }
      }
    }

    return false
  }

  async openNotSubmittedList(organisationType = 'compliance-schemes') {
    await this.openDirect()
    if (organisationType === 'compliance-schemes') {
      await this.clickComplianceSchemes()
    } else {
      await this.clickDirectProducers()
    }
    await this.clickNotSubmittedTab()
  }

  async getOrganisationNameForRowWithTag(tagText) {
    const name = await this.tableRowLinkWithTag(tagText).textContent()
    return name?.trim()
  }

  async getFirstRowOrganisationName() {
    const name = await this.firstTableRowLink.textContent()
    return name?.trim()
  }
}

export { CertificatesPage }
