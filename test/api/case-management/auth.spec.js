import {
  test,
  expect,
  sharedEnvironment,
  CHANGES_SHARED_DATA
} from './fixtures.js'
import {
  caseSubmission,
  caseworker,
  caseworkerHeaders,
  intakeHeaders
} from './client.js'

test.describe('Case management caller authentication', () => {
  test('a request with no client id is refused with 401', async ({ api }) => {
    const { 'x-cdp-client-id': _clientId, ...headers } = caseworkerHeaders()

    const response = await api.listCases({}, { headers })

    expect(response.status()).toBe(401)
  })

  test('listing cases without a caller nation is refused with 403', async ({
    api
  }) => {
    const response = await api.listCases(
      {},
      { user: { ...caseworker, nation: null } }
    )

    expect(response.status()).toBe(403)
    expect((await response.json()).title).toBe('Not authorised')
  })

  test('getting a case without a caller nation is refused with 403', async ({
    api
  }) => {
    const response = await api.getCase('01JZZZZZZZZZZZZZZZZZZZZZZZ', {
      user: { ...caseworker, nation: null }
    })

    expect(response.status()).toBe(403)
  })

  test('the Case Intake Processor cannot list cases', async ({ api }) => {
    const response = await api.listCases({}, { headers: intakeHeaders() })

    expect(response.status()).toBe(403)
  })

  test.describe('submitting a case', () => {
    test.skip(sharedEnvironment, CHANGES_SHARED_DATA)

    test('is refused with 403 for the regulator frontend', async ({ api }) => {
      const response = await api.submitCase(caseSubmission(), {
        headers: caseworkerHeaders()
      })

      expect(response.status()).toBe(403)
    })

    test('is refused with 401 with no client id', async ({ api }) => {
      const response = await api.submitCase(caseSubmission(), { headers: {} })

      expect(response.status()).toBe(401)
    })
  })

  test.describe('changing a case', () => {
    test.skip(sharedEnvironment, CHANGES_SHARED_DATA)

    test('is refused with 401 without a caseworker user id', async ({
      api
    }) => {
      const created = await api.createCase()

      const response = await api.addNote(
        created.id,
        { text: 'No caseworker.' },
        { user: { ...caseworker, id: null } }
      )

      expect(response.status()).toBe(401)
      expect((await response.json()).title).toBe('Authentication required')
    })
  })
})
