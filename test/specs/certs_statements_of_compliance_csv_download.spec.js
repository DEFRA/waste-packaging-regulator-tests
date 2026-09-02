import { test, expect } from '../fixtures.js'
import { CertificatesPage } from '../page-objects/certificates.page.js'

const downloadViews = [
  { organisationType: 'direct-producers', tab: 'pending' },
  { organisationType: 'direct-producers', tab: 'accepted' },
  { organisationType: 'direct-producers', tab: 'not-submitted' },
  { organisationType: 'compliance-schemes', tab: 'pending' },
  { organisationType: 'compliance-schemes', tab: 'accepted' },
  { organisationType: 'compliance-schemes', tab: 'not-submitted' }
]

test.describe('Certificates and Statements of Compliance CSV downloads', () => {
  for (const { organisationType, tab } of downloadViews) {
    test(`${organisationType} ${tab} tab downloads a working CSV`, async ({
      page
    }) => {
      const certificatesPage = new CertificatesPage(page)
      await certificatesPage.openListTab(organisationType, tab)

      await expect(certificatesPage.downloadCsvButton).toBeVisible()

      const firstRowOrganisationName =
        await certificatesPage.getFirstRowOrganisationName()

      const { download, body } = await certificatesPage.downloadCsv()

      expect(download.suggestedFilename()).toMatch(/\.csv$/)
      expect(body).toContain(
        'Organisation name,Organisation ID,Recycling obligations'
      )
      expect(body).toContain(firstRowOrganisationName)
    })
  }
})
