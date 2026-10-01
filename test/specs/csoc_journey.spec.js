import { test, expect } from '../fixtures.js'
import { CertificatesPage } from '../page-objects/certificates.page.js'
import { CertificatesDetailPage } from '../page-objects/certificates.detail.page.js'
import { CertificatesAcceptPage } from '../page-objects/certificates.accept.page.js'
import { CertificatesCancelReasonPage } from '../page-objects/certificates.cancel-reason.page.js'
import { CertificatesCancelCheckPage } from '../page-objects/certificates.cancel-check.page.js'
import { HomePage } from '../page-objects/home.page.js'

// This file walks every distinct screen in the certificates/statements of
// compliance journey, one test per screen — built for the accessibility
// profile (the axe-core scan fixtures.js runs automatically after each
// test), the security profile (ZAP passive-scan coverage of every screen,
// not just whichever ones the functional specs happen to end on), and the
// compatibility profile (the same per-screen coverage across the
// BrowserStack browser/OS matrix). Assertions here only confirm the right
// screen loaded; functional behaviour for these journeys is covered by the
// other spec files. playwright.config.js matches this file by its exact
// path and runs it exclusively under those three profiles — functional is
// the only profile that excludes it.

const ORGANISATION_TYPES = ['direct-producers', 'compliance-schemes']
const SUBMISSION_TABS = ['pending', 'accepted', 'not-submitted']
const CANCEL_REASON = 'Recycling obligations changed'

test.describe('Screens — certificates list', () => {
  for (const organisationType of ORGANISATION_TYPES) {
    for (const tab of SUBMISSION_TABS) {
      test(`${organisationType} -> ${tab}`, async ({ page }) => {
        const certificatesPage = new CertificatesPage(page)
        const certificatesDetailPage = new CertificatesDetailPage(page)
        const count = await certificatesPage.openListTabWithCount(
          organisationType,
          tab
        )
        test.skip(
          count === null || count === 0,
          `${organisationType} ${tab} currently has no records in this environment`
        )
        await expect(certificatesPage.pageHeading).toBeVisible()
        await certificatesPage.firstTableRowLink.click()
        await expect(
          certificatesDetailPage.organisationNameHeading
        ).toBeVisible()
      })
    }
  }
})

test.describe('Screens — search', () => {
  test.beforeEach(async ({ page }) => {
    const certificatesPage = new CertificatesPage(page)
    await certificatesPage.openDirect()
  })

  test('results found', async ({ page }) => {
    const certificatesPage = new CertificatesPage(page)
    const count = await certificatesPage.openListTabWithCount(
      'direct-producers',
      'pending'
    )
    test.skip(
      count === null || count === 0,
      'direct-producers pending currently has no records to search for'
    )

    const name = await certificatesPage.getFirstRowOrganisationName()
    await certificatesPage.search(name)

    await expect(certificatesPage.searchResultsTable).toBeVisible()
  })

  test('no results', async ({ page }) => {
    const certificatesPage = new CertificatesPage(page)
    await certificatesPage.search('zzzznomatchzzzz')

    await expect(certificatesPage.searchResults).toContainText('0 results for')
  })

  test('validation error', async ({ page }) => {
    const certificatesPage = new CertificatesPage(page)
    await certificatesPage.searchButton.click()

    await expect(certificatesPage.errorSummary).toBeVisible()
  })
})

// Accept/cancel mutate the declaration they touch. Local and github runs use
// mocked routes whose state lives only in the session, so each test starts
// from a fresh pending item; dev shares a single live database and races
// under parallel execution, so these only run against local/github — same
// restriction the functional accept/cancel specs use.
test.describe('Screens — accept flow', () => {
  test.skip(
    !['local', 'github'].includes(process.env.ENVIRONMENT),
    'Accept flow mutates shared dev fixture data and races under parallel execution — only reliable against local / github mocked data'
  )

  test('accept confirmation', async ({ page }) => {
    const certificatesPage = new CertificatesPage(page)
    const certificatesDetailPage = new CertificatesDetailPage(page)
    const certificatesAcceptPage = new CertificatesAcceptPage(page)

    await certificatesPage.openDirect()
    await certificatesPage.firstTableRowLink.click()
    await certificatesDetailPage.acceptCertificateLink.click()

    await expect(certificatesAcceptPage.yesRadio).toBeVisible()
    await expect(certificatesAcceptPage.noRadio).toBeVisible()
  })
})

test.describe('Screens — cancel flow', () => {
  test.skip(
    !['local', 'github'].includes(process.env.ENVIRONMENT),
    'Cancel flow mutates shared dev fixture data and races under parallel execution — only reliable against local / github mocked data'
  )

  test.beforeEach(async ({ page }) => {
    const certificatesPage = new CertificatesPage(page)
    await certificatesPage.openDirect()
    await certificatesPage.firstTableRowLink.click()
  })

  test('reason selection - confirm and send', async ({ page }) => {
    const certificatesDetailPage = new CertificatesDetailPage(page)
    const reasonPage = new CertificatesCancelReasonPage(page)
    const checkPage = new CertificatesCancelCheckPage(page)

    await certificatesDetailPage.cancelCertificateButton.click()
    await expect(reasonPage.reasonHeading).toBeVisible()
    await reasonPage.selectReason(CANCEL_REASON)
    await expect(checkPage.confirmHeading).toBeVisible()
  })
})

// Continuing without a reason only triggers a client-side validation error —
// it never submits a cancellation, so unlike the rest of the cancel flow
// this doesn't touch the declaration and is safe to run in every
// environment, not just local/github mocked data.
test.describe('Screens — cancel flow validation', () => {
  test.beforeEach(async ({ page }) => {
    const certificatesPage = new CertificatesPage(page)
    await certificatesPage.openDirect()
    await certificatesPage.firstTableRowLink.click()
  })

  test('reason validation error', async ({ page }) => {
    const certificatesDetailPage = new CertificatesDetailPage(page)
    const reasonPage = new CertificatesCancelReasonPage(page)

    await certificatesDetailPage.cancelCertificateButton.click()
    await reasonPage.continueWithoutReason()

    await expect(reasonPage.errorSummary).toBeVisible()
  })
})
