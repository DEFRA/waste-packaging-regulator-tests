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

// The tonnage fields every obligation carries (Dtos/ObligationTonnages.cs).
const TONNAGE_FIELDS = [
  'material',
  'awaitingAcceptance',
  'accepted',
  'outstanding',
  'obligated'
]

// GET /organisations/{organisationId}/obligations. The organisation read is
// always one found through a search, never a fixed ID.
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
    // The organisation has a compliance declaration, so it has obligations;
    // an empty list would otherwise pass every check below.
    expect(obligations.length).toBeGreaterThan(0)
    for (const obligation of obligations) {
      expect(obligation).toMatchObject({
        material: expect.toBeOneOf(MATERIALS),
        status: expect.toBeOneOf(OBLIGATION_STATUSES),
        tonnages: Object.fromEntries(
          TONNAGE_FIELDS.map((field) => [field, expect.toBeWholeTonnes()])
        )
      })
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
  // obligations endpoint returns as tonnages.obligated.
  //
  // The search total is a stored summary; the obligations are read live. The
  // service refreshes the summary every 30 minutes and allows it to be up to 2
  // hours old (OrganisationEligibilityOptions). Obligated tonnage comes from the
  // organisation's packaging data, not from PRNs being accepted, so the two
  // only drift after that data changes. A mismatch straight after a packaging
  // data change can be a stale summary; one that lasts over 2 hours is a defect.
  test('obligated tonnages add up to the unsubmitted totalObligatedTonnage', async ({
    api
  }) => {
    test.skip(downstreamUnavailable, NEEDS_DOWNSTREAM)
    const minimumTonnage = 1000
    // The search can't sort by tonnage, so look through at most this many
    // pages (3,000 organisations) rather than until the test times out.
    const maximumPages = 30

    let organisation
    let page = 1
    for (; page <= maximumPages && !organisation; page++) {
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
      if (
        unsubmittedOrganisations.length === 0 ||
        page * MAX_PAGE_SIZE >= total
      ) {
        break
      }
    }
    test.skip(
      !organisation,
      `No unsubmitted organisation with over ${minimumTonnage} tonnes obligated in the first ${Math.min(page, maximumPages)} page(s)`
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
    expect(obligations.length).toBeGreaterThan(0)
    for (const obligation of obligations) {
      expect(
        obligation.tonnages.obligated,
        obligation.material
      ).toBeWholeTonnes()
    }
    const obligated = obligations.reduce(
      (sum, obligation) => sum + obligation.tonnages.obligated,
      0
    )
    expect(
      obligated,
      `sum of obligated across ${obligations.map((o) => `${o.material}=${o.tonnages.obligated}`).join(', ')}. `
    ).toBe(organisation.totalObligatedTonnage)
  })
})
