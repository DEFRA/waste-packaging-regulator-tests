import { defineConfig } from '@playwright/test'
import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { bootstrap } from 'global-agent'

// ENVIRONMENT=local is set by test:local:compatibility (mirrors how
// playwright.local.config.js itself is only pulled in via test:local*
// scripts) — picks the base config that points at the locally running
// frontend instead of a deployed dev/test environment.
const { default: baseConfig } = await import(
  process.env.ENVIRONMENT === 'local'
    ? './playwright.local.config.js'
    : './playwright.config.js'
)

// browserstack-node-sdk's own outbound calls (BrowserStack API + Local tunnel
// dial-out) use Node's fetch/undici, which don't pick up HTTP_PROXY on their
// own. CDP containers can only reach the outside world via the platform's
// egress proxy (see entrypoint.sh), so bootstrap it here the same way — this
// only wraps the SDK's calls, not Playwright's own browser traffic, which
// BrowserStack routes remotely once connected.
const proxyUrl = process.env.HTTP_PROXY
if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent({ uri: proxyUrl }))
  bootstrap()
  globalThis.GLOBAL_AGENT.HTTP_PROXY = proxyUrl
}

const nationId = process.env.NATION_ID ?? 'EN'
const authFile = `playwright/.auth/nation${nationId}.json`

// The real browsers come from the `platforms` in browserstack.yml (Windows 11
// Chrome and Edge) — the SDK runs these projects once per platform. So no
// local browser projects here: their channel/device settings (e.g. the
// Desktop Chrome user agent) would be applied on top of the real BrowserStack
// browser, or multiply every platform by every project. One neutral project
// keeps each platform's own user agent and gives one session per platform.
export default defineConfig({
  ...baseConfig,
  projects: [
    {
      name: 'setup',
      testDir: './auth',
      testMatch: /.*\.setup\.js/
    },
    {
      name: 'browserstack',
      use: {
        viewport: { width: 1280, height: 720 },
        storageState: authFile
      },
      dependencies: ['setup']
    }
  ]
})
