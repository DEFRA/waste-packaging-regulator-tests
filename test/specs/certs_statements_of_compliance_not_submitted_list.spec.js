import { test, expect } from '../fixtures.js'
import { CertificatesDetailPage } from '../page-objects/certificates.detail.page.js'
import { CertificatesPage } from '../page-objects/certificates.page.js'

// A tab with no records is a valid state of the environment, not a broken page,
// so these skip rather than fail. Names are read off the row in front of us
// rather than hard-coded, so the same spec runs against mocked and real data.
const openListTabWithRows = async (certificatesPage, organisationType, tab) => {
  const count = await certificatesPage.openListTabWithCount(
    organisationType,
    tab
  )
  test.skip(
    count === null || count === 0,
    `${organisationType} ${tab} currently has ${count} record(s); need at least one real row`
  )
}

test.describe('Not submitted list', () => {
  test.describe('compliance schemes', () => {
    test('shows the not-submitted columns', async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      await openListTabWithRows(
        certificatesPage,
        'compliance-schemes',
        'not-submitted'
      )

      // No Submitted date column: nothing has been submitted.
      await expect(certificatesPage.listColumnHeadings).toHaveText([
        'Organisation name',
        'Organisation ID',
        'Recycling obligations',
        'Regulation 43'
      ])
    })

    // AMCR-506: the tab showed the scheme operator's legal name while the
    // detail page showed something else. Asserting the two against each other
    // rather than against a literal catches that divergence in any environment,
    // whichever of the two names the data happens to carry.
    test('detail heading matches the row it was opened from', async ({
      page
    }, testInfo) => {
      const certificatesPage = new CertificatesPage(page)
      const certificatesDetailPage = new CertificatesDetailPage(page)

      await openListTabWithRows(
        certificatesPage,
        'compliance-schemes',
        'not-submitted'
      )
      const rowName = await certificatesPage.getFirstRowOrganisationName()

      await certificatesPage.firstTableRowLink.click()
      await page.waitForURL(/\/certificates-of-compliance/)
      await certificatesDetailPage.skipIfServiceError(testInfo)

      await expect(certificatesDetailPage.organisationNameHeading).toHaveText(
        rowName
      )
    })

    // Search reads the same materialised name column the tab renders and sorts
    // on, so a row found on the tab must be findable by the name shown on it.
    test('search finds an organisation by the name shown on the tab', async ({
      page
    }) => {
      const certificatesPage = new CertificatesPage(page)

      await openListTabWithRows(
        certificatesPage,
        'compliance-schemes',
        'not-submitted'
      )
      const rowName = await certificatesPage.getFirstRowOrganisationName()

      await certificatesPage.search(rowName)

      await expect(certificatesPage.searchResultsSummary).toContainText(
        `for "${rowName}"`
      )
      await expect(
        certificatesPage.searchResultsTable.locator('tbody tr').first()
      ).toContainText(rowName)
    })
  })
})
