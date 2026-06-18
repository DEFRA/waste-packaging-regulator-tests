import dotenv from 'dotenv'

const env = process.env.ENVIRONMENT || 'dev'
dotenv.config({ path: `.env.${env}` })

const BASE_URL = process.env.API_BASE_URL

const ORGANISATIONS = 'organisations'
const COMPLIANCE_DECLARATIONS = 'compliance-declarations'

export const authHeaders = {
  'x-api-key': process.env.API_KEY,
  Authorization: process.env.API_AUTH_HEADER,
  'Content-Type': 'application/json'
}

const endpoints = {
  list: (orgId) =>
    `${BASE_URL}/${ORGANISATIONS}/${orgId}/${COMPLIANCE_DECLARATIONS}`,
  byId: (orgId, declarationId) =>
    `${BASE_URL}/${ORGANISATIONS}/${orgId}/${COMPLIANCE_DECLARATIONS}/${declarationId}`
}

export const complianceDeclarationsApi = {
  getList: (request, orgId, obligationYear, headers = authHeaders) =>
    request.get(endpoints.list(orgId), {
      ...(obligationYear !== undefined && { params: { obligationYear } }),
      ...(headers !== null && { headers })
    }),

  getById: (request, orgId, declarationId, headers = authHeaders) =>
    request.get(endpoints.byId(orgId, declarationId), {
      ...(headers !== null && { headers })
    })
}
