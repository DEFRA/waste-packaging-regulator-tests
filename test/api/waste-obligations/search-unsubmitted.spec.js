import { test, expect } from './fixtures.js'
import {
  BUSINESS_COUNTRIES,
  MAX_PAGE_SIZE,
  OBLIGATION_YEAR,
  REGISTRATION_TYPES
} from './client.js'

// GET /compliance-declarations/unsubmitted — the "compliance-declarations
// Unsubmitted" request: eligible organisations with no submitted or accepted
// declaration.
test.describe('Waste Obligations API - search unsubmitted compliance declarations', () => {
  async function findUnsubmitted(api, params) {
    const response = await api.searchUnsubmitted({
      pageSize: MAX_PAGE_SIZE,
      ...params
    })
    expect(response.status()).toBe(200)
    return (await response.json()).unsubmittedOrganisations
  }

  test('returns DirectProducer, page 1 of 100', async ({ api }) => {
    const response = await api.searchUnsubmitted({
      obligationYear: OBLIGATION_YEAR,
      registrationType: 'DirectProducer',
      PageSize: MAX_PAGE_SIZE,
      Page: 1
    })

    expect(response.status()).toBe(200)
    const body = await response.json()
    // The collection sends PageSize and Page in PascalCase; the service binds
    // query names case-insensitively.
    expect(body).toMatchObject({ page: 1, pageSize: MAX_PAGE_SIZE })
    expect(body.unsubmittedOrganisations.length).toBeLessThanOrEqual(
      MAX_PAGE_SIZE
    )
    for (const organisation of body.unsubmittedOrganisations) {
      expect(organisation).toMatchObject({
        obligationYear: OBLIGATION_YEAR,
        registrationType: 'DirectProducer'
      })
    }
  })

  test('returns organisations in the documented shape', async ({ api }) => {
    const organisations = await findUnsubmitted(api, {
      obligationYear: OBLIGATION_YEAR
    })
    test.skip(organisations.length === 0, 'No unsubmitted organisations')

    for (const organisation of organisations) {
      expect(organisation).toMatchObject({
        organisationId: expect.stringMatching(/^[0-9a-f-]{36}$/i),
        obligationYear: OBLIGATION_YEAR,
        registrationType: expect.toBeOneOf(REGISTRATION_TYPES),
        name: expect.any(String),
        referenceNumber: expect.any(String)
      })
      expect(organisation.recyclingObligationsMet).toBeOneOf([
        true,
        false,
        null
      ])
    }
  })

  // AMCR-663: every row carries totalObligatedTonnage. It is a nullable int
  // that is always serialised, so the key must be present even when there is
  // no obligation calculation yet (null).
  for (const registrationType of REGISTRATION_TYPES) {
    test(`returns totalObligatedTonnage for every ${registrationType} organisation`, async ({
      api
    }) => {
      const organisations = await findUnsubmitted(api, {
        obligationYear: OBLIGATION_YEAR,
        registrationType
      })
      test.skip(
        organisations.length === 0,
        `No unsubmitted ${registrationType} organisations`
      )

      for (const organisation of organisations) {
        expect(
          organisation,
          `organisation ${organisation.organisationId}`
        ).toHaveProperty('totalObligatedTonnage')
        // null (not calculated yet), 0, or a positive whole number of tonnes.
        const tonnage = organisation.totalObligatedTonnage
        const isNull = tonnage === null
        const isZero = tonnage === 0
        const isWholeNumber = Number.isInteger(tonnage) && tonnage > 0
        expect(
          isNull || isZero || isWholeNumber,
          `organisation ${organisation.organisationId}: totalObligatedTonnage ${JSON.stringify(tonnage)} should be null, 0 or a whole number`
        ).toBe(true)
      }
    })
  }

  test('filters by a comma separated list of registration types', async ({
    api
  }) => {
    const response = await api.searchUnsubmitted({
      obligationYear: OBLIGATION_YEAR,
      registrationType: REGISTRATION_TYPES.join(',')
    })

    expect(response.status()).toBe(200)
  })

  for (const country of BUSINESS_COUNTRIES) {
    test(`filters by country ${country}`, async ({ api }) => {
      const organisations = await findUnsubmitted(api, {
        obligationYear: OBLIGATION_YEAR,
        country
      })

      for (const organisation of organisations) {
        expect(organisation.businessCountry).toBe(country)
      }
    })
  }

  test('searches by reference number', async ({ api }) => {
    const [organisation] = await findUnsubmitted(api, {
      obligationYear: OBLIGATION_YEAR,
      pageSize: 1
    })
    test.skip(!organisation, 'No unsubmitted organisations to search for')

    const results = await findUnsubmitted(api, {
      obligationYear: OBLIGATION_YEAR,
      search: organisation.referenceNumber
    })

    expect(results.map((o) => o.organisationId)).toContain(
      organisation.organisationId
    )
  })

  for (const sort of [
    'Name[asc]',
    'ReferenceNumber[desc]',
    'RecyclingObligationsMet[asc],Name[asc]'
  ]) {
    test(`accepts the sort ${sort}`, async ({ api }) => {
      const response = await api.searchUnsubmitted({
        obligationYear: OBLIGATION_YEAR,
        sort
      })

      expect(response.status()).toBe(200)
    })
  }
})
