import { test, expect } from '../fixtures.js'
import { CertificatesDetailPage } from '../page-objects/certificates.detail.page.js'
import { CertificatesPage } from '../page-objects/certificates.page.js'
import { CertificatesCancelReasonPage } from '../page-objects/certificates.cancel-reason.page.js'
import { CertificatesCancelCheckPage } from '../page-objects/certificates.cancel-check.page.js'

// True when running against a stateless mock — state-dependent assertions are
// guarded or skipped; the cancel flow itself still runs.
const mockBackend = process.env.MOCK_DATA === 'true'

// dev/test share one live database. Read-only tests run everywhere (and skip
// only when the data they need is missing); tests that cancel a
// submission only run against local / github mocked data.
const sharedEnvironment = !['local', 'github'].includes(process.env.ENVIRONMENT)
const CANCELS_SHARED_DATA =
  'Cancels a submission in shared dev/test data — only runs against local / github mocked data'

// A reason whose recorded label is the same for producers and compliance
// schemes, so the same expected text works for both journeys.
const cancelReasonLabel = 'Recycling obligations changed'

// The reason radios differ in wording between journeys for two of the four
// options ("Producer" vs "Compliance scheme"), so each journey has its own list.
const directProducerCancelReasons = [
  'Not signed by correct person',
  'Recycling obligations changed',
  'Producer can meet recycling obligations',
  'Producer requested to cancel'
]

const complianceSchemeCancelReasons = [
  'Not signed by correct person',
  'Recycling obligations changed',
  'Compliance scheme can meet recycling obligations',
  'Compliance scheme requested to cancel'
]

