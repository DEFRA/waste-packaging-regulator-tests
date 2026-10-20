import { test as setup, expect } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import { ANALYTICS_HOSTS } from '../test/fixtures.js'
import { authFilePath } from '../utils/auth-file.js'

const nationId = process.env.NATION_ID ?? 'EN'
const email = process.env[`TEST_EMAIL_NATION_${nationId}`] ?? ''
const password = process.env[`TEST_PASSWORD_NATION_${nationId}`] ?? ''
const authFile = authFilePath()
const useMockAuth = process.env.MOCK_AUTH === 'true'

// Always start signed out. Under BrowserStack every project, this one
// included, inherits the top-level storageState (see
// playwright.compatibility.config.js) — the file this test is about to write,
// which won't exist yet on a first run.
setup.use({ storageState: { cookies: [], origins: [] } })

// Tagged so profiles that filter by tag (compatibility: /@compat|@auth-setup/)
// still run the login — a config-level grep applies to the setup project too.
setup(
  `authenticate nation : ${nationId}`,
  { tag: '@auth-setup' },
  async ({ page }) => {
    fs.mkdirSync(path.dirname(authFile), { recursive: true })

    // Mock auth enters through /signin-oidc, which auto-authenticates and
    // redirects server-side (see the comment below); real B2C auth starts from
    // the app home page and gets redirected to the sign-in form itself.
    const authEntryUrl = useMockAuth
      ? `${process.env.dashboardBaseURL}/signin-oidc`
      : process.env.dashboardBaseURL

    // Same analytics block as test/fixtures.js — this setup uses Playwright's
    // own test, not that fixture.
    await page.context().route(ANALYTICS_HOSTS, (route) => route.abort())

    await page.goto(authEntryUrl)

    // Mock auth (local/CI docker-compose runs): /signin-oidc auto-authenticates
    // and redirects immediately server-side — there's no form to fill in, and
    // it always resolves to the same fixed mock user regardless of NATION_ID.
    if (!useMockAuth) {
      // Fail with the real reason rather than a B2C "please enter your email"
      // timeout further down. Names only, never the values.
      const missing = [
        !email && `TEST_EMAIL_NATION_${nationId}`,
        !password && `TEST_PASSWORD_NATION_${nationId}`
      ].filter(Boolean)
      if (missing.length) {
        throw new Error(
          `${missing.join(' and ')} not set (ENVIRONMENT=${process.env.ENVIRONMENT || 'dev'})`
        )
      }

      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()

      // B2C's sign-in page resets its inputs when its scripts finish
      // initialising, so a fill made as soon as the heading appears can be
      // wiped — on BrowserStack's remote browsers that window is wide enough to
      // hit every time. Wait for load, then re-fill until both values stick.
      // Compared as booleans so a failure never prints the password.
      await page.waitForLoadState('load')
      const emailInput = page.getByLabel('Email address')
      const passwordInput = page.getByLabel('Password')
      await expect(async () => {
        await emailInput.fill(email)
        await passwordInput.fill(password)
        expect(
          (await emailInput.inputValue()) === email,
          'email field kept its value'
        ).toBe(true)
        expect(
          (await passwordInput.inputValue()) === password,
          'password field kept its value'
        ).toBe(true)
      }).toPass({ timeout: 30_000 })

      await page.getByRole('button', { name: 'Sign in' }).click()

      await page.waitForURL((url) => !url.hostname.includes('b2clogin'))
    }

    // Accept the cookie banner once here so its cookies_policy cookie is saved
    // into authFile with the session — every test then starts with the banner
    // already dismissed. Analytics requests themselves stay blocked (above).
    await page.getByRole('button', { name: 'Accept analytics cookies' }).click()
    await expect
      .poll(async () =>
        (await page.context().cookies()).some(
          (c) => c.name === 'cookies_policy'
        )
      )
      .toBe(true)

    await page.context().storageState({ path: authFile })
  }
)
