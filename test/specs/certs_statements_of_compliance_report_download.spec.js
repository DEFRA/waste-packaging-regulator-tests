import { test, expect } from '../fixtures.js'
import { CertificatesPage } from '../page-objects/certificates.page.js'
import { readReport } from '../../utils/excel-report.js'

const reports = [
  {
    organisationType: 'direct-producers',
    document: 'certificate',
    hasRegulation43: false,
    // One report is enough for the cross-browser smoke subset: the download
    // handling is the same for both.
    tag: ['@compat']
  },
  {
    organisationType: 'compliance-schemes',
    document: 'statement',
    hasRegulation43: true,
    tag: []
  }
]

function expectedHeaders(hasRegulation43) {
  return [
    'Organisation name',
    'Organisation ID',
    'Status',
    ...(hasRegulation43 ? ['Regulation 43'] : []),
    'Recycling obligations',
    'Percentage met',
    'Total obligation (tonnes)',
    'Date submitted',
    'Date accepted',
    'Accepted by',
    'Cancellations'
  ]
}

const CANCELLATION_HEADERS = [
  'Date submitted',
  'Date cancelled',
  'Cancelled by',
  'Reason',
  'Status when cancelled'
]

test.describe('Certificates and Statements of Compliance Excel report', () => {
  for (const { organisationType, document, hasRegulation43, tag } of reports) {
    test(
      `${organisationType} downloads a working Excel report`,
      { tag },
      async ({ page }) => {
        const certificatesPage = new CertificatesPage(page)
        const pendingCount = await certificatesPage.openListTabWithCount(
          organisationType,
          'pending'
        )

        // Until the Excel report is live everywhere, an environment may still
        // serve the CSV links instead. Remove this once it is. Exactly one of
        // the two is expected: both or neither means something is wrong.
        const downloadControl = certificatesPage.downloadReportButton.or(
          certificatesPage.downloadCsvButton
        )
        await expect(downloadControl).toHaveCount(1)
        await expect(downloadControl).toBeVisible()
        test.skip(
          await certificatesPage.downloadCsvButton.isVisible(),
          'This environment still serves the CSV downloads'
        )

        const firstRowReference =
          pendingCount === 0
            ? null
            : await certificatesPage.getFirstRowOrganisationReference()

        const { download, body } = await certificatesPage.downloadReport()

        expect(download.suggestedFilename()).toMatch(
          new RegExp(
            `^\\d{4}-${document}s-of-compliance-all-\\d{2}-\\d{2}-\\d{4}\\.xlsx$`
          )
        )

        const report = await readReport(body)
        expect(report.heading).toMatch(
          new RegExp(`^All ${document} of compliance submissions, `)
        )
        // Zero blocks until the cancellation columns are live everywhere.
        const organisationHeaders = expectedHeaders(hasRegulation43)
        const blockCount =
          (report.headers.length - organisationHeaders.length) /
          CANCELLATION_HEADERS.length
        expect(Number.isInteger(blockCount) && blockCount >= 0).toBe(true)
        expect(report.headers).toEqual([
          ...organisationHeaders,
          ...Array.from(
            { length: blockCount },
            () => CANCELLATION_HEADERS
          ).flat()
        ])
        expect(report.blockHeadings).toEqual(
          Array.from({ length: blockCount }, (_, i) => `Cancellation ${i + 1}`)
        )

        // The report lists every organisation, so the first pending one is in it.
        if (firstRowReference) {
          expect(
            report.rows.map((row) => String(row['Organisation ID']))
          ).toContain(firstRowReference)
        }
      }
    )
  }
})
