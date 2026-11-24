import http from 'node:http'
import { test as base, expect } from '@playwright/test'
import { CaseManagementApi } from './client.js'

// dev/test share one live database. Read-only tests run everywhere; tests
// that create or change cases only run against a local service.
export const sharedEnvironment = !['local', 'github'].includes(
  process.env.ENVIRONMENT
)
export const CHANGES_SHARED_DATA =
  'Creates or changes cases in shared dev/test data — only runs against a local service'

// The service PATCHes the decision to the case's callbackUrl when a case
// concludes, so these tests stand up a stub for it. Run with `dotnet run`, the
// service reaches the stub on localhost; set
// caseManagementCallbackHost=host.docker.internal when it runs in Docker
// (the repo's compose.yml).
const callbackHost = process.env.caseManagementCallbackHost ?? 'localhost'

async function startCallbackServer() {
  const requests = []
  let status = 200

  const server = http.createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      requests.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: body ? JSON.parse(body) : undefined
      })
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end('{}')
    })
  })
  await new Promise((resolve) => server.listen(0, '0.0.0.0', resolve))

  return {
    url: `http://${callbackHost}:${server.address().port}/submissions/callback`,
    requests,
    respondWith(newStatus) {
      status = newStatus
    },
    close: () => new Promise((resolve) => server.close(resolve))
  }
}

export const test = base.extend({
  api: async ({ request }, use) => {
    await use(new CaseManagementApi(request))
  },
  // Playwright requires the fixture's first argument to be destructured.
  // eslint-disable-next-line no-empty-pattern
  callbackServer: async ({}, use) => {
    const server = await startCallbackServer()
    await use(server)
    await server.close()
  }
})

export { expect }
