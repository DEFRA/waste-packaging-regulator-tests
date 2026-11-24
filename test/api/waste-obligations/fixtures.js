import { test as base, expect as baseExpect } from '@playwright/test'
import { WasteObligationsApi } from './client.js'

// Every request in the Postman collection is a GET, so these tests are
// read-only and safe to run against shared dev/test data. They don't seed
// anything: tests that need a declaration or organisation find one through the
// search endpoint, and skip when there's none. No IDs are fixed.

// Reading obligations or a single declaration calls waste-organisations and
// the PRN common backend. Run locally, those point at the compose WireMock,
// which has no stubs, so the service answers 404/500 whatever the request.
// Set WASTE_OBLIGATIONS_DOWNSTREAM=true once they're stubbed or real.
export const downstreamUnavailable =
  ['local', 'github'].includes(process.env.ENVIRONMENT) &&
  process.env.WASTE_OBLIGATIONS_DOWNSTREAM !== 'true'
export const NEEDS_DOWNSTREAM =
  'Needs waste-organisations and the PRN common backend, which are unstubbed locally (set WASTE_OBLIGATIONS_DOWNSTREAM=true to run)'

export const NO_DECLARATIONS =
  'No compliance declarations in this environment to read'

// toBeOneOf works directly and inside toMatchObject, e.g.
// { status: expect.toBeOneOf(['Met', 'NotMet']) }.
export const expect = baseExpect.extend({
  toBeOneOf(received, values) {
    const pass = values.includes(received)
    return {
      pass,
      message: () =>
        `expected ${JSON.stringify(received)} ${pass ? 'not ' : ''}to be one of ${JSON.stringify(values)}`
    }
  }
})

export const test = base.extend({
  api: async ({ request }, use) => {
    await use(new WasteObligationsApi(request))
  }
})

// Asserts the ASP.NET validation problem details the service returns for an
// invalid query parameter, e.g. { errors: { PageSize: ['...'] } }.
export async function expectValidationError(response, field) {
  expect(response.status()).toBe(400)
  expect(response.headers()['content-type']).toContain(
    'application/problem+json'
  )
  const body = await response.json()
  expect(body).toMatchObject({
    title: 'One or more validation errors occurred.',
    status: 400
  })
  expect(Object.keys(body.errors)).toContain(field)
  return body
}
