import { test, expect } from '../fixtures.js'
import { CertificatesPage } from '../page-objects/certificates.page.js'

test.describe('Certificates and Statements of Compliance', () => {
  test('displays the View certificates and statements of compliance link on the dashboard', async ({
    page
  }) => {
    const certificatesPage = new CertificatesPage(page)
    await certificatesPage.open()

    await expect(certificatesPage.viewCertificatesLink).toBeVisible()
  })

  test.describe('after navigating to the certificates page', () => {
    test.beforeEach(async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.open()
      await certificatesPage.navigateToCertificates()
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

    test('displays Pending, Accepted and Not submitted status tabs', async ({
      page
    }) => {
      await expect(page.getByRole('link', { name: /Pending/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /Accepted/i })).toBeVisible()
      await expect(
        page.getByRole('link', { name: /Not submitted/i })
      ).toBeVisible()
    })

    test('URL changes after navigation', async ({ page }) => {
      await expect(page).not.toHaveURL('/')
    })

    test('page title contains the site name', async ({ page }) => {
      await expect(page).toHaveTitle(/waste-packaging-regulators-fe/i)
    })
  })
})
