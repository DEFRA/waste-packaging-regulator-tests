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
      'tbody.govuk-table__body tr:first-child :is(td, th):first-child a'
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
    return this.tableRowWithTag(tagText).locator(':is(td, th):first-child a')
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
      .locator(':is(td, th):first-child a')
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
      .locator(':is(td, th):first-child a')
  }

  get searchResults() {
    return this.page.locator('#search-results')
  }

  get searchResultsSummary() {
    return this.searchResults.locator('p').first()
  }

  get searchResultsTable() {
    return this.searchResults.locator('table')
  }

  get searchResultsColumnHeadings() {
    return this.searchResultsTable.locator('thead th')
  }

  get clearSearchLink() {
    return this.searchResults.getByRole('link', { name: 'Clear search' })
  }

  get errorSummary() {
    return this.page.locator('.govuk-error-summary')
  }

  get searchResultRows() {
    return this.searchResultsTable.locator('tbody tr')
  }

  // Cells are addressed as :is(td, th) by position rather than by td index,
  // so this reads the same whether or not the environment has the change that
  // makes the organisation name cell a row header.
  async getSearchResultRows() {
    const count = await this.searchResultRows.count()
    const rows = []

    for (let i = 0; i < count; i++) {
      const cells = this.searchResultRows.nth(i).locator(':is(td, th)')
      const link = cells.nth(0).locator('a')

      rows.push({
        organisationName: (await link.innerText()).trim(),
        href: await link.getAttribute('href'),
        organisationReferenceNumber: (await cells.nth(1).innerText()).trim(),
        submissionStatus: (
          await cells.nth(2).locator('.govuk-tag').innerText()
        ).trim()
      })
    }

    return rows
  }

  // A producer holding more than one submission cannot be conjured from real
  // data, so this searches a bounded list of candidate names and returns the
  // rows of the first organisation that comes back with more than one, or null.
  async findProducerWithMultipleSubmissions(names) {
    for (const name of names) {
      await this.search(name)

      const rowsByOrganisation = new Map()

      for (const row of await this.getSearchResultRows()) {
        const key = row.organisationReferenceNumber
        rowsByOrganisation.set(key, [
          ...(rowsByOrganisation.get(key) ?? []),
          row
        ])
      }

      for (const rows of rowsByOrganisation.values()) {
        if (rows.length > 1) {
          return rows
        }
      }
    }

    return null
  }

  async search(term) {
    await this.searchInput.fill(term)
    await this.searchButton.click()
  }

  async clearSearch() {
    await this.clearSearchLink.click()
  }

  get downloadCsvButton() {
    return this.page
      .getByRole('button', { name: 'Download list (CSV)' })
      .or(this.page.getByRole('link', { name: 'Download list (CSV)' }))
  }

  get paginationNav() {
    return this.page.getByRole('navigation', { name: 'Results pages' })
  }

  get paginationPreviousLink() {
    return this.paginationNav.getByRole('link', { name: 'Previous' })
  }

  get paginationNextLink() {
    return this.paginationNav.getByRole('link', { name: 'Next' })
  }

  // The current-page item is a link with aria-current="page", not a bare <li>.
  get paginationCurrentPageItem() {
    return this.paginationNav.locator('[aria-current="page"]')
  }

  get paginationEllipses() {
    return this.paginationNav.locator('.govuk-pagination__item--ellipsis')
  }

  // exact: true matters once totalPages reaches double digits (dev) — default
  // substring matching would let 'Page 3' match 'Page 30'.
  paginationPageLink(pageNumber) {
    return this.paginationNav.getByRole('link', {
      name: `Page ${pageNumber}`,
      exact: true
    })
  }

  async clickPaginationNext() {
    await this.paginationNextLink.click()
  }

  async clickPaginationPage(pageNumber) {
    await this.paginationPageLink(pageNumber).click()
  }

  // Bare page-number text (not aria-label), left to right, skipping ellipsis
  // <li>s — the exact visible window in DOM order.
  async getVisiblePageNumbers() {
    const links = this.paginationNav.locator(
      '.govuk-pagination__list > .govuk-pagination__item:not(.govuk-pagination__item--ellipsis) a'
    )
    const count = await links.count()
    const numbers = []
    for (let i = 0; i < count; i++) {
      numbers.push(Number((await links.nth(i).innerText()).trim()))
    }
    return numbers
  }

  async getLastVisiblePageNumber() {
    return Math.max(...(await this.getVisiblePageNumbers()))
  }

  // Parses "(N)" out of a status tab's text, e.g. "Not submitted (2015)" -> 2015.
  async getTabCount(tabLocator) {
    const text = await tabLocator.innerText()
    const match = text.match(/\((\d+)\)/)
    return match ? Number(match[1]) : null
  }

  async getVisibleOrganisationNames() {
    return this.page
      .locator('tbody.govuk-table__body tr :is(td, th):first-child a')
      .allTextContents()
  }

  // Navigates straight to a given page — used to set up "Given I am on page N"
  // preconditions without depending on which page numbers happen to be
  // directly clickable from wherever the test starts.
  async openListTabAtPage(organisationType, tab, pageNumber) {
    await super.open(
      `${process.env.packagingRegulatorBaseURL}/certificates-of-compliance?type=${organisationType}&tab=${tab}&page=${pageNumber}`
    )
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

  tabLocatorFor(tab) {
    if (tab === 'accepted') {
      return this.acceptedTab
    }
    if (tab === 'not-submitted') {
      return this.notSubmittedTab
    }
    return this.pendingTab
  }

  // Opens a tab and reports how many records it holds, read from the tab label
  // e.g. "Pending (42)". Tests that need a real row to work with use this to
  // skip when a tab is legitimately empty, rather than timing out on a
  // locator that was never going to resolve.
  async openListTabWithCount(organisationType, tab) {
    await this.openListTab(organisationType, tab)
    return this.getTabCount(this.tabLocatorFor(tab))
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
    await row.locator(':is(td, th):first-child a').click()
    await this.page.waitForURL(/\/certificates-of-compliance/)
  }

  async detailRecyclingTagMatches(tagText) {
    if (
      await this.page
        .getByText('Sorry, there is a problem with the service')
        .isVisible()
    ) {
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

  async openFirstNotSubmittedDetail(organisationType = 'compliance-schemes') {
    await this.openNotSubmittedList(organisationType)

    if (!(await this.firstTableRowLink.isVisible())) {
      return false
    }

    await this.firstTableRowLink.click()
    await this.page.waitForURL(/\/certificates-of-compliance/)

    return true
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
