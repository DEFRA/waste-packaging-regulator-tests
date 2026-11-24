import {
  test,
  expect,
  sharedEnvironment,
  CHANGES_SHARED_DATA
} from './fixtures.js'
import { caseworker } from './client.js'

// get-case.yml
test.describe('Get case (GET /cases/{id})', () => {
  test('returns 404 for a case id that does not exist', async ({ api }) => {
    const response = await api.getCase('01JZZZZZZZZZZZZZZZZZZZZZZZ')

    expect(response.status()).toBe(404)
  })

  test('returns an existing case with its timeline', async ({ api }) => {
    const list = await api.listCases({ pageSize: 1 })
    const [existing] = (await list.json()).items
    test.skip(!existing, 'No cases in this environment')

    const response = await api.getCase(existing.id)

    expect(response.status()).toBe(200)
    const found = await response.json()
    expect(found).toMatchObject({
      id: existing.id,
      nation: caseworker.nation
    })
    expect(found.timeline.length).toBeGreaterThan(0)
  })

  test.describe('with a new case', () => {
    test.skip(sharedEnvironment, CHANGES_SHARED_DATA)

    test('returns the case as submitted', async ({ api }) => {
      const created = await api.createCase()

      const response = await api.getCase(created.id)

      expect(response.status()).toBe(200)
      // The create response carries the server's clock to the microsecond;
      // MongoDB keeps milliseconds, so compare everything but the times.
      const { submittedAt, lastModifiedAt, timeline, ...fields } = created
      const found = await response.json()
      expect(found).toMatchObject(fields)
      expect(Date.parse(found.submittedAt)).toBe(Date.parse(submittedAt))
      expect(found.timeline.map((entry) => entry.id)).toEqual(
        timeline.map((entry) => entry.id)
      )
    })

    test('lists the timeline newest entry first', async ({ api }) => {
      const created = await api.createCase()
      await api.addNote(created.id, { text: 'First note.' })
      await api.addNote(created.id, { text: 'Second note.' })

      const response = await api.getCase(created.id)

      const { timeline } = await response.json()
      expect(timeline.map((entry) => entry.action)).toEqual([
        'note-added',
        'note-added',
        'case-created'
      ])
      expect(timeline[0].details.text).toBe('Second note.')
    })

    test('returns 404 for a case in another nation', async ({ api }) => {
      const created = await api.createCase({ nation: 'WALES' })

      const response = await api.getCase(created.id)

      expect(response.status()).toBe(404)
    })

    test('returns the case to a caseworker in its nation', async ({ api }) => {
      const created = await api.createCase({ nation: 'SCOTLAND' })

      const response = await api.getCase(created.id, {
        user: { ...caseworker, nation: 'SCOTLAND' }
      })

      expect(response.status()).toBe(200)
      expect((await response.json()).nation).toBe('SCOTLAND')
    })
  })
})
