import {
  test,
  expect,
  sharedEnvironment,
  CHANGES_SHARED_DATA
} from './fixtures.js'
import { caseworker } from './client.js'

const CANCEL_REASON = 'Test cancellation.'

test.describe('Apply action (POST /cases/{id}/actions/{actionId})', () => {
  test.skip(sharedEnvironment, CHANGES_SHARED_DATA)

  test.describe('cancel', () => {
    test('cancels the case and sends the decision to the source system', async ({
      api,
      callbackServer
    }) => {
      const created = await api.createCase({ callbackUrl: callbackServer.url })

      const response = await api.applyAction(created.id, 'cancel', {
        decision: { reason: CANCEL_REASON }
      })

      expect(response.status()).toBe(200)
      const cancelled = await response.json()
      expect(cancelled).toMatchObject({
        stateId: 'CANCELLED',
        isTerminal: true,
        availableActions: [],
        decision: { reason: CANCEL_REASON }
      })
      expect(cancelled.timeline[0]).toMatchObject({
        action: 'state-changed',
        performedById: caseworker.id,
        stateId: 'CANCELLED',
        details: {
          actionId: 'cancel',
          fromStateId: 'SUBMITTED',
          toStateId: 'CANCELLED',
          'decision.reason': CANCEL_REASON
        }
      })
      expect(callbackServer.requests).toHaveLength(1)
      expect(callbackServer.requests[0]).toMatchObject({
        method: 'PATCH',
        url: '/submissions/callback',
        body: {
          status: 'Cancelled',
          reason: CANCEL_REASON,
          user: {
            id: caseworker.id,
            email: caseworker.email,
            name: caseworker.name
          }
        }
      })
    })

    test('rejects a cancel without a reason with 400', async ({
      api,
      callbackServer
    }) => {
      const created = await api.createCase({ callbackUrl: callbackServer.url })

      const response = await api.applyAction(created.id, 'cancel', {
        decision: { reason: ' ' }
      })

      expect(response.status()).toBe(400)
      expect((await response.json()).detail).toBe(
        "Action 'cancel' requires decision field 'reason'."
      )
      expect(callbackServer.requests).toHaveLength(0)
    })
  })

  test.describe('accept', () => {
    test('accepts the case and sends the decision to the source system', async ({
      api,
      callbackServer
    }) => {
      const created = await api.createCase({ callbackUrl: callbackServer.url })

      const response = await api.applyAction(created.id, 'accept', {})

      expect(response.status()).toBe(200)
      expect(await response.json()).toMatchObject({
        stateId: 'ACCEPTED',
        isTerminal: true,
        availableActions: []
      })
      expect(callbackServer.requests[0]).toMatchObject({
        method: 'PATCH',
        body: { status: 'Accepted', user: { id: caseworker.id } }
      })
    })
  })

  test.describe('when the source system refuses the decision', () => {
    test('returns 502 and leaves the case in its state', async ({
      api,
      callbackServer
    }) => {
      callbackServer.respondWith(500)
      const created = await api.createCase({ callbackUrl: callbackServer.url })

      const response = await api.applyAction(created.id, 'accept', {})

      expect(response.status()).toBe(502)
      expect((await response.json()).title).toBe(
        'Source system callback failed'
      )
      const after = await (await api.getCase(created.id)).json()
      expect(after.stateId).toBe('SUBMITTED')
      expect(after.timeline[0]).toMatchObject({
        action: 'callback-failed',
        details: { actionId: 'accept', toStateId: 'ACCEPTED' }
      })
    })

    test('returns 502 when the callback URL cannot be reached', async ({
      api
    }) => {
      // The .example domain never resolves.
      const created = await api.createCase()

      const response = await api.applyAction(created.id, 'cancel', {
        decision: { reason: CANCEL_REASON }
      })

      expect(response.status()).toBe(502)
      const after = await (await api.getCase(created.id)).json()
      expect(after.stateId).toBe('SUBMITTED')
      expect(after.timeline[0].details.reason).toContain('could not be reached')
    })
  })

  test('rejects an action the case type does not declare with 400', async ({
    api
  }) => {
    const created = await api.createCase()

    const response = await api.applyAction(created.id, 'approve', {})

    expect(response.status()).toBe(400)
    expect((await response.json()).detail).toBe(
      "Action 'approve' is not declared by case type 'CSoC'."
    )
  })

  test('refuses an action on a concluded case with 409', async ({ api }) => {
    const created = await api.createCase({ initialState: 'ACCEPTED' })

    const response = await api.applyAction(created.id, 'cancel', {
      decision: { reason: CANCEL_REASON }
    })

    expect(response.status()).toBe(409)
    expect((await response.json()).title).toBe('Action not allowed')
  })

  test('returns 404 for a case that does not exist', async ({ api }) => {
    const response = await api.applyAction(
      '01JZZZZZZZZZZZZZZZZZZZZZZZ',
      'accept',
      {}
    )

    expect(response.status()).toBe(404)
  })

  test('returns 404 for a case in another nation', async ({ api }) => {
    const created = await api.createCase({ nation: 'WALES' })

    const response = await api.applyAction(created.id, 'accept', {})

    expect(response.status()).toBe(404)
  })
})
