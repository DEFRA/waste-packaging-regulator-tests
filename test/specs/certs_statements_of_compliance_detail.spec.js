import { test, expect } from '../fixtures.js'
import { CertificatesDetailPage } from '../page-objects/certificates.detail.page.js'
import { CertificatesPage } from '../page-objects/certificates.page.js'
import { CertificatesAcceptPage } from '../page-objects/certificates.accept.page.js'

test.describe('Certificates and Statements of Compliance accept', () => {
  test('displays pending tab on navigating to list page with a pending item', async ({
    page
  }) => {
    const certificatesPage = new CertificatesPage(page)
    await certificatesPage.openDirect()

    await expect(certificatesPage.pageHeading).toBeVisible()
  })

  test.describe('after clicking on the first row link', () => {
    test.beforeEach(async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.openDirect()
      await certificatesPage.firstTableRowLink.click()
    })

    test('displays submitted detail page with accept and cancel buttons', async ({
      page
    }) => {
      const certificatesDetailPage = new CertificatesDetailPage(page)

      await expect(certificatesDetailPage.acceptCertificateLink).toBeVisible()
      await expect(certificatesDetailPage.cancelCertificateButton).toBeVisible()
    })

    test.describe('after clicking accept certificate', () => {
      test.describe.configure({ mode: 'serial' })

      test.beforeEach(async ({ page }) => {
        const certificatesDetailPage = new CertificatesDetailPage(page)
        await certificatesDetailPage.acceptCertificateLink.click()
      })

      test('selecting No returns to the detail page', async ({ page }) => {
        const acceptPage = new CertificatesAcceptPage(page)
        const certificatesDetailPage = new CertificatesDetailPage(page)

        await acceptPage.selectNo()

        await expect(certificatesDetailPage.acceptCertificateLink).toBeVisible()
        await expect(
          certificatesDetailPage.cancelCertificateButton
        ).toBeVisible()
      })

      test('selecting Yes shows a success banner on the detail page', async ({
        page
      }) => {
        const acceptPage = new CertificatesAcceptPage(page)
        const certificatesDetailPage = new CertificatesDetailPage(page)

        await acceptPage.selectYes()

        await expect(certificatesDetailPage.getNotificationBanner).toBeVisible()
        await expect(certificatesDetailPage.acceptCertificateLink).toBeHidden()
      })
    })
  })
})
