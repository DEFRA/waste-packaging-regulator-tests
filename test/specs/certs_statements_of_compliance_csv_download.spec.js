import { test, expect } from '../fixtures.js'
import { CertificatesPage } from '../page-objects/certificates.page.js'

const env = process.env.ENVIRONMENT || 'dev'

// The not-submitted lists on dev/test carry thousands of real records, and that
// CSV doesn't download within the test timeout there. Only exercise those views
// in the mock-data environments (local, github).
const skipNotSubmitted = env === 'dev' || env === 'test'

const downloadViews = [
  { organisationType: 'direct-producers', tab: 'pending' },
  { organisationType: 'direct-producers', tab: 'accepted' },
  { organisationType: 'direct-producers', tab: 'not-submitted' },
  { organisationType: 'compliance-schemes', tab: 'pending' },
  { organisationType: 'compliance-schemes', tab: 'accepted' },
  { organisationType: 'compliance-schemes', tab: 'not-submitted' }
].filter(({ tab }) => !(skipNotSubmitted && tab === 'not-submitted'))

test.describe('Certificates and Statements of Compliance CSV downloads', () => {
  for (const { organisationType, tab } of downloadViews) {
    // One CSV view is enough for the cross-browser smoke subset: the
    // download handling is the same for every tab.
    const tag =
      organisationType === 'direct-producers' && tab === 'pending'
        ? ['@compat']
        : []
    test(
      `${organisationType} ${tab} tab downloads a working CSV`,
      { tag },
      async ({ page }) => {
        const certificatesPage = new CertificatesPage(page)
        const tabCount = await certificatesPage.openListTabWithCount(
          organisationType,
          tab
        )

        // The Excel report replaces these CSV links. Until it is live
        // everywhere, skip where it already is; then delete this spec. Exactly
        // one of the two is expected: both or neither means something is wrong.
        const downloadControl = certificatesPage.downloadCsvButton.or(
          certificatesPage.downloadReportButton
        )
        await expect(downloadControl).toHaveCount(1)
        await expect(downloadControl).toBeVisible()
        test.skip(
          await certificatesPage.downloadReportButton.isVisible(),
          'The Excel report has replaced the CSV downloads here'
        )

        // An empty tab (count 0) still serves a header-only CSV, but has no first
        // row to read or match against, so skip that part of the check.
        const firstRowOrganisationName =
          tabCount === 0
            ? null
            : await certificatesPage.getFirstRowOrganisationName()

        const { download, body } = await certificatesPage.downloadCsv()

        expect(download.suggestedFilename()).toMatch(/\.csv$/)
        expect(body).toContain(
          'Organisation name,Organisation ID,Recycling obligations'
        )

        if (firstRowOrganisationName) {
          expect(body).toContain(firstRowOrganisationName)
        }
      }
    )
  }
})
