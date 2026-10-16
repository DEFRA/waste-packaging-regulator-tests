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
// Chrome and Edge). The SDK throws away this config's `projects` and builds
// one project per platform instead, keeping only the top-level `use` — so the
// auth setup project is declared per platform in browserstack.yml
// (playwrightConfigOptions.setup), and storageState lives here rather than on
// a project. auth.setup.js opts itself out of it, since it's the test that
// writes the file. No local browser projects: their channel/device settings
// (e.g. the Desktop Chrome user agent) would be applied on top of the real
// BrowserStack browser.
export default defineConfig({
  ...baseConfig,
  use: {
    ...baseConfig.use,
    viewport: { width: 1280, height: 720 },
    storageState: authFile
  },
  projects: []
})
