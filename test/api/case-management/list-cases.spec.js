import { randomUUID } from 'node:crypto'
import {
  test,
  expect,
  sharedEnvironment,
  CHANGES_SHARED_DATA
} from './fixtures.js'
import { caseworker, otherCaseworker } from './client.js'

// list-cases.yml
test.describe('List cases (GET /cases)', () => {
  test('returns a page of cases in the caller nation', async ({ api }) => {
    const response = await api.listCases({ pageSize: 20 })

    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      items: expect.any(Array),
      totalCount: expect.any(Number),
      page: 1,
      pageSize: 20
    })
    expect(body.items.length).toBeLessThanOrEqual(20)
    for (const item of body.items) {
      expect(item.nation).toBe(caseworker.nation)
      expect(item).not.toHaveProperty('timeline')
    }
  })

  test('defaults to page 1 of 20', async ({ api }) => {
    const response = await api.listCases()

    expect(response.status()).toBe(200)
    expect(await response.json()).toMatchObject({ page: 1, pageSize: 20 })
  })

  test('caps pageSize at 100', async ({ api }) => {
    const response = await api.listCases({ pageSize: 500 })

    expect(response.status()).toBe(200)
    expect((await response.json()).pageSize).toBe(100)
  })

  test('lists newest submission first', async ({ api }) => {
    const response = await api.listCases({ pageSize: 100 })

    const submittedAt = (await response.json()).items.map((i) =>
      Date.parse(i.submittedAt)
    )
    expect(submittedAt).toEqual([...submittedAt].sort((a, b) => b - a))
  })

  test('rejects a page beyond 1000 with 400', async ({ api }) => {
    const response = await api.listCases({ page: 1001 })

    expect(response.status()).toBe(400)
    expect((await response.json()).title).toBe('Page out of range')
  })

  test.describe('filters', () => {
    test.skip(sharedEnvironment, CHANGES_SHARED_DATA)

    // Every case in a test shares a fresh orgId, so filtering on it isolates
    // the test from every other case in the database.
    let orgId
    test.beforeEach(() => {
      orgId = randomUUID()
    })

    test('by orgId', async ({ api }) => {
      const first = await api.createCase({ orgId })
      const second = await api.createCase({ orgId })

      const response = await api.listCases({ orgId })

      const body = await response.json()
      expect(body.totalCount).toBe(2)
      expect(body.items.map((i) => i.id)).toEqual([second.id, first.id])
    })

    test('by stateId and isTerminal', async ({ api }) => {
      const open = await api.createCase({ orgId })
      const accepted = await api.createCase({ orgId, initialState: 'ACCEPTED' })

      const byState = await (
        await api.listCases({ orgId, stateId: 'ACCEPTED' })
      ).json()
      const openOnly = await (
        await api.listCases({ orgId, isTerminal: false })
      ).json()
      const concludedOnly = await (
        await api.listCases({ orgId, isTerminal: true })
      ).json()

      expect(byState.items.map((i) => i.id)).toEqual([accepted.id])
      expect(openOnly.items.map((i) => i.id)).toEqual([open.id])
      expect(concludedOnly.items.map((i) => i.id)).toEqual([accepted.id])
    })

    test('by assigneeId and unassigned', async ({ api }) => {
      const mine = await api.createCase({ orgId })
      const theirs = await api.createCase({ orgId })
      const nobodys = await api.createCase({ orgId })
      await api.assignCase(mine.id, { assigneeId: caseworker.id })
      await api.assignCase(theirs.id, { assigneeId: otherCaseworker.id })

      const assignedToMe = await (
        await api.listCases({ orgId, assigneeId: caseworker.id })
      ).json()
      const unassigned = await (
        await api.listCases({ orgId, unassigned: true })
      ).json()
      const mineOrUnassigned = await (
        await api.listCases({
          orgId,
          assigneeId: caseworker.id,
          unassigned: true
        })
      ).json()

      expect(assignedToMe.items.map((i) => i.id)).toEqual([mine.id])
      expect(unassigned.items.map((i) => i.id)).toEqual([nobodys.id])
      expect(mineOrUnassigned.items.map((i) => i.id).sort()).toEqual(
        [mine.id, nobodys.id].sort()
      )
    })

    test('by search on the start of the case id, ignoring case', async ({
      api
    }) => {
      const created = await api.createCase({ orgId })

      const response = await api.listCases({
        orgId,
        search: created.id.slice(0, 20).toLowerCase()
      })

      expect((await response.json()).items.map((i) => i.id)).toEqual([
        created.id
      ])
    })

    test('excludes cases in another nation', async ({ api }) => {
      await api.createCase({ orgId, nation: 'N_IRELAND' })

      const response = await api.listCases({ orgId })

      expect((await response.json()).totalCount).toBe(0)
    })

    test('pages through the matching cases', async ({ api }) => {
      const created = []
      for (let i = 0; i < 3; i++) created.push(await api.createCase({ orgId }))
      const newestFirst = created.map((c) => c.id).reverse()

      const page1 = await (await api.listCases({ orgId, pageSize: 2 })).json()
      const page2 = await (
        await api.listCases({ orgId, pageSize: 2, page: 2 })
      ).json()

      expect(page1).toMatchObject({ totalCount: 3, page: 1, pageSize: 2 })
      expect(page1.items.map((i) => i.id)).toEqual(newestFirst.slice(0, 2))
      expect(page2.items.map((i) => i.id)).toEqual(newestFirst.slice(2))
    })
  })
})
