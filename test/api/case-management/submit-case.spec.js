import {
  test,
  expect,
  sharedEnvironment,
  CHANGES_SHARED_DATA
} from './fixtures.js'
import { CASE_INTAKE_CLIENT_ID, caseSubmission } from './client.js'

// submit-case.yml
test.describe('Submit case (POST /cases)', () => {
  test.skip(sharedEnvironment, CHANGES_SHARED_DATA)

  test('creates a CSoC case in the SUBMITTED state', async ({ api }) => {
    const submission = caseSubmission()

    const response = await api.submitCase(submission)

    expect(response.status()).toBe(201)
    const created = await response.json()
    expect(response.headers().location).toMatch(
      new RegExp(`/cases/${created.id}$`)
    )
    expect(created).toMatchObject({
      id: expect.stringMatching(/^[0-9A-HJKMNP-TV-Z]{26}$/),
      caseType: 'CSoC',
      stateId: 'SUBMITTED',
      isTerminal: false,
      submittedBy: CASE_INTAKE_CLIENT_ID,
      templateVersion: 'v1',
      sourceSystemId: submission.sourceSystemId,
      nation: submission.nation,
      orgId: submission.orgId,
      producerType: submission.producerType,
      decision: null,
      assignedToId: null
    })
    expect(created.availableActions.map((a) => a.actionId)).toEqual([
      'accept',
      'cancel'
    ])
    expect(created.timeline).toHaveLength(1)
    expect(created.timeline[0]).toMatchObject({
      action: 'case-created',
      performedById: `service:${CASE_INTAKE_CLIENT_ID}`,
      stateId: 'SUBMITTED'
    })
  })

  test('returns the existing case with 200 when the submission is resent', async ({
    api
  }) => {
    const submission = caseSubmission()
    const first = await api.submitCase(submission)
    expect(first.status()).toBe(201)

    const replay = await api.submitCase(submission)

    expect(replay.status()).toBe(200)
    expect(replay.headers()['x-idempotent-replay']).toBe('true')
    expect((await replay.json()).id).toBe((await first.json()).id)
  })

  test('keeps displayData and source as submitted', async ({ api }) => {
    const displayData = {
      organisationName: { value: 'Test Producer Ltd', type: 'string' },
      obligationYear: { value: '2026', type: 'number' }
    }

    const response = await api.submitCase(
      caseSubmission({ displayData, source: 'api-tests' })
    )

    expect(response.status()).toBe(201)
    const created = await response.json()
    expect(created.displayData).toEqual(displayData)
    expect(created.timeline[0].details.source).toBe('api-tests')
  })

  test('starts a bulk-loaded case in the given initialState', async ({
    api
  }) => {
    const createdAt = '2025-01-15T09:30:00Z'

    const response = await api.submitCase(
      caseSubmission({ initialState: 'ACCEPTED', createdAt })
    )

    expect(response.status()).toBe(201)
    const created = await response.json()
    expect(created).toMatchObject({ stateId: 'ACCEPTED', isTerminal: true })
    expect(created.submittedAt).toBe('2025-01-15T09:30:00Z')
    expect(created.availableActions).toEqual([])
  })

  const invalidSubmissions = [
    {
      name: 'missing caseType',
      overrides: { caseType: '' },
      title: 'Invalid request',
      detail: "'caseType' is required and must be a non-empty string."
    },
    {
      name: 'unknown caseType',
      overrides: { caseType: 'NotACaseType' },
      title: 'Unknown case type',
      detail: "No case type is registered with id 'NotACaseType'."
    },
    {
      name: 'missing sourceSystemId',
      overrides: { sourceSystemId: ' ' },
      detail: "'sourceSystemId' is required and must be a non-empty string."
    },
    {
      name: 'missing callbackUrl',
      overrides: { callbackUrl: undefined },
      detail: "'callbackUrl' is required and must be a non-empty string."
    },
    {
      name: 'relative callbackUrl',
      overrides: { callbackUrl: '/submissions/callback' },
      detail: "'callbackUrl' must be an absolute http or https URL."
    },
    {
      name: 'non-http callbackUrl',
      overrides: { callbackUrl: 'ftp://source-system.example/callback' },
      detail: "'callbackUrl' must be an absolute http or https URL."
    },
    {
      name: 'unknown nation',
      overrides: { nation: 'FRANCE' },
      detail: /^'nation' must be one of /
    },
    {
      name: 'missing orgId',
      overrides: { orgId: '' },
      detail: "'orgId' is required and must be a non-empty string."
    },
    {
      name: 'initialState not in the case type',
      overrides: { initialState: 'NOT_A_STATE' },
      detail: "'initialState' must be a state of case type 'CSoC'."
    },
    {
      name: 'malformed displayData',
      overrides: { displayData: { organisationName: { value: 'x' } } },
      detail: /^'displayData\.organisationName' must be /
    }
  ]

  for (const { name, overrides, title, detail } of invalidSubmissions) {
    test(`rejects a submission with ${name} with 400`, async ({ api }) => {
      const response = await api.submitCase(caseSubmission(overrides))

      expect(response.status()).toBe(400)
      const problem = await response.json()
      expect(problem.title).toBe(title ?? 'Invalid request')
      expect(problem.detail).toMatch(detail)
    })
  }
})
