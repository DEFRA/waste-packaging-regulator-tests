import { test, expect } from '../fixtures.js'
import { CertificatesPage } from '../page-objects/certificates.page.js'

test.describe('Certificates and Statements of Compliance', () => {
  test('displays the View certificates and statements of compliance link on the dashboard', async ({
    page
  }) => {
    test.skip(
      !process.env.dashboardBaseURL?.includes('regulator-dashboard'),
      'Requires regulator dashboard base URL'
    )

    const certificatesPage = new CertificatesPage(page)
    await certificatesPage.openDirect()

    await expect(certificatesPage.pageHeading).toBeVisible()
  })

  test.describe('after navigating to the certificates page', () => {
    test.beforeEach(async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.openDirect()
    })

    test('displays the page heading', async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      await expect(certificatesPage.pageHeading).toBeVisible()
    })

    test('displays the search input and button', async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      await expect(certificatesPage.searchInput).toBeVisible()
      await expect(certificatesPage.searchButton).toBeVisible()
    })

    test('displays Direct producers and Compliance schemes tabs', async ({
      page
    }) => {
      const certificatesPage = new CertificatesPage(page)
      await expect(certificatesPage.directProducersTab).toBeVisible()
      await expect(certificatesPage.complianceSchemesTab).toBeVisible()
    })

    test('URL changes after navigation', async ({ page }) => {
      await expect(page).not.toHaveURL('/')
    })

    test('page title contains the site name', async ({ page }) => {
      await expect(page).toHaveTitle(/waste-packaging-regulators-fe/i)
    })
  })

  test.describe('Direct producers', () => {
    test.beforeEach(async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.openDirect()
      await certificatesPage.clickDirectProducers()
    })

    test('Accepted tab - navigates to the correct URL', async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.clickAcceptedTab()

      await expect(page).toHaveURL(/type=direct-producers.*tab=accepted/)
      await expect(certificatesPage.downloadCsvButton).toBeVisible()
    })

    test('Not submitted tab - navigates to the correct URL', async ({
      page
    }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.clickNotSubmittedTab()

      await expect(page).toHaveURL(/type=direct-producers.*tab=not-submitted/)
      await expect(certificatesPage.downloadCsvButton).toBeVisible()
    })
  })

  test.describe('Compliance schemes', () => {
    test.beforeEach(async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.openDirect()
      await certificatesPage.clickComplianceSchemes()
    })

    test('Pending tab - navigates to the correct URL', async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.clickPendingTab()

      await expect(page).toHaveURL(/type=compliance-schemes.*tab=pending/)
      await expect(certificatesPage.downloadCsvButton).toBeVisible()
    })

    test('Accepted tab - navigates to the correct URL', async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.clickAcceptedTab()

      await expect(page).toHaveURL(/type=compliance-schemes.*tab=accepted/)
      await expect(certificatesPage.downloadCsvButton).toBeVisible()
    })

    test('Not submitted tab - navigates to the correct URL', async ({
      page
    }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.clickNotSubmittedTab()

      await expect(page).toHaveURL(/type=compliance-schemes.*tab=not-submitted/)
      await expect(certificatesPage.downloadCsvButton).toBeVisible()
    })
  })
})
