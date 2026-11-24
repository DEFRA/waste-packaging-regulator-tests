import { test, expect } from './fixtures.js'

// health.yml, health-ready.yml, openapi.yml. All three are anonymous.
test.describe('Case management health and OpenAPI', () => {
  test('liveness returns 200 Healthy', async ({ api }) => {
    const response = await api.health()

    expect(response.status()).toBe(200)
    expect(await response.text()).toBe('Healthy')
  })

  test('readiness returns 200 Healthy', async ({ api }) => {
    const response = await api.ready()

    expect(response.status()).toBe(200)
    expect(await response.text()).toBe('Healthy')
  })

  test('OpenAPI document describes every case endpoint', async ({ api }) => {
    const response = await api.openApi()

    expect(response.status()).toBe(200)
    const document = await response.json()
    expect(document.openapi).toMatch(/^3\./)
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining([
        '/cases',
        '/cases/{id}',
        '/cases/{id}/actions/{actionId}',
        '/cases/{id}/assign',
        '/cases/{id}/unassign',
        '/cases/{id}/notes'
      ])
    )
  })
})
