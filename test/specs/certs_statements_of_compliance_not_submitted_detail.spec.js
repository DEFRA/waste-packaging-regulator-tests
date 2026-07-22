import { test, expect } from '../fixtures.js'
import { CertificatesDetailPage } from '../page-objects/certificates.detail.page.js'
import { CertificatesPage } from '../page-objects/certificates.page.js'

const notSubmittedDetailUrlPattern =
  /\/[0-9a-f-]+\/certificates-of-compliance\?obligationYear=\d{4}$/

async function openNotSubmittedDetail(page, organisationType, testInfo) {
  const certificatesPage = new CertificatesPage(page)
  const certificatesDetailPage = new CertificatesDetailPage(page)

  const opened =
    await certificatesPage.openFirstNotSubmittedDetail(organisationType)

  test.skip(
    !opened,
    `No not-submitted ${organisationType.replace('-', ' ')} items in this environment`
  )

  await certificatesDetailPage.skipIfServiceError(testInfo)

  return { certificatesPage, certificatesDetailPage }
}

test.describe('Not submitted detail page', () => {
  test.describe('direct producers', () => {
    test.beforeEach(async ({ page }, testInfo) => {
      await openNotSubmittedDetail(page, 'direct-producers', testInfo)
    })

    test('opens from the not submitted list without a declaration id in the URL', async ({
      page
    }) => {
      await expect(page).toHaveURL(notSubmittedDetailUrlPattern)
    })

    test('shows a grey Not submitted submission status tag', async ({
      page
    }) => {
      const certificatesDetailPage = new CertificatesDetailPage(page)

      await certificatesDetailPage.expectNotSubmittedSubmissionStatus()
    })

    test('hides Submitted on, Name on account, and Declaration', async ({
      page
    }) => {
      const certificatesDetailPage = new CertificatesDetailPage(page)

      await certificatesDetailPage.expectHiddenSubmissionOnlyRows()
    })

    test('shows the not submitted certificate inset message', async ({
      page
    }) => {
      const certificatesDetailPage = new CertificatesDetailPage(page)

      await expect(certificatesDetailPage.insetText).toContainText(
        'This certificate is not submitted so the information will update if changed by the producer.'
      )
    })

    test('shows live recycling obligations status without an Unsubmitted tag', async ({
      page
    }) => {
      const certificatesDetailPage = new CertificatesDetailPage(page)

      await certificatesDetailPage.expectLiveRecyclingObligationsStatus()
    })

    test('does not show the Regulation 43 section', async ({ page }) => {
      const certificatesDetailPage = new CertificatesDetailPage(page)

      await expect(certificatesDetailPage.regulation43Section).toHaveCount(0)
      await expect(
        certificatesDetailPage.summaryListRow('Regulation 43')
      ).toHaveCount(0)
    })
  })

  test.describe('compliance schemes', () => {
    test.beforeEach(async ({ page }, testInfo) => {
      await openNotSubmittedDetail(page, 'compliance-schemes', testInfo)
    })

    test('opens from the not submitted list without a declaration id in the URL', async ({
      page
    }) => {
      await expect(page).toHaveURL(notSubmittedDetailUrlPattern)
    })

    test('shows a grey Not submitted submission status tag', async ({
      page
    }) => {
      const certificatesDetailPage = new CertificatesDetailPage(page)

      await certificatesDetailPage.expectNotSubmittedSubmissionStatus()
    })

    test('hides Submitted on, Name on account, and Declaration', async ({
      page
    }) => {
      const certificatesDetailPage = new CertificatesDetailPage(page)

      await certificatesDetailPage.expectHiddenSubmissionOnlyRows()
    })

    test('shows the not submitted statement inset message', async ({
      page
    }) => {
      const certificatesDetailPage = new CertificatesDetailPage(page)

      await expect(certificatesDetailPage.insetText).toContainText(
        'This statement is not submitted so the information will update if changed by the compliance scheme.'
      )
    })

    test('shows live recycling obligations status without an Unsubmitted tag', async ({
      page
    }) => {
      const certificatesDetailPage = new CertificatesDetailPage(page)

      await certificatesDetailPage.expectLiveRecyclingObligationsStatus()
    })

    test('shows No data for Regulation 43 in the summary and section', async ({
      page
    }) => {
      const certificatesDetailPage = new CertificatesDetailPage(page)

      await expect(
        certificatesDetailPage.summaryListRow('Regulation 43')
      ).toBeVisible()
      await expect(
        certificatesDetailPage.summaryRowValue('Regulation 43')
      ).toHaveText('No data')
      await expect(certificatesDetailPage.regulation43Section).toBeVisible()
      await expect(certificatesDetailPage.regulation43Section).toContainText(
        'No data'
      )
    })
  })
})
