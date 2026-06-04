import { test, expect } from '@playwright/test'
import { HomePage } from '../../page-objects/home.page.js'
import {
  initialiseAccessibilityChecking,
  analyseAccessibility,
  generateAccessibilityReports,
  generateAccessibilityReportIndex
} from '../../../utils/accessibility-checking.js'

const nationId = process.env.NATION_ID ?? 'EN'
const email = process.env[`TEST_EMAIL_NATION_${nationId}`] ?? ''
const password = process.env[`TEST_PASSWORD_NATION_${nationId}`] ?? ''

test.describe('Regulator Dashboard', () => {

  test.beforeAll(async () => {
    await initialiseAccessibilityChecking()
  })

  test.afterAll(async () => {
    generateAccessibilityReports('Regulator-Dashboard')
    generateAccessibilityReportIndex()
  })

  test('displays the Regulator Dashboard heading and title', async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.open()

    await expect(page).toHaveTitle(/Regulator Dashboard/)
    await expect(homePage.pageHeading).toHaveText('Regulator Dashboard')
    await analyseAccessibility(page, 'dashboard-heading')
  })

  test.describe('redirects to Regulator Dashboard on valid credentials', () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test('redirects to Regulator Dashboard on valid credentials', async ({ page }) => {
      const homePage = new HomePage(page)
      await homePage.open()
      await homePage.login(email, password)

      await expect(homePage.dashboardHeading).toBeVisible()
      await analyseAccessibility(page, 'dashboard-login')
    })
  })
})
