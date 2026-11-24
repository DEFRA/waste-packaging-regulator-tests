import { test, expect } from './fixtures.js'
import {
  BUSINESS_COUNTRIES,
  DECLARATION_STATUSES,
  DEFAULT_PAGE_SIZE,
  OBLIGATION_YEAR,
  REGISTRATION_TYPES
} from './client.js'

// GET /compliance-declarations — the "compliance-declarations" request.
test.describe('Waste Obligations API - search compliance declarations', () => {
  test('returns the first page of declarations with default paging', async ({
    api
  }) => {
    const response = await api.searchComplianceDeclarations()

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('application/json')
    const body = await response.json()
    expect(body).toMatchObject({ page: 1, pageSize: DEFAULT_PAGE_SIZE })
    expect(body.total).toEqual(expect.any(Number))
    expect(Array.isArray(body.complianceDeclarations)).toBe(true)
    expect(body.complianceDeclarations.length).toBeLessThanOrEqual(
      DEFAULT_PAGE_SIZE
    )
    expect(body.complianceDeclarations.length).toBeLessThanOrEqual(body.total)
  })

  test('returns declarations in the documented shape', async ({ api }) => {
    const declarations = await api.findComplianceDeclarations()
    test.skip(declarations.length === 0, 'No compliance declarations to check')

    for (const declaration of declarations) {
      expect(declaration).toMatchObject({
        id: expect.any(String),
        status: expect.toBeOneOf(DECLARATION_STATUSES),
        obligationYear: expect.any(Number),
        obligationStatus: expect.toBeOneOf(['Met', 'NotMet']),
        submitterName: expect.any(String),
        organisation: {
          id: expect.stringMatching(/^[0-9a-f-]{36}$/i),
          registrationType: expect.toBeOneOf(REGISTRATION_TYPES)
        }
      })
      expect(Array.isArray(declaration.obligations)).toBe(true)
      expect(Array.isArray(declaration.audit)).toBe(true)
      expect(Date.parse(declaration.created)).not.toBeNaN()
    }
  })

  test('filters by obligation year', async ({ api }) => {
    const declarations = await api.findComplianceDeclarations({
      obligationYear: OBLIGATION_YEAR
    })

    for (const declaration of declarations) {
      expect(declaration.obligationYear).toBe(OBLIGATION_YEAR)
    }
  })

  test('filters by a comma separated list of statuses', async ({ api }) => {
    const statuses = ['Submitted', 'Accepted']
    const declarations = await api.findComplianceDeclarations({
      status: statuses.join(',')
    })

    for (const declaration of declarations) {
      expect(statuses).toContain(declaration.status)
    }
  })

  for (const country of BUSINESS_COUNTRIES) {
    test(`filters by country ${country}`, async ({ api }) => {
      const declarations = await api.findComplianceDeclarations({ country })

      for (const declaration of declarations) {
        expect(declaration.organisation.businessCountry).toBe(country)
      }
    })
  }

  test('searches by organisation reference number', async ({ api }) => {
    const [declaration] = await api.findComplianceDeclarations({ pageSize: 1 })
    const reference = declaration?.organisation.referenceNumber
    test.skip(!reference, 'No declaration with a reference number to search')

    const results = await api.findComplianceDeclarations({ search: reference })

    expect(results.map((d) => d.id)).toContain(declaration.id)
    for (const result of results) {
      expect(
        [
          result.organisation.name,
          result.organisation.complianceSchemeName,
          result.organisation.schemeOperatorName,
          result.organisation.referenceNumber
        ].some((value) =>
          value?.toLowerCase().includes(reference.toLowerCase())
        )
      ).toBe(true)
    }
  })

  test('returns no declarations when the search matches nothing', async ({
    api
  }) => {
    const response = await api.searchComplianceDeclarations({
      search: 'no-organisation-is-called-this-zz9'
    })

    expect(response.status()).toBe(200)
    expect(await response.json()).toMatchObject({
      complianceDeclarations: [],
      total: 0
    })
  })

  for (const sort of [
    'DateSubmitted[desc]',
    'OrganisationName[asc]',
    'PercentageMet[desc],OrganisationId[asc]'
  ]) {
    test(`accepts the sort ${sort}`, async ({ api }) => {
      const response = await api.searchComplianceDeclarations({ sort })

      expect(response.status()).toBe(200)
    })
  }
})
