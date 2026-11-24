import {
  test,
  expect,
  sharedEnvironment,
  CHANGES_SHARED_DATA
} from './fixtures.js'
import { caseworker } from './client.js'

const MAX_NOTE_LENGTH = 4000

// add-note.yml
test.describe('Add note (POST /cases/{id}/notes)', () => {
  test.skip(sharedEnvironment, CHANGES_SHARED_DATA)

  test('adds the note to the timeline', async ({ api }) => {
    const created = await api.createCase()

    const response = await api.addNote(created.id, { text: 'Test note.' })

    expect(response.status()).toBe(200)
    const { timeline, stateId } = await response.json()
    expect(stateId).toBe('SUBMITTED')
    expect(timeline[0]).toMatchObject({
      action: 'note-added',
      actionDisplayName: 'Note added',
      performedById: caseworker.id,
      performedByName: caseworker.name,
      details: { text: 'Test note.' }
    })
  })

  test('trims leading and trailing whitespace', async ({ api }) => {
    const created = await api.createCase()

    const response = await api.addNote(created.id, { text: '  Padded note.\n' })

    expect((await response.json()).timeline[0].details.text).toBe(
      'Padded note.'
    )
  })

  test(`accepts a note of ${MAX_NOTE_LENGTH} characters`, async ({ api }) => {
    const created = await api.createCase()

    const response = await api.addNote(created.id, {
      text: 'a'.repeat(MAX_NOTE_LENGTH)
    })

    expect(response.status()).toBe(200)
  })

  test(`rejects a note over ${MAX_NOTE_LENGTH} characters with 400`, async ({
    api
  }) => {
    const created = await api.createCase()

    const response = await api.addNote(created.id, {
      text: 'a'.repeat(MAX_NOTE_LENGTH + 1)
    })

    expect(response.status()).toBe(400)
    expect((await response.json()).detail).toBe(
      `Note text must be ${MAX_NOTE_LENGTH} characters or fewer.`
    )
  })

  test('rejects a blank note with 400', async ({ api }) => {
    const created = await api.createCase()

    const response = await api.addNote(created.id, { text: '   ' })

    expect(response.status()).toBe(400)
    expect((await response.json()).detail).toBe(
      "'text' is required and must be a non-empty string."
    )
  })

  test('adds a note to a concluded case', async ({ api }) => {
    const created = await api.createCase({ initialState: 'ACCEPTED' })

    const response = await api.addNote(created.id, { text: 'After the fact.' })

    expect(response.status()).toBe(200)
    expect((await response.json()).timeline[0].action).toBe('note-added')
  })

  test('returns 404 for a case that does not exist', async ({ api }) => {
    const response = await api.addNote('01JZZZZZZZZZZZZZZZZZZZZZZZ', {
      text: 'Test note.'
    })

    expect(response.status()).toBe(404)
  })

  test('returns 404 for a case in another nation', async ({ api }) => {
    const created = await api.createCase({ nation: 'SCOTLAND' })

    const response = await api.addNote(created.id, { text: 'Test note.' })

    expect(response.status()).toBe(404)
  })
})
