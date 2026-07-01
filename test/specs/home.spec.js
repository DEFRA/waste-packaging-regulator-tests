import { test, expect } from '../fixtures.js'
import { HomePage } from '../page-objects/home.page.js'

const nationId = process.env.NATION_ID ?? 'EN'
const email = process.env[`TEST_EMAIL_NATION_${nationId}`] ?? ''
const password = process.env[`TEST_PASSWORD_NATION_${nationId}`] ?? ''

test.describe('Regulator Dashboard', () => {
  test('displays the Regulator Dashboard heading and title', async ({
    page
  }) => {
    const homePage = new HomePage(page)
    await homePage.open()

    await expect(page).toHaveTitle(/Regulator Dashboard/)
  })

  test.describe('redirects to Regulator Dashboard on valid credentials', () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test('redirects to Regulator Dashboard on valid credentials', async ({
      page
    }) => {
      const homePage = new HomePage(page)
      await homePage.open()
      await homePage.login(email, password)

      await expect(homePage.dashboardHeading).toBeVisible()
    })
  })
})
