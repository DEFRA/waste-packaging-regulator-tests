import { test, expect } from '../fixtures.js'
import { CertificatesPage } from '../page-objects/certificates.page.js'

const FILENAME_TIMESTAMP = '\\d{4}-\\d{2}-\\d{2}-\\d{2}-\\d{2}-\\d{2}'
const BASE_COLUMNS = [
  'Organisation name',
  'Organisation ID',
  'Recycling obligations'
]

test.describe('Certificates and Statements of Compliance — CSV download', () => {
  test('Direct producers Accepted downloads a certificates CSV with a Date submitted column', async ({
    page
  }) => {
    const certificatesPage = new CertificatesPage(page)
    await certificatesPage.openListTab('direct-producers', 'accepted')

    const { filename, headers } = await certificatesPage.downloadCsv()

    expect(filename).toMatch(
      new RegExp(
        `^2026-certificates-of-compliance-accepted-${FILENAME_TIMESTAMP}\\.csv$`
      )
    )
    expect(headers).toEqual([
      ...BASE_COLUMNS,
      'Percentage met',
      'Date submitted'
    ])
  })

  test('Direct producers Not submitted omits the Date submitted column', async ({
    page
  }) => {
    const certificatesPage = new CertificatesPage(page)
    await certificatesPage.openListTab('direct-producers', 'not-submitted')

    const { filename, headers } = await certificatesPage.downloadCsv()

    expect(filename).toMatch(
      new RegExp(
        `^2026-certificates-of-compliance-not-submitted-${FILENAME_TIMESTAMP}\\.csv$`
      )
    )
    expect(headers).toEqual([...BASE_COLUMNS, 'Percentage met'])
  })

  test('Compliance schemes Pending downloads a statements CSV with a Regulation 43 column', async ({
    page
  }) => {
    const certificatesPage = new CertificatesPage(page)
    await certificatesPage.openListTab('compliance-schemes', 'pending')

    const { filename, headers } = await certificatesPage.downloadCsv()

    expect(filename).toMatch(
      new RegExp(
        `^2026-statements-of-compliance-pending-${FILENAME_TIMESTAMP}\\.csv$`
      )
    )
    expect(headers).toEqual([
      ...BASE_COLUMNS,
      'Regulation 43',
      'Date submitted'
    ])
  })

  test('CSV contains every row for the tab, not just the current page', async ({
    page
  }) => {
    const certificatesPage = new CertificatesPage(page)
    await certificatesPage.openListTab('direct-producers', 'not-submitted')

    const tabCount = await certificatesPage.getTabCount(
      certificatesPage.notSubmittedTab
    )
    test.skip(tabCount === null, 'Not submitted tab count is not shown')

    const { dataRowCount } = await certificatesPage.downloadCsv()

    expect(dataRowCount).toBe(tabCount)
  })

  // Scenario 6: an empty tab still offers the download, producing a header-only
  // file. Only runs where the environment happens to have an empty tab.
  test('Empty tab downloads a header-only CSV', async ({ page }) => {
    const certificatesPage = new CertificatesPage(page)
    await certificatesPage.openListTab('direct-producers', 'accepted')

    const tabCount = await certificatesPage.getTabCount(
      certificatesPage.acceptedTab
    )
    test.skip(
      tabCount !== 0,
      `Accepted tab has ${tabCount} record(s); Scenario 6 needs an empty tab`
    )

    await expect(certificatesPage.downloadCsvButton).toBeVisible()
    const { dataRowCount } = await certificatesPage.downloadCsv()

    expect(dataRowCount).toBe(0)
  })
})
