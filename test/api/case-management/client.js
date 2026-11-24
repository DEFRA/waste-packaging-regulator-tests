import { createHmac, randomUUID } from 'node:crypto'

// Callers and headers mirror the Bruno collection in
// waste-regulator-case-management/bruno (opencollection.yml): POST /cases is
// sent as the Case Intake Processor, every other request as the regulator
// frontend acting for a caseworker.
export const CASE_INTAKE_CLIENT_ID = 'case-intake-processor'
export const FRONTEND_CLIENT_ID = 'frontend'

export const caseworker = {
  id: 'f42cb9a0-8365-4624-a788-e856735dcaaa',
  name: 'Test Caseworker',
  email: 'test.caseworker@regulator.example',
  nation: 'ENGLAND'
}

export const otherCaseworker = {
  id: '3b7d1c55-2f4e-4c8a-9a61-0e2d6f8b4a17',
  name: 'Other Caseworker',
  email: 'other.caseworker@regulator.example',
  nation: 'ENGLAND'
}

// The secrets are only set for deployed environments. Locally the service
// runs in Development and trusts unsigned headers.
const secrets = {
  [CASE_INTAKE_CLIENT_ID]: process.env.AUTH_SHARED_SECRET__CASE_INTAKE,
  [FRONTEND_CLIENT_ID]: process.env.AUTH_SHARED_SECRET__MANAGEMENT_FE
}

// Signs the request as described in the service's BFF signing contract
// (docs/cdp-deployment.md): the nine-line v3 form, HMAC-SHA256, base64.
function signedHeaders(clientId, user) {
  const secret = secrets[clientId]
  if (!secret) return {}

  const timestamp = new Date().toISOString()
  const nonce = `${Date.now()}-${randomUUID()}`
  const payload = [
    'v3',
    clientId,
    user?.id ?? '',
    user?.name ?? '',
    '',
    user?.nation ?? '',
    user?.email ?? '',
    timestamp,
    nonce
  ].join('\n')

  return {
    'x-cdp-auth-timestamp': timestamp,
    'x-cdp-auth-nonce': nonce,
    'x-cdp-auth-signature': createHmac('sha256', secret)
      .update(payload)
      .digest('base64')
  }
}

function apiKeyHeader() {
  return process.env.CDP_API_KEY ? { 'x-api-key': process.env.CDP_API_KEY } : {}
}

export function intakeHeaders() {
  return {
    ...apiKeyHeader(),
    'x-cdp-client-id': CASE_INTAKE_CLIENT_ID,
    ...signedHeaders(CASE_INTAKE_CLIENT_ID)
  }
}

// A user property left null is not sent, e.g. { ...caseworker, nation: null }
// for a caller with no nation.
export function caseworkerHeaders(user = caseworker) {
  const userHeaders = {
    'x-cdp-user-id': user.id,
    'x-cdp-user-name': user.name,
    'x-cdp-user-nation': user.nation,
    'x-cdp-user-email': user.email
  }
  return {
    ...apiKeyHeader(),
    'x-cdp-client-id': FRONTEND_CLIENT_ID,
    ...Object.fromEntries(
      Object.entries(userHeaders).filter(([, value]) => value != null)
    ),
    ...signedHeaders(FRONTEND_CLIENT_ID, user)
  }
}

export function caseSubmission(overrides = {}) {
  return {
    caseType: 'CSoC',
    sourceSystemId: randomUUID(),
    callbackUrl: 'https://source-system.example/submissions/callback',
    nation: caseworker.nation,
    orgId: randomUUID(),
    producerType: 'DIRECT_PRODUCER',
    ...overrides
  }
}

// Thin wrappers over each endpoint in the Bruno collection. Each returns the
// raw APIResponse so specs can assert on status and headers as well as body.
export class CaseManagementApi {
  constructor(request) {
    this.request = request
  }

  health() {
    return this.request.get('health', { headers: apiKeyHeader() })
  }

  ready() {
    return this.request.get('health/ready', { headers: apiKeyHeader() })
  }

  openApi() {
    return this.request.get('openapi/v1.json', { headers: apiKeyHeader() })
  }

  submitCase(body, { headers = intakeHeaders() } = {}) {
    return this.request.post('cases', { headers, data: body })
  }

  // Submits a case and returns its body, failing the test if it wasn't created.
  async createCase(overrides = {}) {
    const response = await this.submitCase(caseSubmission(overrides))
    if (response.status() !== 201) {
      throw new Error(
        `Creating a case returned ${response.status()}: ${await response.text()}`
      )
    }
    return response.json()
  }

  getCase(id, { user = caseworker, headers = caseworkerHeaders(user) } = {}) {
    return this.request.get(`cases/${encodeURIComponent(id)}`, { headers })
  }

  listCases(
    params = {},
    { user = caseworker, headers = caseworkerHeaders(user) } = {}
  ) {
    return this.request.get('cases', { headers, params })
  }

  assignCase(id, body, { user = caseworker } = {}) {
    return this.request.post(`cases/${encodeURIComponent(id)}/assign`, {
      headers: caseworkerHeaders(user),
      data: body
    })
  }

  unassignCase(id, { user = caseworker } = {}) {
    return this.request.post(`cases/${encodeURIComponent(id)}/unassign`, {
      headers: caseworkerHeaders(user)
    })
  }

  addNote(id, body, { user = caseworker } = {}) {
    return this.request.post(`cases/${encodeURIComponent(id)}/notes`, {
      headers: caseworkerHeaders(user),
      data: body
    })
  }

  applyAction(id, actionId, body, { user = caseworker } = {}) {
    return this.request.post(
      `cases/${encodeURIComponent(id)}/actions/${encodeURIComponent(actionId)}`,
      { headers: caseworkerHeaders(user), data: body }
    )
  }
}
