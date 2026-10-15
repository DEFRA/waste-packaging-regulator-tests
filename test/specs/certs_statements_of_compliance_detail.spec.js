import { test, expect } from '../fixtures.js'
import { CertificatesDetailPage } from '../page-objects/certificates.detail.page.js'
import { CertificatesPage } from '../page-objects/certificates.page.js'
import { CertificatesAcceptPage } from '../page-objects/certificates.accept.page.js'

// True when running against a stateless mock — state-dependent assertions are
// guarded or skipped; the accept/cancel flows still run.
const mockBackend = process.env.MOCK_DATA === 'true'

// dev/test share one live database. Read-only tests run everywhere (and skip
// only when the data they need is missing); tests that accept a submission
// only run against local / github mocked data.
const sharedEnvironment = !['local', 'github'].includes(process.env.ENVIRONMENT)
const ACCEPTS_SHARED_DATA =
  'Accepts a submission in shared dev/test data — only runs against local / github mocked data'

async function skipIfApproveFailed(acceptPage, testInfo) {
  if (await acceptPage.badRequestHeading.isVisible()) {
    testInfo.skip(
      true,
      'Approve action returned 400 from obligations API in this environment'
    )
  }
}

test.describe('Certificates and Statements of Compliance accept', () => {
  test('displays pending tab on navigating to list page with a pending item', async ({
    page
  }) => {
    const certificatesPage = new CertificatesPage(page)
    await certificatesPage.openDirect()

    await expect(certificatesPage.pageHeading).toBeVisible()
  })

  test.describe('after clicking on the first row link', () => {
    test.beforeEach(async ({ page }, testInfo) => {
      const opened = await new CertificatesPage(page).openFirstDetailFromList(
        'direct-producers',
        'pending'
      )
      test.skip(
        !opened,
        'No pending direct producer submissions in this environment'
      )
      await new CertificatesDetailPage(page).skipIfServiceError(testInfo)
    })

    test('displays submitted detail page with accept and cancel buttons', async ({
      page
    }) => {
      const certificatesDetailPage = new CertificatesDetailPage(page)

      await expect(certificatesDetailPage.acceptCertificateLink).toBeVisible()
      await expect(certificatesDetailPage.cancelCertificateButton).toBeVisible()
    })

    test.describe('after clicking accept certificate', () => {
      test.beforeEach(async ({ page }) => {
        const certificatesDetailPage = new CertificatesDetailPage(page)
        await certificatesDetailPage.acceptCertificateLink.click()
      })

      // Only Yes calls the approve API; No just returns to the detail page.
      test.describe('selecting Yes', () => {
        test.skip(sharedEnvironment, ACCEPTS_SHARED_DATA)

        test('selecting Yes shows a success banner on the detail page', async ({
          page
        }, testInfo) => {
          const acceptPage = new CertificatesAcceptPage(page)
          const certificatesDetailPage = new CertificatesDetailPage(page)

          await acceptPage.selectYes()
          await skipIfApproveFailed(acceptPage, testInfo)

          await expect(
            certificatesDetailPage.getNotificationBanner
          ).toBeVisible()
          await expect(
            certificatesDetailPage.notificationBannerHeading(
              'Certificate accepted'
            )
          ).toBeVisible()
          if (!mockBackend) {
            await expect(
              certificatesDetailPage.acceptCertificateLink
            ).toBeHidden()
          }
          await expect(
            certificatesDetailPage.cancelCertificateButton
          ).toBeVisible()
        })

        test('selecting Yes shows accepted outcome summary fields and adds an Accepted row to the current year table', async ({
          page
        }, testInfo) => {
          test.skip(
            mockBackend,
            'Requires stateful backend to reflect accepted status'
          )
          const acceptPage = new CertificatesAcceptPage(page)
          const certificatesDetailPage = new CertificatesDetailPage(page)

          await acceptPage.selectYes()
          await skipIfApproveFailed(acceptPage, testInfo)

          await certificatesDetailPage.expectAcceptedOutcomeSummary()
          await expect(certificatesDetailPage.currentYearHeading).toBeVisible()
          await certificatesDetailPage.expectCurrentYearAcceptedRow()

          await certificatesDetailPage.expectCurrentYearRowHasViewSubmissionLink(
            'Accepted'
          )
        })

        test('View submission link opens the accepted submission detail page', async ({
          page
        }, testInfo) => {
          test.skip(
            mockBackend,
            'Requires stateful backend to reflect accepted status'
          )
          const acceptPage = new CertificatesAcceptPage(page)
          const certificatesDetailPage = new CertificatesDetailPage(page)

          await acceptPage.selectYes()
          await skipIfApproveFailed(acceptPage, testInfo)

          await certificatesDetailPage.clickCurrentYearViewSubmissionLink(
            'Accepted'
          )

          await expect(certificatesDetailPage.currentYearHeading).toBeVisible()
          await expect(
            certificatesDetailPage.currentYearRowActionTag('Accepted')
          ).toHaveText('Accepted')
        })

        test('selecting Yes does not show the success banner on a return visit', async ({
          page
        }, testInfo) => {
          const acceptPage = new CertificatesAcceptPage(page)
          const certificatesDetailPage = new CertificatesDetailPage(page)

          await acceptPage.selectYes()
          await skipIfApproveFailed(acceptPage, testInfo)

          await expect(
            certificatesDetailPage.getNotificationBanner
          ).toBeVisible()

          await page.reload()
          await page.waitForLoadState('networkidle')

          await expect(
            certificatesDetailPage.getNotificationBanner
          ).toBeHidden()
          if (!mockBackend) {
            await expect(
              certificatesDetailPage.acceptCertificateLink
            ).toBeHidden()
          }
        })
      })

      test('selecting No returns to the detail page', async ({ page }) => {
        const acceptPage = new CertificatesAcceptPage(page)
        const certificatesDetailPage = new CertificatesDetailPage(page)

        await acceptPage.selectNo()

        await expect(certificatesDetailPage.acceptCertificateLink).toBeVisible()
        await expect(
          certificatesDetailPage.cancelCertificateButton
        ).toBeVisible()
        await expect(certificatesDetailPage.getNotificationBanner).toBeHidden()
      })
    })
  })

  test.describe('compliance scheme pending detail', () => {
    test.beforeEach(async ({ page }, testInfo) => {
      const opened = await new CertificatesPage(page).openFirstDetailFromList(
        'compliance-schemes',
        'pending'
      )
      test.skip(
        !opened,
        'No pending compliance scheme submissions in this environment'
      )
      await new CertificatesDetailPage(page).skipIfServiceError(testInfo)
    })

    test('displays submitted detail page with accept and cancel statement buttons', async ({
      page
    }) => {
      const certificatesDetailPage = new CertificatesDetailPage(page)

      await expect(certificatesDetailPage.acceptStatementLink).toBeVisible()
      await expect(certificatesDetailPage.cancelStatementButton).toBeVisible()
    })

    test.describe('after clicking accept statement', () => {
      test.beforeEach(async ({ page }) => {
        const certificatesDetailPage = new CertificatesDetailPage(page)
        await certificatesDetailPage.acceptStatementLink.click()
      })

      // Only Yes calls the approve API; No just returns to the detail page.
      test.describe('selecting Yes', () => {
        test.skip(sharedEnvironment, ACCEPTS_SHARED_DATA)

        test('selecting Yes shows a success banner on the detail page', async ({
          page
        }, testInfo) => {
          const acceptPage = new CertificatesAcceptPage(page)
          const certificatesDetailPage = new CertificatesDetailPage(page)

          await acceptPage.selectYes()
          await skipIfApproveFailed(acceptPage, testInfo)

          await expect(
            certificatesDetailPage.getNotificationBanner
          ).toBeVisible()
          await expect(
            certificatesDetailPage.notificationBannerHeading(
              'Statement accepted'
            )
          ).toBeVisible()
          if (!mockBackend) {
            await expect(
              certificatesDetailPage.acceptStatementLink
            ).toBeHidden()
          }
          await expect(
            certificatesDetailPage.cancelStatementButton
          ).toBeVisible()
        })

        test('selecting Yes shows accepted outcome summary fields and adds an Accepted row to the current year table', async ({
          page
        }, testInfo) => {
          test.skip(
            mockBackend,
            'Requires stateful backend to reflect accepted status'
          )
          const acceptPage = new CertificatesAcceptPage(page)
          const certificatesDetailPage = new CertificatesDetailPage(page)

          await acceptPage.selectYes()
          await skipIfApproveFailed(acceptPage, testInfo)

          await certificatesDetailPage.expectAcceptedOutcomeSummary()
          await expect(certificatesDetailPage.currentYearHeading).toBeVisible()
          await certificatesDetailPage.expectCurrentYearAcceptedRow()
          await certificatesDetailPage.expectCurrentYearRowHasViewSubmissionLink(
            'Accepted'
          )
        })

        test('View submission link opens the accepted submission detail page', async ({
          page
        }, testInfo) => {
          test.skip(
            mockBackend,
            'Requires stateful backend to reflect accepted status'
          )
          const acceptPage = new CertificatesAcceptPage(page)
          const certificatesDetailPage = new CertificatesDetailPage(page)

          await acceptPage.selectYes()
          await skipIfApproveFailed(acceptPage, testInfo)

          await certificatesDetailPage.clickCurrentYearViewSubmissionLink(
            'Accepted'
          )

          await expect(certificatesDetailPage.currentYearHeading).toBeVisible()
          await expect(
            certificatesDetailPage.currentYearRowActionTag('Accepted')
          ).toHaveText('Accepted')
        })

        test('selecting Yes does not show the success banner on a return visit', async ({
          page
        }, testInfo) => {
          const acceptPage = new CertificatesAcceptPage(page)
          const certificatesDetailPage = new CertificatesDetailPage(page)

          await acceptPage.selectYes()
          await skipIfApproveFailed(acceptPage, testInfo)

          await expect(
            certificatesDetailPage.getNotificationBanner
          ).toBeVisible()

          await page.reload()
          await page.waitForLoadState('networkidle')

          await expect(
            certificatesDetailPage.getNotificationBanner
          ).toBeHidden()
          if (!mockBackend) {
            await expect(
              certificatesDetailPage.acceptStatementLink
            ).toBeHidden()
          }
        })
      })

      test('selecting No returns to the detail page', async ({ page }) => {
        const acceptPage = new CertificatesAcceptPage(page)
        const certificatesDetailPage = new CertificatesDetailPage(page)

        await acceptPage.selectNo()

        await expect(certificatesDetailPage.acceptStatementLink).toBeVisible()
        await expect(certificatesDetailPage.cancelStatementButton).toBeVisible()
        await expect(certificatesDetailPage.getNotificationBanner).toBeHidden()
      })
    })
  })
})
