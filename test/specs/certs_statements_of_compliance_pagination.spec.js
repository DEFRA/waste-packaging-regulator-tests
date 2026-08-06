import { test, expect } from '../fixtures.js'
import { CertificatesPage } from '../page-objects/certificates.page.js'
import { CertificatesDetailPage } from '../page-objects/certificates.detail.page.js'

// waste-packaging-regulators-fe/.../certificatesOfCompliance/common/constants.js
// The AC text says 50; the app actually paginates at 20. Use the real value.
const PAGE_SIZE = 20

// Under useMockApi, getComplianceList() always returns totalPages: 9 for every
// organisationType/tab combination, and the same fixed items regardless of
// requested page (confirmed by source + manual testing). That makes mock mode
// reliable for pagination *mechanics* (this file's first describe block) but
// not for asserting real content changes or that totalPages reflects a real
// count (second describe block, gated to ENVIRONMENT=dev).
async function expectPaginationWindow(certificatesPage, { pages, ellipses }) {
  await expect(certificatesPage.paginationNav).toBeVisible()
  expect(await certificatesPage.getVisiblePageNumbers()).toEqual(pages)
  await expect(certificatesPage.paginationEllipses).toHaveCount(ellipses)
}

test.describe('Certificates of compliance pagination', () => {
  test.describe('pagination mechanics (reliable under mock — every tab reports totalPages=9)', () => {
    test.skip(
      process.env.ENVIRONMENT === 'dev',
      'Assumes the mock-only guarantee of totalPages=9 for every tab (e.g. page 9 always exists) — not true against dev, where totalPages reflects real, usually much larger or smaller, record counts'
    )

    test('renders full pagination controls when a tab reports more than one page', async ({
      page
    }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.openListTab('direct-producers', 'pending')

      await expect(certificatesPage.paginationNav).toBeVisible()
      await expect(certificatesPage.paginationPageLink(1)).toBeVisible()
      await expect(certificatesPage.paginationPageLink(2)).toBeVisible()
      await expect(certificatesPage.paginationPageLink(9)).toBeVisible()
      await expect(certificatesPage.paginationNextLink).toBeVisible()
    })

    test('hides Previous and shows Next on the first page', async ({
      page
    }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.openListTab('direct-producers', 'pending')

      await expect(certificatesPage.paginationPreviousLink).toHaveCount(0)
      await expect(certificatesPage.paginationNextLink).toBeVisible()
    })

    test('hides Next and shows Previous on the last page', async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      // Page 9 (the last page under mock's fixed totalPages=9) is always
      // directly linked regardless of current page, so this needs no
      // intermediate navigation.
      await certificatesPage.openListTabAtPage('direct-producers', 'pending', 9)

      await expect(certificatesPage.paginationNextLink).toHaveCount(0)
      await expect(certificatesPage.paginationPreviousLink).toBeVisible()
    })

    test('clicking Next advances from page 1 to page 2', async ({ page }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.openListTab('direct-producers', 'pending')

      await certificatesPage.clickPaginationNext()

      await expect(page).toHaveURL(/page=2/)
      await expect(certificatesPage.paginationCurrentPageItem).toHaveText('2')
      await expect(certificatesPage.paginationPreviousLink).toBeVisible()

      // A row link on a paginated page should still lead to a working detail
      // page — this doesn't depend on mock mode's known "same rows on every
      // page" limitation, it's just confirming pagination hasn't broken the
      // row links themselves.
      const certificatesDetailPage = new CertificatesDetailPage(page)
      await certificatesPage.firstTableRowLink.click()

      await expect(certificatesDetailPage.organisationNameHeading).toBeVisible()
      await expect(certificatesDetailPage.serviceErrorMessage).toBeHidden()
    })

    test('clicking a specific page number navigates directly to that page', async ({
      page
    }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.openListTab('direct-producers', 'pending')

      // Page 1's pagination only ever exposes "1 2 ... 9" — page 3 has no
      // direct link from page 1, confirmed both by reading the windowing
      // macro and by hitting a real click timeout during manual testing.
      // The genuine click path a user has is page 1 -> 2 -> 3.
      await certificatesPage.clickPaginationPage(2)
      await certificatesPage.clickPaginationPage(3)

      await expect(page).toHaveURL(/type=direct-producers.*tab=pending.*page=3/)
      await expect(certificatesPage.paginationCurrentPageItem).toHaveText('3')
      await expect(certificatesPage.paginationPageLink(3)).toHaveAttribute(
        'aria-current',
        'page'
      )
    })

    test('switching tabs resets pagination back to page 1', async ({
      page
    }) => {
      const certificatesPage = new CertificatesPage(page)
      // Precondition ("Given I am on page 3") set up via direct navigation,
      // not by clicking through pagination — page 3 isn't reachable in one
      // click from page 1, and the click mechanism itself is already covered
      // by the previous test. This test is about the tab switch.
      await certificatesPage.openListTabAtPage(
        'compliance-schemes',
        'pending',
        3
      )
      await expect(page).toHaveURL(/page=3/)

      await certificatesPage.clickAcceptedTab()

      await expect(page).toHaveURL(/type=compliance-schemes.*tab=accepted/)
      await expect(page).not.toHaveURL(/page=/)
      // Every tab hardcodes totalPages=9 under mock, so pagination re-renders
      // here regardless of which tab we land on.
      await expect(certificatesPage.paginationNav).toBeVisible()
      await expect(certificatesPage.paginationCurrentPageItem).toHaveText('1')
    })

    // The windowing algorithm in pagination/template.njk is hand-rolled, not
    // the standard govuk-frontend macro. Each expected window below was
    // confirmed against real screenshots taken during manual AC verification
    // (both locally and on dev) — this is deterministic under mock since
    // totalPages=9 is a hardcoded constant.
    test.describe('ellipsis windowing across the mock 9-page range', () => {
      test('page 1 of 9: shows 1, 2 ... 9', async ({ page }) => {
        const certificatesPage = new CertificatesPage(page)
        await certificatesPage.openListTab('direct-producers', 'pending')
        await expectPaginationWindow(certificatesPage, {
          pages: [1, 2, 9],
          ellipses: 1
        })
      })

      test('page 4 of 9: shows 1, 2, 3, 4, 5 ... 9 (no left ellipsis yet)', async ({
        page
      }) => {
        const certificatesPage = new CertificatesPage(page)
        await certificatesPage.openListTabAtPage(
          'direct-producers',
          'pending',
          4
        )
        await expectPaginationWindow(certificatesPage, {
          pages: [1, 2, 3, 4, 5, 9],
          ellipses: 1
        })
      })

      test('page 5 of 9: shows 1 ... 4, 5, 6 ... 9 (both ellipses present)', async ({
        page
      }) => {
        const certificatesPage = new CertificatesPage(page)
        await certificatesPage.openListTabAtPage(
          'direct-producers',
          'pending',
          5
        )
        await expectPaginationWindow(certificatesPage, {
          pages: [1, 4, 5, 6, 9],
          ellipses: 2
        })
      })

      test('page 7 of 9: shows 1 ... 6, 7, 8, 9 (right side merges into the end)', async ({
        page
      }) => {
        const certificatesPage = new CertificatesPage(page)
        await certificatesPage.openListTabAtPage(
          'direct-producers',
          'pending',
          7
        )
        await expectPaginationWindow(certificatesPage, {
          pages: [1, 6, 7, 8, 9],
          ellipses: 1
        })
      })

      test('page 9 of 9 (last page): shows 1 ... 8, 9', async ({ page }) => {
        const certificatesPage = new CertificatesPage(page)
        await certificatesPage.openListTabAtPage(
          'direct-producers',
          'pending',
          9
        )
        await expectPaginationWindow(certificatesPage, {
          pages: [1, 8, 9],
          ellipses: 1
        })
      })
    })
  })

  test.describe('pagination against real data (mock hardcodes totalPages=9 for every tab, so these can only be observed against dev)', () => {
    test.skip(
      process.env.ENVIRONMENT !== 'dev',
      'Requires real, non-mock pagination — mock always returns totalPages=9 and the same fixed items for every page'
    )

    test('hides pagination when a tab has 20 or fewer real results', async ({
      page
    }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.openListTab('direct-producers', 'pending')

      const count = await certificatesPage.getTabCount(
        certificatesPage.pendingTab
      )
      test.skip(
        count === null || count > PAGE_SIZE,
        `Direct producers Pending currently has ${count} record(s); need a tab with <= ${PAGE_SIZE} real results to exercise this scenario`
      )

      await expect(certificatesPage.paginationNav).toHaveCount(0)
    })

    test('shows genuinely different rows when moving to the next real page', async ({
      page
    }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.openListTab('direct-producers', 'not-submitted')

      const count = await certificatesPage.getTabCount(
        certificatesPage.notSubmittedTab
      )
      test.skip(
        count === null || count <= PAGE_SIZE,
        `Direct producers Not submitted currently has ${count} record(s); need more than one page of real data`
      )

      const firstPageNames =
        await certificatesPage.getVisibleOrganisationNames()
      await certificatesPage.clickPaginationNext()
      await expect(certificatesPage.paginationCurrentPageItem).toHaveText('2')

      expect(await certificatesPage.getVisibleOrganisationNames()).not.toEqual(
        firstPageNames
      )
    })

    test('computes total pages from the real dataset size, not the mock constant', async ({
      page
    }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.openListTab('direct-producers', 'not-submitted')

      const count = await certificatesPage.getTabCount(
        certificatesPage.notSubmittedTab
      )
      test.skip(
        count === null || count <= PAGE_SIZE,
        `Direct producers Not submitted currently has ${count} record(s); no pagination to verify totalPages against`
      )

      const expectedTotalPages = Math.ceil(count / PAGE_SIZE)
      expect(await certificatesPage.getLastVisiblePageNumber()).toBe(
        expectedTotalPages
      )
    })
  })

  test.describe('sorting', () => {
    test('sorting a column resets pagination to page 1', async () => {
      test.fixme(
        true,
        'No sortable column headers exist on the listings page yet — a DOM query for th a, th button, [aria-sort] returns 0 matches on both local and dev. Nothing to click for this scenario until sorting ships.'
      )
    })
  })
})
