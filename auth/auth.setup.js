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

setup(`authenticate nation : ${nationId}`, async ({ page }) => {
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
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()

    await page.getByLabel('Email address').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await page.waitForURL((url) => !url.hostname.includes('b2clogin'))
  }

  // Accept the cookie banner once here so its cookies_policy cookie is saved
  // into authFile with the session — every test then starts with the banner
  // already dismissed. Analytics requests themselves stay blocked (above).
  await page.getByRole('button', { name: 'Accept analytics cookies' }).click()
  await expect
    .poll(async () =>
      (await page.context().cookies()).some((c) => c.name === 'cookies_policy')
    )
    .toBe(true)

  await page.context().storageState({ path: authFile })
})
