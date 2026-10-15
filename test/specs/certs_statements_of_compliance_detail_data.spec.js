import { test, expect } from '../fixtures.js'
import { CertificatesDetailPage } from '../page-objects/certificates.detail.page.js'
import { CertificatesPage } from '../page-objects/certificates.page.js'

const complianceTypeLabelPattern = /\d{4} (certificate|statement) of compliance/
const submittedDatePattern = /^\d{1,2} \w+ \d{4}( at \d{2}:\d{2})?$/
const detailPageUrlPattern =
  /\/certificates-of-compliance\/[0-9a-f-]+\/(certificate|statement)\/[^/?]+/

test.describe('Certificates and Statements of Compliance detail data', () => {
  test.describe('after navigating to a pending compliance scheme detail page', () => {
    // Read-only, so it runs in every environment — it only skips when there
    // is no pending compliance scheme to open, or its detail page errors.
    test.beforeEach(async ({ page }, testInfo) => {
      const certificatesPage = new CertificatesPage(page)
      const count = await certificatesPage.openListTabWithCount(
        'compliance-schemes',
        'pending'
      )
      test.skip(
        !count,
        'No pending compliance scheme submissions in this environment'
      )

      await certificatesPage.firstTableRowLink.click()
      await page.waitForURL(detailPageUrlPattern)
      await new CertificatesDetailPage(page).skipIfServiceError(testInfo)
    })

    test('loads submission data when the detail page is opened', async ({
      page
    }) => {
      const certificatesDetailPage = new CertificatesDetailPage(page)

      await expect(page).toHaveURL(detailPageUrlPattern)
      await expect(certificatesDetailPage.organisationNameHeading).toBeVisible()
      await expect(certificatesDetailPage.complianceTypeLabel).toBeVisible()
      await expect(certificatesDetailPage.submittedOnValue).toBeVisible()
    })

    test('displays the compliance year label dynamically', async ({ page }) => {
      const certificatesDetailPage = new CertificatesDetailPage(page)

      await expect(certificatesDetailPage.complianceTypeLabel).toHaveText(
        complianceTypeLabelPattern
      )
    })

    test('displays submitted date in the correct format', async ({ page }) => {
      const certificatesDetailPage = new CertificatesDetailPage(page)

      await expect(certificatesDetailPage.submittedOnValue).toHaveText(
        submittedDatePattern
      )
    })
  })

  test.describe('Recycling obligations status tags', () => {
    test('displays a red Not met tag when obligations are not met', async ({
      page
    }) => {
      const certificatesPage = new CertificatesPage(page)
      const certificatesDetailPage = new CertificatesDetailPage(page)

      const found =
        await certificatesPage.openDetailForRecyclingTagFromAnyList('Not met')
      test.skip(
        !found,
        'No submission with Not met recycling obligations in this environment'
      )

      test.skip(
        await certificatesDetailPage.serviceErrorMessage.isVisible(),
        'Detail page returned a service error in this environment'
      )

      const tag = certificatesDetailPage.recyclingObligationsSummaryTag

      await expect(tag).toHaveText('Not met')
      await expect(tag).toHaveClass(/govuk-tag--red/)
    })

    test('displays a green Met tag when obligations are met', async ({
      page
    }) => {
      const certificatesPage = new CertificatesPage(page)
      const certificatesDetailPage = new CertificatesDetailPage(page)

      const found =
        await certificatesPage.openDetailForRecyclingTagFromAnyList('Met')
      test.skip(
        !found,
        'No submission with Met recycling obligations in this environment'
      )

      test.skip(
        await certificatesDetailPage.serviceErrorMessage.isVisible(),
        'Detail page returned a service error in this environment'
      )

      const tag = certificatesDetailPage.recyclingObligationsSummaryTag

      await expect(tag).toHaveText('Met')
      await expect(tag).toHaveClass(/govuk-tag--green/)
    })
  })

  test.describe('Compliance schemes Regulation 43 status tags', () => {
    test('displays a red Not compliant tag when Regulation 43 is not met', async ({
      page
    }, testInfo) => {
      const certificatesPage = new CertificatesPage(page)
      const certificatesDetailPage = new CertificatesDetailPage(page)

      const found =
        await certificatesPage.openDetailForRegulation43TagFromAnyList(
          'Not compliant'
        )
      test.skip(
        !found,
        'No compliance scheme with Not compliant Regulation 43 status in this environment'
      )
      await certificatesDetailPage.skipIfServiceError(testInfo)

      const reg43Row = certificatesDetailPage.summaryListRow('Regulation 43')
      test.skip(
        !(await reg43Row.isVisible()),
        'Regulation 43 detail field is not yet available in this environment'
      )

      const tag = certificatesDetailPage.summaryRowTag('Regulation 43')

      await expect(tag).toHaveText('Not compliant')
      await expect(tag).toHaveClass(/govuk-tag--red/)
    })

    test('displays a green Compliant tag when Regulation 43 is met', async ({
      page
    }, testInfo) => {
      const certificatesPage = new CertificatesPage(page)
      const certificatesDetailPage = new CertificatesDetailPage(page)

      const found =
        await certificatesPage.openDetailForRegulation43TagFromAnyList(
          'Compliant'
        )
      test.skip(
        !found,
        'No compliance scheme with Compliant Regulation 43 status in this environment'
      )
      await certificatesDetailPage.skipIfServiceError(testInfo)

      const reg43Row = certificatesDetailPage.summaryListRow('Regulation 43')
      test.skip(
        !(await reg43Row.isVisible()),
        'Regulation 43 detail field is not yet available in this environment'
      )

      const tag = certificatesDetailPage.summaryRowTag('Regulation 43')

      await expect(tag).toHaveText('Compliant')
      await expect(tag).toHaveClass(/govuk-tag--green/)
    })
  })

  test.describe('when the Obligations API returns a 500 error', () => {
    test.skip(
      !['local', 'github'].includes(process.env.ENVIRONMENT),
      'only reliable against local / github mocked data'
    )
    test('shows a service error page', async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      const certificatesDetailPage = new CertificatesDetailPage(page)

      await certificatesPage.openPendingList('compliance-schemes')

      const detailUrl = new URL(
        await certificatesPage.firstTableRowLink.getAttribute('href'),
        page.url()
      ).href

      await page.route(detailUrl, (route) =>
        route.fulfill({
          status: 500,
          contentType: 'text/html',
          body: '<!DOCTYPE html><html lang="en"><body><h1>Sorry, there is a problem with the service</h1><p>Try again later.</p></body></html>'
        })
      )

      await page.goto(detailUrl)

      await expect(certificatesDetailPage.serviceErrorMessage).toBeVisible()
    })
  })
})
