import { test, expect } from '@playwright/test'

test.describe('Login page', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('displays sign-in form with all expected elements', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByLabel('Email address')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByRole('link', { name: "I've forgotten my password" })).toBeVisible()
  })

  test('shows validation errors when submitting empty form', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText(/please enter your email address/i).or(
      page.getByText(/please enter a valid/i)
    )).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/')

    await page.getByLabel('Email address').fill('invalid@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(
      page.getByText(/incorrect|invalid|wrong|unable to sign|trouble signing/i)
    ).toBeVisible()
  })

  test('redirects to Regulator Dashboard on valid credentials', async ({ page }) => {
    await page.goto('/')

    await page.getByLabel('Email address').fill(process.env.TEST_EMAIL ?? '')
    await page.getByLabel('Password').fill(process.env.TEST_PASSWORD ?? '')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await page.waitForURL((url) => !url.hostname.includes('b2clogin'))

    await expect(page).toHaveURL('https://epr-regulator-frontend.dev.cdp-int.defra.cloud/')
    await expect(page.getByRole('heading', { name: 'Regulator Dashboard' })).toBeVisible()
  })
})
