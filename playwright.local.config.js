import fs from 'node:fs'
import { defineConfig } from '@playwright/test'

process.env.ENVIRONMENT = 'local'

const { default: baseConfig, browserProjects } = await import(
  './playwright.config.js'
)

function toTestIgnoreArray(testIgnore) {
  if (!testIgnore) {
    return []
  }

  if (Array.isArray(testIgnore)) {
    return testIgnore
  }

  return [testIgnore]
}

const nationId = process.env.NATION_ID ?? 'EN'
const authFile = `playwright/.auth/nation${nationId}.json`
// Keep the base config's per-profile project allowlist.
const baseProjectNames = new Set(baseConfig.projects.map((p) => p.name))
const existingTestIgnore = toTestIgnoreArray(baseConfig.testIgnore)

// Re-authenticating against the real B2C sign-in form on every local run is
// slow and unnecessary while a session is still fresh. Only run 'setup' to
// (re)create authFile when it's missing or older than the session lifetime —
// otherwise a stale reused session fails partway through a run instead of
// just re-authenticating up front.
const AUTH_FILE_MAX_AGE_MS = 30 * 60 * 1000
const authFileAgeMs = fs.existsSync(authFile)
  ? Date.now() - fs.statSync(authFile).mtimeMs
  : Infinity
const isAuthFileFresh = authFileAgeMs < AUTH_FILE_MAX_AGE_MS

// Locally, the installed Google Chrome ran the axe scan 2-3x slower than
// bundled Chromium/Edge, pushing tests past their timeout. Use bundled
// Chromium for the Chrome projects here; CDP/Docker runs keep real Chrome.
function withBundledChromium(project) {
  if (project.use.channel !== 'chrome') {
    return project
  }
  const { channel, ...use } = project.use
  return { ...project, use }
}

export default defineConfig({
  ...baseConfig,
  workers: 1,
  retries: 0,
  testIgnore: [...existingTestIgnore, 'test/specs/home.spec.js'],
  use: {
    ...baseConfig.use,
    trace: 'on',
    video: 'on'
  },
  projects: [
    ...(isAuthFileFresh
      ? []
      : [{ name: 'setup', testDir: './auth', testMatch: /.*\.setup\.js/ }]),
    ...browserProjects(authFile, isAuthFileFresh ? [] : ['setup'])
      .filter((project) => baseProjectNames.has(project.name))
      .map(withBundledChromium)
  ]
})
