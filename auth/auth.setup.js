import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const nationId = process.env.NATION_ID ?? 'EN'
const email = process.env[`TEST_EMAIL_NATION_${nationId}`] ?? ''
const password = process.env[`TEST_PASSWORD_NATION_${nationId}`] ?? ''
const authFile = path.join('playwright', '.auth', `nation${nationId}.json`)

setup(`authenticate nation : ${nationId}`, async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true })

  await page.goto(process.env.baseURLCompliance ?? '/')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()

  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.waitForURL((url) => !url.hostname.includes('b2clogin'))

  await page.context().storageState({ path: authFile })
})
