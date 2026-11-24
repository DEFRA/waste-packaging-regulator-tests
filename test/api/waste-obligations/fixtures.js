import { test as base, expect as baseExpect } from '@playwright/test'
import { WasteObligationsApi } from './client.js'

// Every request is a GET, so these tests are read-only and safe to run
// against shared dev/test data. They don't seed anything: tests that need an
// organisation find one through the search endpoints, and skip when there's
// none. No IDs are fixed.

// Reading an organisation's obligations calls waste-organisations and the PRN
// common backend. Run locally, those point at the compose WireMock,
// which has no stubs, so the service answers 404/500 whatever the request.
// Set WASTE_OBLIGATIONS_DOWNSTREAM=true once they're stubbed or real.
export const downstreamUnavailable =
  ['local', 'github'].includes(process.env.ENVIRONMENT) &&
  process.env.WASTE_OBLIGATIONS_DOWNSTREAM !== 'true'
export const NEEDS_DOWNSTREAM =
  'Needs waste-organisations and the PRN common backend, which are unstubbed locally (set WASTE_OBLIGATIONS_DOWNSTREAM=true to run)'

// These work directly and inside toMatchObject, e.g.
// { status: expect.toBeOneOf(['Met', 'NotMet']), obligated: expect.toBeWholeTonnes() }.
export const expect = baseExpect.extend({
  toBeOneOf(received, values) {
    const pass = values.includes(received)
    return {
      pass,
      message: () =>
        `expected ${JSON.stringify(received)} ${pass ? 'not ' : ''}to be one of ${JSON.stringify(values)}`
    }
  },
  // A whole number of tonnes, 0 or more.
  toBeWholeTonnes(received) {
    const pass = Number.isInteger(received) && received >= 0
    return {
      pass,
      message: () =>
        `expected ${JSON.stringify(received)} ${pass ? 'not ' : ''}to be a whole number of tonnes, 0 or more`
    }
  }
})

export const test = base.extend({
  api: async ({ request }, use) => {
    await use(new WasteObligationsApi(request))
  }
})
