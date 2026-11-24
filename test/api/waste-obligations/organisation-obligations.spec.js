import {
  test,
  expect,
  downstreamUnavailable,
  NEEDS_DOWNSTREAM
} from './fixtures.js'
import {
  MATERIALS,
  MAX_PAGE_SIZE,
  OBLIGATION_STATUSES,
  OBLIGATION_YEAR
} from './client.js'

// GET /organisations/{organisationId}/obligations. The organisation read is
// always one found through the compliance declaration search, never a fixed ID.
test.describe('Waste Obligations API - organisation obligations', () => {
  async function findOrganisationId(api) {
    const [declaration] = await api.findComplianceDeclarations({
      obligationYear: OBLIGATION_YEAR,
      pageSize: 1
    })
    return declaration?.organisation.id
  }

  test('returns the obligations for an organisation and year', async ({
    api
  }) => {
    test.skip(downstreamUnavailable, NEEDS_DOWNSTREAM)

    const organisationId = await findOrganisationId(api)
    test.skip(!organisationId, 'No organisation in this environment to read')

    const response = await api.readObligations(organisationId, {
      obligationYear: OBLIGATION_YEAR
    })

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('application/json')
    const { obligations } = await response.json()
    expect(Array.isArray(obligations)).toBe(true)
    for (const obligation of obligations) {
      expect(obligation).toMatchObject({
        material: expect.toBeOneOf(MATERIALS),
        status: expect.toBeOneOf(OBLIGATION_STATUSES),
        tonnages: expect.any(Object)
      })
      for (const tonnage of Object.values(obligation.tonnages)) {
        expect(Number.isInteger(tonnage) && tonnage >= 0).toBe(true)
      }
      if (obligation.recyclingTarget != null) {
        expect(obligation.recyclingTarget).toBeGreaterThanOrEqual(0)
        expect(obligation.recyclingTarget).toBeLessThanOrEqual(1)
      }
    }
    expect(new Set(obligations.map((o) => o.material)).size).toBe(
      obligations.length
    )
  })

  // The unsubmitted search's totalObligatedTonnage is the sum of every
  // material's ObligationToMeet (Glass and GlassRemelt included), which the
  // obligations endpoint returns as tonnages.obligated. The search total is a
  // stored summary refreshed in the background and the obligations are read
  // live, so a mismatch can also mean the summary is stale.
  test('obligated tonnages add up to the unsubmitted totalObligatedTonnage', async ({
    api
  }) => {
    test.skip(downstreamUnavailable, NEEDS_DOWNSTREAM)
    const minimumTonnage = 1000

    let organisation
    for (let page = 1; !organisation; page++) {
      const response = await api.searchUnsubmitted({
        obligationYear: OBLIGATION_YEAR,
        pageSize: MAX_PAGE_SIZE,
        page
      })
      expect(response.status()).toBe(200)
      const { unsubmittedOrganisations, total } = await response.json()
      organisation = unsubmittedOrganisations.find(
        (o) => o.totalObligatedTonnage > minimumTonnage
      )
      if (page * MAX_PAGE_SIZE >= total) break
    }
    test.skip(
      !organisation,
      `No unsubmitted organisation with over ${minimumTonnage} tonnes obligated`
    )
    test.info().annotations.push({
      type: 'organisation',
      description: `${organisation.name} (${organisation.organisationId}): totalObligatedTonnage ${organisation.totalObligatedTonnage}`
    })

    const response = await api.readObligations(organisation.organisationId, {
      obligationYear: OBLIGATION_YEAR
    })

    expect(response.status()).toBe(200)
    const { obligations } = await response.json()
    const obligated = obligations.reduce(
      (sum, obligation) => sum + obligation.tonnages.obligated,
      0
    )
    expect(
      obligated,
      `sum of obligated across ${obligations.map((o) => `${o.material}=${o.tonnages.obligated}`).join(', ')}`
    ).toBe(organisation.totalObligatedTonnage)
  })
})
