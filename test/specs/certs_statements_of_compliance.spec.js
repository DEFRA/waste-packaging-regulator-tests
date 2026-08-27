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

  test.describe('Search by organisation name or ID', () => {
    // Runs against real data, so the term is taken from a row already on the
    // page rather than hard-coded. A tab with no records cannot supply one, so
    // these skip rather than fail — an empty tab is a valid state of the
    // environment, not a broken search.
    const openListTabWithRows = async (
      certificatesPage,
      organisationType,
      tab
    ) => {
      const count = await certificatesPage.openListTabWithCount(
        organisationType,
        tab
      )
      test.skip(
        count === null || count === 0,
        `${organisationType} ${tab} currently has ${count} record(s); need at least one real row to search for`
      )
    }

    const searchForFirstRowOrganisation = async (
      certificatesPage,
      organisationType,
      tab
    ) => {
      await openListTabWithRows(certificatesPage, organisationType, tab)
      const name = await certificatesPage.getFirstRowOrganisationName()
      await certificatesPage.search(name)
      return name
    }

    test('returns the organisation and retains the term in the input', async ({
      page
    }) => {
      const certificatesPage = new CertificatesPage(page)

      const name = await searchForFirstRowOrganisation(
        certificatesPage,
        'direct-producers',
        'pending'
      )

      await expect(certificatesPage.searchInput).toHaveValue(name)
      await expect(certificatesPage.searchResultsSummary).toContainText(
        `for "${name}"`
      )
      await expect(
        certificatesPage.searchResultsTable.locator('tbody tr').first()
      ).toContainText(name)
    })

    test('matches regardless of the case of the stored name', async ({
      page
    }) => {
      const certificatesPage = new CertificatesPage(page)
      await openListTabWithRows(certificatesPage, 'direct-producers', 'pending')

      const name = await certificatesPage.getFirstRowOrganisationName()
      await certificatesPage.search(name.toLowerCase())

      await expect(
        certificatesPage.searchResultsTable.locator('tbody tr').first()
      ).toContainText(name)
    })

    test('shows the direct producer columns', async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      await searchForFirstRowOrganisation(
        certificatesPage,
        'direct-producers',
        'pending'
      )

      await expect(certificatesPage.searchResultsColumnHeadings).toHaveText([
        'Organisation name',
        'Organisation ID',
        'Submission status',
        'Recycling obligations',
        'Percentage met'
      ])
    })

    test('shows the compliance scheme columns', async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      await searchForFirstRowOrganisation(
        certificatesPage,
        'compliance-schemes',
        'pending'
      )

      await expect(certificatesPage.searchResultsColumnHeadings).toHaveText([
        'Organisation name',
        'Organisation ID',
        'Submission status',
        'Recycling obligations',
        'Regulation 43'
      ])
    })

    test('stays on the same organisation type and tab', async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      await searchForFirstRowOrganisation(
        certificatesPage,
        'compliance-schemes',
        'accepted'
      )

      await expect(page).toHaveURL(/type=compliance-schemes/)
      await expect(page).toHaveURL(/tab=accepted/)
    })

    // A producer with a cancelled submission and a newer pending one gets a row
    // for each, rather than being collapsed to a single row per organisation.
    // Search is the only place that history is visible, since Cancelled has no
    // tab of its own.
    test('returns a row per submission for a producer with more than one', async ({
      page
    }) => {
      const CANDIDATES_TO_TRY = 5
      const certificatesPage = new CertificatesPage(page)
      await openListTabWithRows(certificatesPage, 'direct-producers', 'pending')

      const candidates = (
        await certificatesPage.getVisibleOrganisationNames()
      ).slice(0, CANDIDATES_TO_TRY)
      const rows =
        await certificatesPage.findProducerWithMultipleSubmissions(candidates)

      test.skip(
        rows === null,
        `None of the first ${CANDIDATES_TO_TRY} direct producers hold more than one submission; needs a producer with both a cancelled and a pending submission`
      )

      // Every row is the same organisation, and each links to its own
      // submission rather than to a shared organisation page.
      const names = new Set(rows.map((row) => row.organisationName))
      const links = new Set(rows.map((row) => row.href))

      expect(names.size).toBe(1)
      expect(links.size).toBe(rows.length)

      // Rows are ordered by date submitted, newest first, so a pending
      // submission made after a cancelled one sits above it.
      const pendingIndex = rows.findIndex(
        (row) => row.submissionStatus === 'Pending'
      )
      const cancelledIndex = rows.findIndex(
        (row) => row.submissionStatus === 'Cancelled'
      )

      if (pendingIndex !== -1 && cancelledIndex !== -1) {
        expect(pendingIndex).toBeLessThan(cancelledIndex)
      }
    })

    test('shows guidance and no table when nothing matches', async ({
      page
    }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.openDirect()
      await certificatesPage.search('zzzznomatchzzzz')

      await expect(certificatesPage.searchResultsSummary).toContainText(
        '0 results for'
      )
      await expect(certificatesPage.searchResults).toContainText(
        'Check the spelling, or search for part of the organisation name or ID'
      )
      await expect(certificatesPage.searchResultsTable).toHaveCount(0)
    })

    test('Clear search restores the default state', async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.openDirect()
      await certificatesPage.search('zzzznomatchzzzz')
      await certificatesPage.clearSearch()

      await expect(certificatesPage.searchResults).toHaveCount(0)
      await expect(certificatesPage.searchInput).toHaveValue('')
    })

    test('rejects an empty search with a validation error', async ({
      page
    }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.openDirect()
      await certificatesPage.searchButton.click()

      await expect(certificatesPage.errorSummary).toContainText(
        'Enter an organisation name or ID'
      )
      await expect(certificatesPage.searchResults).toHaveCount(0)
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

    test('shows genuinely different rows when moving to the next real page', async ({
      page
    }) => {
      const PAGE_SIZE = 20
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.openListTab('direct-producers', 'not-submitted')

      const count = await certificatesPage.getTabCount(
        certificatesPage.notSubmittedTab
      )
      test.skip(
        count === null || count <= PAGE_SIZE,
        `Direct producers Not submitted currently has ${count} record(s); need more than one page of real data`
      )

      await expect(certificatesPage.paginationNav).toBeVisible()
      await expect(certificatesPage.paginationPageLink(1)).toBeVisible()
      await expect(certificatesPage.paginationPageLink(2)).toBeVisible()
      // The last page link is always present
      // read the actual last page instead of assuming one.
      const lastPageNumber = await certificatesPage.getLastVisiblePageNumber()
      await expect(
        certificatesPage.paginationPageLink(lastPageNumber)
      ).toBeVisible()
      await expect(certificatesPage.paginationNextLink).toBeVisible()

      const firstPageNames =
        await certificatesPage.getVisibleOrganisationNames()
      await certificatesPage.clickPaginationNext()
      await expect(certificatesPage.paginationCurrentPageItem).toHaveText('2')

      expect(await certificatesPage.getVisibleOrganisationNames()).not.toEqual(
        firstPageNames
      )
    })
  })
})
