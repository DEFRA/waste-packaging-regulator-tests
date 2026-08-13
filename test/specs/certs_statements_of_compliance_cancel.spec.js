import { test, expect } from '../fixtures.js'
import { CertificatesDetailPage } from '../page-objects/certificates.detail.page.js'
import { CertificatesPage } from '../page-objects/certificates.page.js'
import { CertificatesCancelReasonPage } from '../page-objects/certificates.cancel-reason.page.js'
import { CertificatesCancelCheckPage } from '../page-objects/certificates.cancel-check.page.js'

// A reason whose recorded label is the same for producers and compliance
// schemes, so the same expected text works for both journeys.
const cancelReasonLabel = 'Recycling obligations changed'

test.describe('Certificates and Statements of Compliance cancel', () => {
  test.describe('cancelling a pending direct producer certificate', () => {
    // The cancel flow mutates the declaration's state. Local and github runs
    // use mocked routes whose state lives only in the session, so each test
    // starts from a fresh pending item; dev shares a single live database and
    // races under parallel execution, so this only runs against local/github.
    test.skip(
      !['local', 'github'].includes(process.env.ENVIRONMENT),
      'Cancel flow mutates shared dev fixture data and races under parallel execution — only reliable against local mocked data'
    )
    test.beforeEach(async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.openDirect()
      await certificatesPage.firstTableRowLink.click()
    })

    test('Cancel certificate button opens the cancellation reason page', async ({
      page
    }) => {
      const certificatesDetailPage = new CertificatesDetailPage(page)
      const reasonPage = new CertificatesCancelReasonPage(page)

      await certificatesDetailPage.cancelCertificateButton.click()

      await expect(reasonPage.reasonHeading).toBeVisible()
      await expect(reasonPage.continueButton).toBeVisible()
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

    test.describe('after choosing a reason', () => {
      test.beforeEach(async ({ page }) => {
        const certificatesDetailPage = new CertificatesDetailPage(page)
        const reasonPage = new CertificatesCancelReasonPage(page)

        await certificatesDetailPage.cancelCertificateButton.click()
        await reasonPage.selectReason(cancelReasonLabel)
      })

      test('shows the confirm and send page with the chosen reason', async ({
        page
      }) => {
        const checkPage = new CertificatesCancelCheckPage(page)

        await expect(checkPage.confirmHeading).toBeVisible()
        await expect(checkPage.summaryRowValue('Cancel reason')).toHaveText(
          cancelReasonLabel
        )
        await expect(checkPage.confirmAndSendButton).toBeVisible()
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

      test('confirming shows the cancelled banner and outcome on the detail page', async ({
        page
      }) => {
        const checkPage = new CertificatesCancelCheckPage(page)
        const certificatesDetailPage = new CertificatesDetailPage(page)

        await checkPage.confirmAndSend()

        await expect(certificatesDetailPage.getNotificationBanner).toBeVisible()
        await expect(
          certificatesDetailPage.notificationBannerHeading(
            'Certificate cancelled'
          )
        ).toBeVisible()
        await certificatesDetailPage.expectCancelledOutcomeSummary(
          cancelReasonLabel
        )
      })

      test('confirming hides the accept and cancel buttons', async ({
        page
      }) => {
        const checkPage = new CertificatesCancelCheckPage(page)
        const certificatesDetailPage = new CertificatesDetailPage(page)

        await checkPage.confirmAndSend()

        await expect(certificatesDetailPage.acceptCertificateLink).toBeHidden()
        await expect(
          certificatesDetailPage.cancelCertificateButton
        ).toBeHidden()
      })

      test('confirming adds a Cancelled row to the current year table', async ({
        page
      }) => {
        const checkPage = new CertificatesCancelCheckPage(page)
        const certificatesDetailPage = new CertificatesDetailPage(page)

        await checkPage.confirmAndSend()

        await expect(certificatesDetailPage.currentYearHeading).toBeVisible()
        await certificatesDetailPage.expectCurrentYearCancelledRow(
          cancelReasonLabel
        )
      })

      test('does not show the cancelled banner on a return visit', async ({
        page
      }) => {
        const checkPage = new CertificatesCancelCheckPage(page)
        const certificatesDetailPage = new CertificatesDetailPage(page)

        await checkPage.confirmAndSend()
        await expect(certificatesDetailPage.getNotificationBanner).toBeVisible()

        await page.reload()
        await page.waitForLoadState('networkidle')

        await expect(certificatesDetailPage.getNotificationBanner).toBeHidden()
        await expect(
          certificatesDetailPage.cancelCertificateButton
        ).toBeHidden()
      })
    })
  })

  test.describe('cancelling a pending compliance scheme statement', () => {
    test.skip(
      !['local', 'github'].includes(process.env.ENVIRONMENT),
      'Cancel flow mutates shared dev fixture data and races under parallel execution — only reliable against local mocked data'
    )
    test.beforeEach(async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.openPendingList('compliance-schemes')
      await certificatesPage.firstTableRowLink.click()
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
        certificatesDetailPage.notificationBannerHeading('Statement cancelled')
      ).toBeVisible()
      await certificatesDetailPage.expectCancelledOutcomeSummary(
        cancelReasonLabel
      )
      await expect(certificatesDetailPage.acceptStatementLink).toBeHidden()
      await expect(certificatesDetailPage.cancelStatementButton).toBeHidden()
    })
  })
})
