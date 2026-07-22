import { test, expect } from '../fixtures.js'
import { CertificatesDetailPage } from '../page-objects/certificates.detail.page.js'
import { CertificatesPage } from '../page-objects/certificates.page.js'

const complianceTypeLabelPattern = /\d{4} (certificate|statement) of compliance/
const submittedDatePattern = /^\d{1,2} \w+ \d{4}( at \d{2}:\d{2})?$/
const detailPageUrlPattern =
  /\/[0-9a-f-]+\/certificates-of-compliance(\/[^/?]+)?/

test.describe('Certificates and Statements of Compliance detail data', () => {
  test.describe('after navigating to a pending compliance scheme detail page', () => {
    test.skip(
      process.env.ENVIRONMENT !== 'local',
      'Depends on a submission with Met recycling obligations existing in shared dev data — only reliable against local mocked data'
    )

    test.beforeEach(async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.openPendingList('compliance-schemes')
      await certificatesPage.firstTableRowLink.click()
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

  test('displays organisation name from the Obligations API snapshot in the H1', async ({
    page
  }) => {
    test.skip(
      process.env.ENVIRONMENT !== 'local',
      'Depends on a submission with Met recycling obligations existing in shared dev data — only reliable against local mocked data'
    )
    const certificatesPage = new CertificatesPage(page)
    const certificatesDetailPage = new CertificatesDetailPage(page)

    await certificatesPage.openPendingList('compliance-schemes')
    const organisationName =
      await certificatesPage.getFirstRowOrganisationName()
    await certificatesPage.firstTableRowLink.click()

    await expect(certificatesDetailPage.organisationNameHeading).toHaveText(
      organisationName
    )
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
      test.skip(
        process.env.ENVIRONMENT !== 'local',
        'Depends on a submission with Met recycling obligations existing in shared dev data — only reliable against local mocked data'
      )

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
    }) => {
      test.skip(
        process.env.ENVIRONMENT !== 'local',
        'Depends on a submission with Met recycling obligations existing in shared dev data — only reliable against local mocked data'
      )
      const certificatesPage = new CertificatesPage(page)
      const certificatesDetailPage = new CertificatesDetailPage(page)

      await certificatesPage.openPendingList('compliance-schemes')
      await certificatesPage.openDetailForRegulation43Tag('Not compliant')

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
    }) => {
      test.skip(
        process.env.ENVIRONMENT !== 'local',
        'Depends on a submission with Met recycling obligations existing in shared dev data — only reliable against local mocked data'
      )
      const certificatesPage = new CertificatesPage(page)
      const certificatesDetailPage = new CertificatesDetailPage(page)

      await certificatesPage.openDirect()
      await certificatesPage.clickComplianceSchemes()
      await certificatesPage.clickAcceptedTab()

      const compliantRowLink =
        certificatesPage.tableRowLinkWithRegulation43Tag('Compliant')
      test.skip(
        (await compliantRowLink.count()) === 0,
        'No accepted compliance scheme with Compliant Regulation 43 status in this environment'
      )

      await compliantRowLink.click()

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

  test.describe('after navigating to a not submitted compliance scheme detail page', () => {
    test('hides submission-only summary rows', async ({ page }, testInfo) => {
      const certificatesPage = new CertificatesPage(page)
      const certificatesDetailPage = new CertificatesDetailPage(page)

      const opened =
        await certificatesPage.openFirstNotSubmittedDetail('compliance-schemes')
      test.skip(
        !opened,
        'No not-submitted compliance scheme items in this environment'
      )

      await certificatesDetailPage.skipIfServiceError(testInfo)

      await certificatesDetailPage.expectHiddenSubmissionOnlyRows()
    })
  })

  test.describe('when the Obligations API returns a 500 error', () => {
    test.skip(
      process.env.ENVIRONMENT !== 'local',
      'only reliable against local mocked data'
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
          body: '<!DOCTYPE html><html lang="en"><body><h1>500</h1><p>Something went wrong</p></body></html>'
        })
      )

      await page.goto(detailUrl)

      await expect(certificatesDetailPage.serviceErrorMessage).toBeVisible()
    })
  })
})
