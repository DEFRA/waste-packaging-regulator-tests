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

  get downloadCsvButton() {
    return this.page
      .getByRole('button', { name: 'Download list (CSV)' })
      .or(this.page.getByRole('link', { name: 'Download list (CSV)' }))
  }

  async open() {
    await super.open('/')
  }

  async openDirect() {
    await super.open(process.env.baseURLCompliance)
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
}

export { CertificatesPage }
