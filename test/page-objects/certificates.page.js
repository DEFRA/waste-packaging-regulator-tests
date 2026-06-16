import { Page } from './page.js'

class CertificatesPage extends Page {
  constructor(page) {
    super(page)
  }

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
    return this.page
      .getByRole('tab', { name: /Pending/i })
      .or(this.page.getByText(/Pending/i).first())
  }

  get acceptedTab() {
    return this.page
      .getByRole('tab', { name: /Accepted/i })
      .or(this.page.getByText(/Accepted/i).first())
  }

  get notSubmittedTab() {
    return this.page
      .getByRole('tab', { name: /Not submitted/i })
      .or(this.page.getByText(/Not submitted/i).first())
  }

  async open() {
    await super.open('/')
  }

  async navigateToCertificates() {
    await this.viewCertificatesLink.click()
  }
}

export { CertificatesPage }