test.describe('Certificates and Statements of Compliance cancel', () => {
  test.describe('cancelling a pending direct producer certificate', () => {
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

    test('continuing without a reason shows an error', async ({ page }) => {
      const certificatesDetailPage = new CertificatesDetailPage(page)
      const reasonPage = new CertificatesCancelReasonPage(page)

      await certificatesDetailPage.cancelCertificateButton.click()
      await reasonPage.continueWithoutReason()

      await expect(reasonPage.errorSummary).toBeVisible()
      await expect(reasonPage.errorSummary).toContainText(
        'Select why you are cancelling this certificate'
      )
    })

    test.describe('for each cancellation reason', () => {
      for (const reason of directProducerCancelReasons) {
        test(`shows "${reason}" as the chosen reason on the confirm and send page`, async ({
          page
        }) => {
          const certificatesDetailPage = new CertificatesDetailPage(page)
          const reasonPage = new CertificatesCancelReasonPage(page)
          const checkPage = new CertificatesCancelCheckPage(page)

          await certificatesDetailPage.cancelCertificateButton.click()
          await reasonPage.selectReason(reason)

          await expect(checkPage.summaryRowValue('Cancel reason')).toHaveText(
            reason
          )
          await expect(checkPage.confirmAndSendButton).toBeVisible()
        })
      }
    })

    test.describe('after choosing a reason', () => {
      test.beforeEach(async ({ page }) => {
        const certificatesDetailPage = new CertificatesDetailPage(page)
        const reasonPage = new CertificatesCancelReasonPage(page)

        await certificatesDetailPage.cancelCertificateButton.click()
        await reasonPage.selectReason(cancelReasonLabel)
      })

      test('Change returns to the reason page with the reason pre-selected', async ({
        page
      }) => {
        const checkPage = new CertificatesCancelCheckPage(page)
        const reasonPage = new CertificatesCancelReasonPage(page)

        await checkPage.changeReasonLink.click()

        await expect(reasonPage.reasonHeading).toBeVisible()
        await expect(reasonPage.reasonRadio(cancelReasonLabel)).toBeChecked()
      })

      // Only Confirm and send calls the cancel API; choosing a reason and
      // Change just move between pages.
      test.describe('confirm and send', () => {
        test.skip(sharedEnvironment, CANCELS_SHARED_DATA)

        test('confirming shows the cancelled banner and outcome on the detail page', async ({
          page
        }) => {
          const checkPage = new CertificatesCancelCheckPage(page)
          const certificatesDetailPage = new CertificatesDetailPage(page)

          await checkPage.confirmAndSend()

          await expect(
            certificatesDetailPage.getNotificationBanner
          ).toBeVisible()
          await expect(
            certificatesDetailPage.notificationBannerHeading(
              'Certificate cancelled'
            )
          ).toBeVisible()
          if (!mockBackend) {
            await certificatesDetailPage.expectCancelledOutcomeSummary(
              cancelReasonLabel
            )
          }
        })

        test('confirming hides the accept and cancel buttons', async ({
          page
        }) => {
          test.skip(
            mockBackend,
            'Requires stateful backend to reflect cancelled status'
          )
          const checkPage = new CertificatesCancelCheckPage(page)
          const certificatesDetailPage = new CertificatesDetailPage(page)

          await checkPage.confirmAndSend()

          await expect(
            certificatesDetailPage.acceptCertificateLink
          ).toBeHidden()
          await expect(
            certificatesDetailPage.cancelCertificateButton
          ).toBeHidden()
        })

        test('confirming adds a Cancelled row to the current year table', async ({
          page
        }) => {
          test.skip(
            mockBackend,
            'Requires stateful backend to reflect cancelled status'
          )
          const checkPage = new CertificatesCancelCheckPage(page)
          const certificatesDetailPage = new CertificatesDetailPage(page)

          await checkPage.confirmAndSend()

          await expect(certificatesDetailPage.currentYearHeading).toBeVisible()
          await certificatesDetailPage.expectCurrentYearCancelledRow(
            cancelReasonLabel
          )
        })

        test('View submission link opens the frozen snapshot of the cancelled submission', async ({
          page
        }) => {
          test.skip(
            mockBackend,
            'Requires stateful backend to reflect cancelled status'
          )
          const checkPage = new CertificatesCancelCheckPage(page)
          const certificatesDetailPage = new CertificatesDetailPage(page)

          await checkPage.confirmAndSend()

          await certificatesDetailPage.clickCurrentYearViewSubmissionLink(
            'Cancelled'
          )

          await expect(certificatesDetailPage.currentYearHeading).toBeVisible()
          await expect(
            certificatesDetailPage.currentYearRowActionTag('Cancelled')
          ).toHaveText('Cancelled')
        })

        test('does not show the cancelled banner on a return visit', async ({
          page
        }) => {
          const checkPage = new CertificatesCancelCheckPage(page)
          const certificatesDetailPage = new CertificatesDetailPage(page)

          await checkPage.confirmAndSend()
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
              certificatesDetailPage.cancelCertificateButton
            ).toBeHidden()
          }
        })
      })
    })
  })

  test.describe('cancelling a pending compliance scheme statement', () => {
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

    test('Cancel statement button opens the cancellation reason page', async ({
      page
    }) => {
      const certificatesDetailPage = new CertificatesDetailPage(page)
      const reasonPage = new CertificatesCancelReasonPage(page)

      await certificatesDetailPage.cancelStatementButton.click()

      await expect(reasonPage.reasonHeading).toBeVisible()
      await expect(reasonPage.continueButton).toBeVisible()
    })

    test.describe('for each cancellation reason', () => {
      for (const reason of complianceSchemeCancelReasons) {
        test(`shows "${reason}" as the chosen reason on the confirm and send page`, async ({
          page
        }) => {
          const certificatesDetailPage = new CertificatesDetailPage(page)
          const reasonPage = new CertificatesCancelReasonPage(page)
          const checkPage = new CertificatesCancelCheckPage(page)

          await certificatesDetailPage.cancelStatementButton.click()
          await reasonPage.selectReason(reason)

          await expect(checkPage.summaryRowValue('Cancel reason')).toHaveText(
            reason
          )
        })
      }
    })

    test.describe('confirm and send', () => {
      test.skip(sharedEnvironment, CANCELS_SHARED_DATA)

      test('confirming shows the statement cancelled banner and outcome', async ({
        page
      }) => {
        const certificatesDetailPage = new CertificatesDetailPage(page)
        const reasonPage = new CertificatesCancelReasonPage(page)
        const checkPage = new CertificatesCancelCheckPage(page)

        await certificatesDetailPage.cancelStatementButton.click()
        await reasonPage.selectReason(cancelReasonLabel)
        await checkPage.confirmAndSend()

        await expect(certificatesDetailPage.getNotificationBanner).toBeVisible()
        await expect(
          certificatesDetailPage.notificationBannerHeading(
            'Statement cancelled'
          )
        ).toBeVisible()
        if (!mockBackend) {
          await certificatesDetailPage.expectCancelledOutcomeSummary(
            cancelReasonLabel
          )
          await expect(certificatesDetailPage.acceptStatementLink).toBeHidden()
          await expect(
            certificatesDetailPage.cancelStatementButton
          ).toBeHidden()
        }
      })

      test('View submission link opens the frozen snapshot of the cancelled submission', async ({
        page
      }) => {
        test.skip(
          mockBackend,
          'Requires stateful backend to reflect cancelled status'
        )
        const certificatesDetailPage = new CertificatesDetailPage(page)
        const reasonPage = new CertificatesCancelReasonPage(page)
        const checkPage = new CertificatesCancelCheckPage(page)

        await certificatesDetailPage.cancelStatementButton.click()
        await reasonPage.selectReason(cancelReasonLabel)
        await checkPage.confirmAndSend()

        await certificatesDetailPage.clickCurrentYearViewSubmissionLink(
          'Cancelled'
        )

        await expect(certificatesDetailPage.currentYearHeading).toBeVisible()
        await expect(
          certificatesDetailPage.currentYearRowActionTag('Cancelled')
        ).toHaveText('Cancelled')
      })
    })
  })
})
