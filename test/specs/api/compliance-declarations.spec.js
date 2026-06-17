import { test, expect } from '@playwright/test'
import dotenv from 'dotenv'

const env = process.env.ENVIRONMENT || 'dev'
dotenv.config({ path: `.env.${env}` })

const BASE_URL = process.env.API_BASE_URL
const ORG_ID = process.env.TEST_ORG_ID
const DECLARATION_ID = process.env.TEST_DECLARATION_ID
const OBLIGATION_YEAR = Number(process.env.TEST_OBLIGATION_YEAR) || 2026

const authHeaders = {
  'x-api-key': process.env.API_KEY,
  Authorization: process.env.API_AUTH_HEADER,
  'Content-Type': 'application/json'
}

const UNKNOWN_ORG_ID = '00000000-0000-0000-0000-000000000000'
const UNKNOWN_DECLARATION_ID = '000000000000000000000000'

test.describe('Compliance Declarations API', () => {
  test.describe('GET /organisations/{organisationId}/compliance-declarations', () => {
    test('returns 200 with complianceDeclarations array for valid organisation and year', async ({
      request
    }) => {
      const response = await request.get(
        `${BASE_URL}/organisations/${ORG_ID}/compliance-declarations`,
        { params: { obligationYear: OBLIGATION_YEAR }, headers: authHeaders }
      )

      expect(response.status()).toBe(200)
      const body = await response.json()
      expect(body).toHaveProperty('complianceDeclarations')
      expect(Array.isArray(body.complianceDeclarations)).toBe(true)
      expect(body.complianceDeclarations.length).toBeGreaterThan(0)
    })

    test('response contains declarations with required fields', async ({
      request
    }) => {
      const response = await request.get(
        `${BASE_URL}/organisations/${ORG_ID}/compliance-declarations`,
        { params: { obligationYear: OBLIGATION_YEAR }, headers: authHeaders }
      )

      const body = await response.json()
      const declaration = body.complianceDeclarations[0]

      expect(declaration).toHaveProperty('id')
      expect(declaration).toHaveProperty('created')
      expect(declaration).toHaveProperty('updated')
      expect(declaration).toHaveProperty('status')
      expect(declaration).toHaveProperty('organisation')
      expect(declaration).toHaveProperty('obligationYear')
      expect(declaration).toHaveProperty('obligations')
      expect(declaration).toHaveProperty('obligationStatus')
      expect(declaration).toHaveProperty('declarationText')
      expect(declaration).toHaveProperty('submitterName')
      expect(declaration).toHaveProperty('isRegulation43Compliant')
      expect(declaration).toHaveProperty('audit')
    })

    test('declaration status is a valid enum value', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/organisations/${ORG_ID}/compliance-declarations`,
        { params: { obligationYear: OBLIGATION_YEAR }, headers: authHeaders }
      )

      const body = await response.json()
      const { status } = body.complianceDeclarations[0]
      expect(['Submitted', 'Accepted', 'Cancelled']).toContain(status)
    })

    test('declaration obligationStatus is a valid enum value', async ({
      request
    }) => {
      const response = await request.get(
        `${BASE_URL}/organisations/${ORG_ID}/compliance-declarations`,
        { params: { obligationYear: OBLIGATION_YEAR }, headers: authHeaders }
      )

      const body = await response.json()
      const { obligationStatus } = body.complianceDeclarations[0]
      expect(['Met', 'NotMet']).toContain(obligationStatus)
    })

    test('organisation object contains required fields', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/organisations/${ORG_ID}/compliance-declarations`,
        { params: { obligationYear: OBLIGATION_YEAR }, headers: authHeaders }
      )

      const body = await response.json()
      const { organisation } = body.complianceDeclarations[0]

      expect(organisation).toHaveProperty('id')
      expect(organisation).toHaveProperty('registrationType')
      expect(organisation).toHaveProperty('regulator')
      expect(organisation).toHaveProperty('regulatorEmail')
      expect(['DirectProducer', 'ComplianceScheme']).toContain(
        organisation.registrationType
      )
    })

    test('audit array contains entries with user, timestamp and action', async ({
      request
    }) => {
      const response = await request.get(
        `${BASE_URL}/organisations/${ORG_ID}/compliance-declarations`,
        { params: { obligationYear: OBLIGATION_YEAR }, headers: authHeaders }
      )

      const body = await response.json()
      const { audit } = body.complianceDeclarations[0]

      expect(Array.isArray(audit)).toBe(true)
      expect(audit.length).toBeGreaterThan(0)
      audit.forEach((entry) => {
        expect(entry).toHaveProperty('user')
        expect(entry).toHaveProperty('timestamp')
        expect(entry).toHaveProperty('action')
        expect(entry.user).toHaveProperty('id')
        expect(entry.user).toHaveProperty('email')
      })
    })

    test('returns 200 with empty array when no obligationYear is provided', async ({
      request
    }) => {
      const response = await request.get(
        `${BASE_URL}/organisations/${ORG_ID}/compliance-declarations`,
        { headers: authHeaders }
      )

      expect(response.status()).toBe(200)
      const body = await response.json()
      expect(body).toHaveProperty('complianceDeclarations')
      expect(Array.isArray(body.complianceDeclarations)).toBe(true)
    })

    test('returns 404 for unknown organisation ID', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/organisations/${UNKNOWN_ORG_ID}/compliance-declarations`,
        {
          params: { obligationYear: OBLIGATION_YEAR },
          headers: authHeaders
        }
      )

      expect(response.status()).toBe(404)
    })

    test('returns 403 when no authentication headers are provided', async ({
      request
    }) => {
      const response = await request.get(
        `${BASE_URL}/organisations/${ORG_ID}/compliance-declarations`,
        { params: { obligationYear: OBLIGATION_YEAR } }
      )

      expect(response.status()).toBe(403)
    })

    test('returns 403 when an invalid API key is provided', async ({
      request
    }) => {
      const response = await request.get(
        `${BASE_URL}/organisations/${ORG_ID}/compliance-declarations`,
        {
          params: { obligationYear: OBLIGATION_YEAR },
          headers: {
            ...authHeaders,
            'x-api-key': 'invalid-api-key'
          }
        }
      )

      expect(response.status()).toBe(403)
    })
  })

  test.describe('GET /organisations/{organisationId}/compliance-declarations/{complianceDeclarationId}', () => {
    test('returns 200 with a single declaration for valid IDs', async ({
      request
    }) => {
      const response = await request.get(
        `${BASE_URL}/organisations/${ORG_ID}/compliance-declarations/${DECLARATION_ID}`,
        { headers: authHeaders }
      )

      expect(response.status()).toBe(200)
      const body = await response.json()
      expect(body).toHaveProperty('id', DECLARATION_ID)
    })

    test('response contains all required fields', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/organisations/${ORG_ID}/compliance-declarations/${DECLARATION_ID}`,
        { headers: authHeaders }
      )

      const body = await response.json()

      expect(body).toHaveProperty('id')
      expect(body).toHaveProperty('created')
      expect(body).toHaveProperty('updated')
      expect(body).toHaveProperty('status')
      expect(body).toHaveProperty('organisation')
      expect(body).toHaveProperty('obligationYear')
      expect(body).toHaveProperty('obligations')
      expect(body).toHaveProperty('obligationStatus')
      expect(body).toHaveProperty('declarationText')
      expect(body).toHaveProperty('submitterName')
      expect(body).toHaveProperty('isRegulation43Compliant')
      expect(body).toHaveProperty('audit')
    })

    test('organisation ID in response matches the requested organisation', async ({
      request
    }) => {
      const response = await request.get(
        `${BASE_URL}/organisations/${ORG_ID}/compliance-declarations/${DECLARATION_ID}`,
        { headers: authHeaders }
      )

      const body = await response.json()
      expect(body.organisation.id).toBe(ORG_ID)
    })

    test('obligationYear matches the expected year', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/organisations/${ORG_ID}/compliance-declarations/${DECLARATION_ID}`,
        { headers: authHeaders }
      )

      const body = await response.json()
      expect(body.obligationYear).toBe(OBLIGATION_YEAR)
    })

    test('status is a valid enum value', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/organisations/${ORG_ID}/compliance-declarations/${DECLARATION_ID}`,
        { headers: authHeaders }
      )

      const { status } = await response.json()
      expect(['Submitted', 'Accepted', 'Cancelled']).toContain(status)
    })

    test('declarationText contains text and language fields', async ({
      request
    }) => {
      const response = await request.get(
        `${BASE_URL}/organisations/${ORG_ID}/compliance-declarations/${DECLARATION_ID}`,
        { headers: authHeaders }
      )

      const { declarationText } = await response.json()
      expect(declarationText).toHaveProperty('text')
      expect(declarationText).toHaveProperty('language')
      expect(typeof declarationText.text).toBe('string')
      expect(declarationText.text.length).toBeGreaterThan(0)
    })

    test('created and updated timestamps are valid ISO 8601 date strings', async ({
      request
    }) => {
      const response = await request.get(
        `${BASE_URL}/organisations/${ORG_ID}/compliance-declarations/${DECLARATION_ID}`,
        { headers: authHeaders }
      )

      const { created, updated } = await response.json()
      expect(new Date(created).toISOString()).toBeTruthy()
      expect(new Date(updated).toISOString()).toBeTruthy()
    })

    test('returns 404 for unknown compliance declaration ID', async ({
      request
    }) => {
      const response = await request.get(
        `${BASE_URL}/organisations/${ORG_ID}/compliance-declarations/${UNKNOWN_DECLARATION_ID}`,
        { headers: authHeaders }
      )

      expect(response.status()).toBe(404)
    })

    test('returns 403 when no authentication headers are provided', async ({
      request
    }) => {
      const response = await request.get(
        `${BASE_URL}/organisations/${ORG_ID}/compliance-declarations/${DECLARATION_ID}`
      )

      expect(response.status()).toBe(403)
    })

    test('returns 403 when an invalid API key is provided', async ({
      request
    }) => {
      const response = await request.get(
        `${BASE_URL}/organisations/${ORG_ID}/compliance-declarations/${DECLARATION_ID}`,
        {
          headers: {
            ...authHeaders,
            'x-api-key': 'invalid-api-key'
          }
        }
      )

      expect(response.status()).toBe(403)
    })
  })
})
