// Callers and headers mirror the Waste-Obligations.API Postman collection:
// every request is a GET sent with HTTP Basic auth as an ApiKey client of the
// service's ACL, plus the CDP gateway's x-api-key on deployed environments.
//
// Deployed, the regulator frontend's client is used
// (WastePackagingRegulatorsFrontend, secret in WASTE_OBLIGATIONS_API_CLIENT_SECRET
// — the same variable name as the Postman collection). Locally the service runs
// in Development, whose appsettings define a "Developer" client.
const local = ['local', 'github'].includes(process.env.ENVIRONMENT)

export const client = {
  id:
    process.env.WASTE_OBLIGATIONS_API_CLIENT_ID ??
    (local ? 'Developer' : 'WastePackagingRegulatorsFrontend'),
  secret:
    process.env.WASTE_OBLIGATIONS_API_CLIENT_SECRET ??
    (local ? 'developer-pwd' : undefined)
}

// The service caps obligationYear and page sizes; see Dtos/ObligationYear.cs
// and Dtos/Paging.cs in waste-obligations.
export const OBLIGATION_YEAR = Number(
  process.env.WASTE_OBLIGATIONS_OBLIGATION_YEAR ?? 2026
)
export const MIN_OBLIGATION_YEAR = 2023
export const MAX_OBLIGATION_YEAR = 2050
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
  return process.env.CDP_API_KEY ? { 'x-api-key': process.env.CDP_API_KEY } : {}
}

export function authHeaders() {
  if (!client.secret) {
    throw new Error(
      'WASTE_OBLIGATIONS_API_CLIENT_SECRET is not set. It is the Basic auth password for the WastePackagingRegulatorsFrontend client.'
    )
  }
  const credentials = Buffer.from(`${client.id}:${client.secret}`)
  return {
    ...apiKeyHeader(),
    authorization: `Basic ${credentials.toString('base64')}`
  }
}

// Thin wrappers over each request in the Postman collection. Each returns the
// raw APIResponse so specs can assert on status and headers as well as body.
export class WasteObligationsApi {
  constructor(request) {
    this.request = request
  }

  // GET /compliance-declarations — "compliance-declarations"
  searchComplianceDeclarations(params = {}, { headers = authHeaders() } = {}) {
    return this.request.get('compliance-declarations', { headers, params })
  }

  // GET /compliance-declarations/unsubmitted — "compliance-declarations Unsubmitted"
  searchUnsubmitted(params = {}, { headers = authHeaders() } = {}) {
    return this.request.get('compliance-declarations/unsubmitted', {
      headers,
      params
    })
  }

  // GET /organisations/{id}/obligations — "compliance-declarations Org Details"
  readObligations(
    organisationId,
    params = {},
    { headers = authHeaders() } = {}
  ) {
    return this.request.get(
      `organisations/${encodeURIComponent(organisationId)}/obligations`,
      { headers, params }
    )
  }

  // GET /organisations/{id}/compliance-declarations/{id}
  readComplianceDeclaration(
    organisationId,
    complianceDeclarationId,
    { headers = authHeaders() } = {}
  ) {
    return this.request.get(
      `organisations/${encodeURIComponent(organisationId)}/compliance-declarations/${encodeURIComponent(complianceDeclarationId)}`,
      { headers }
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
