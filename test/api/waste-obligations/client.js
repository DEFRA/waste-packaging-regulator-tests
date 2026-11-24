// Callers and headers mirror the Waste-Obligations.API Postman collection:
// every request is a GET sent with HTTP Basic auth as an ApiKey client of the
// service's ACL, plus the CDP gateway's x-api-key on deployed environments.
//
// Deployed, the regulator frontend's client is used
// (WastePackagingRegulatorsFrontend, secret in WASTE_OBLIGATIONS_API_CLIENT_SECRET
// — the same variable name as the Postman collection). Locally the service runs
// in Development, whose appsettings define a "Developer" client.
const local = ['local', 'github'].includes(process.env.ENVIRONMENT)

// The .env files list these variables with blank values, so a blank (or
// whitespace-only) value means "not set" and falls back to the default.
function envValue(name) {
  return process.env[name]?.trim() || undefined
}

const client = {
  id:
    envValue('WASTE_OBLIGATIONS_API_CLIENT_ID') ??
    (local ? 'Developer' : 'WastePackagingRegulatorsFrontend'),
  secret:
    envValue('WASTE_OBLIGATIONS_API_CLIENT_SECRET') ??
    (local ? 'developer-pwd' : undefined)
}

// Page sizes match Dtos/Paging.cs in waste-obligations.
export const OBLIGATION_YEAR = obligationYear(
  envValue('WASTE_OBLIGATIONS_OBLIGATION_YEAR') ?? '2026'
)

function obligationYear(value) {
  const year = Number(value)
  if (!Number.isInteger(year)) {
    throw new Error(
      `WASTE_OBLIGATIONS_OBLIGATION_YEAR must be a whole year, e.g. 2026; got "${value}".`
    )
  }
  return year
}
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

export const DECLARATION_STATUSES = ['Submitted', 'Accepted', 'Cancelled']
export const REGISTRATION_TYPES = ['DirectProducer', 'ComplianceScheme']
export const BUSINESS_COUNTRIES = ['GB-ENG', 'GB-NIR', 'GB-SCT', 'GB-WLS']
export const MATERIALS = [
  'Plastic',
  'Glass',
  'Aluminium',
  'Steel',
  'Wood',
  'GlassRemelt',
  'Paper'
]
export const OBLIGATION_STATUSES = ['NoDataYet', 'Met', 'NotMet']

function apiKeyHeader() {
  const apiKey = envValue('CDP_API_KEY')
  return apiKey ? { 'x-api-key': apiKey } : {}
}

function authHeaders() {
  if (!client.secret) {
    throw new Error(
      `WASTE_OBLIGATIONS_API_CLIENT_SECRET is not set. It is the Basic auth password for the ${client.id} client.`
    )
  }
  const credentials = Buffer.from(`${client.id}:${client.secret}`)
  return {
    ...apiKeyHeader(),
    authorization: `Basic ${credentials.toString('base64')}`
  }
}

// Thin wrappers over the endpoints the specs call. Each returns the raw
// APIResponse so specs can assert on status and headers as well as body.
export class WasteObligationsApi {
  constructor(request) {
    this.request = request
  }

  // GET /compliance-declarations — "compliance-declarations"
  searchComplianceDeclarations(params = {}) {
    return this.request.get('compliance-declarations', {
      headers: authHeaders(),
      params
    })
  }

  // GET /compliance-declarations/unsubmitted — "compliance-declarations Unsubmitted"
  searchUnsubmitted(params = {}) {
    return this.request.get('compliance-declarations/unsubmitted', {
      headers: authHeaders(),
      params
    })
  }

  // GET /organisations/{id}/obligations — "compliance-declarations Org Details"
  readObligations(organisationId, params = {}) {
    return this.request.get(
      `organisations/${encodeURIComponent(organisationId)}/obligations`,
      { headers: authHeaders(), params }
    )
  }

  // Returns the first page of declarations matching params, failing the test
  // if the search itself fails.
  async findComplianceDeclarations(params = {}) {
    const response = await this.searchComplianceDeclarations({
      pageSize: MAX_PAGE_SIZE,
      ...params
    })
    if (response.status() !== 200) {
      throw new Error(
        `Searching compliance declarations returned ${response.status()}: ${await response.text()}`
      )
    }
    return (await response.json()).complianceDeclarations
  }
}
