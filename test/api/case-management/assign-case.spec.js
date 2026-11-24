import {
  test,
  expect,
  sharedEnvironment,
  CHANGES_SHARED_DATA
} from './fixtures.js'
import { caseworker, otherCaseworker } from './client.js'

const assignToCaseworker = {
  assigneeId: caseworker.id,
  assigneeName: caseworker.name
}

// assign-case.yml, unassign-case.yml
test.describe('Assign and unassign case', () => {
  test.skip(sharedEnvironment, CHANGES_SHARED_DATA)

  test.describe('POST /cases/{id}/assign', () => {
    test('assigns the case to the caseworker', async ({ api }) => {
      const created = await api.createCase()

      const response = await api.assignCase(created.id, assignToCaseworker)

      expect(response.status()).toBe(200)
      expect(response.headers()['x-idempotent-replay']).toBeUndefined()
      const assigned = await response.json()
      expect(assigned).toMatchObject({
        assignedToId: caseworker.id,
        assignedToName: caseworker.name,
        assignedBy: caseworker.id,
        assignedAt: expect.any(String)
      })
      expect(assigned.timeline[0]).toMatchObject({
        action: 'assigned',
        performedById: caseworker.id,
        performedByName: caseworker.name,
        details: {
          assigneeId: caseworker.id,
          assigneeName: caseworker.name,
          previousAssigneeId: null
        }
      })
    })

    test('is a no-op when the case already has that assignee', async ({
      api
    }) => {
      const created = await api.createCase()
      await api.assignCase(created.id, assignToCaseworker)

      const response = await api.assignCase(created.id, assignToCaseworker)

      expect(response.status()).toBe(200)
      expect(response.headers()['x-idempotent-replay']).toBe('true')
      const { timeline } = await response.json()
      expect(timeline.filter((e) => e.action === 'assigned')).toHaveLength(1)
    })

    test('reassigns the case to another caseworker', async ({ api }) => {
      const created = await api.createCase()
      await api.assignCase(created.id, assignToCaseworker)

      const response = await api.assignCase(created.id, {
        assigneeId: otherCaseworker.id,
        assigneeName: otherCaseworker.name
      })

      expect(response.status()).toBe(200)
      const reassigned = await response.json()
      expect(reassigned.assignedToId).toBe(otherCaseworker.id)
      expect(reassigned.timeline[0].details).toMatchObject({
        assigneeId: otherCaseworker.id,
        previousAssigneeId: caseworker.id,
        previousAssigneeName: caseworker.name
      })
    })

    test('rejects a missing assigneeId with 400', async ({ api }) => {
      const created = await api.createCase()

      const response = await api.assignCase(created.id, {
        assigneeName: caseworker.name
      })

      expect(response.status()).toBe(400)
      expect((await response.json()).detail).toBe(
        "'assigneeId' is required and must be a non-empty string."
      )
    })

    test('returns 404 for a case that does not exist', async ({ api }) => {
      const response = await api.assignCase(
        '01JZZZZZZZZZZZZZZZZZZZZZZZ',
        assignToCaseworker
      )

      expect(response.status()).toBe(404)
    })

    test('returns 404 for a case in another nation', async ({ api }) => {
      const created = await api.createCase({ nation: 'WALES' })

      const response = await api.assignCase(created.id, assignToCaseworker)

      expect(response.status()).toBe(404)
    })

    test('refuses a concluded case with 409', async ({ api }) => {
      const created = await api.createCase({ initialState: 'CANCELLED' })

      const response = await api.assignCase(created.id, assignToCaseworker)

      expect(response.status()).toBe(409)
      expect((await response.json()).title).toBe('Action not allowed')
    })
  })

  test.describe('POST /cases/{id}/unassign', () => {
    test('removes the assignee', async ({ api }) => {
      const created = await api.createCase()
      await api.assignCase(created.id, assignToCaseworker)

      const response = await api.unassignCase(created.id)

      expect(response.status()).toBe(200)
      const unassigned = await response.json()
      expect(unassigned.assignedToId).toBeNull()
      expect(unassigned.assignedToName).toBeNull()
      expect(unassigned.timeline[0]).toMatchObject({
        action: 'unassigned',
        details: {
          previousAssigneeId: caseworker.id,
          previousAssigneeName: caseworker.name
        }
      })
    })

    test('is a no-op when the case has no assignee', async ({ api }) => {
      const created = await api.createCase()

      const response = await api.unassignCase(created.id)

      expect(response.status()).toBe(200)
      expect(response.headers()['x-idempotent-replay']).toBe('true')
      expect((await response.json()).timeline).toHaveLength(1)
    })

    test('returns 404 for a case that does not exist', async ({ api }) => {
      const response = await api.unassignCase('01JZZZZZZZZZZZZZZZZZZZZZZZ')

      expect(response.status()).toBe(404)
    })

    test('refuses a concluded case with 409', async ({ api }) => {
      const created = await api.createCase({ initialState: 'ACCEPTED' })

      const response = await api.unassignCase(created.id)

      expect(response.status()).toBe(409)
    })
  })
})
