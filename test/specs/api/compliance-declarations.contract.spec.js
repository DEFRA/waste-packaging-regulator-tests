import { test, expect } from '@playwright/test'
import { complianceDeclarationsApi } from '../../../utils/api/compliance-declarations.js'
import {
  complianceDeclarationSchema,
  complianceDeclarationsListSchema,
  validateSchema
} from '../../schemas/compliance-declaration.js'

const ORG_ID = 'ab4e1532-fbfa-4ca9-a26e-9e9ff28d2cfe'
const DECLARATION_ID = '6a1d4ef59c5f57ed64fb2a21'
const OBLIGATION_YEAR = 2026

test.describe('Compliance Declarations API - Contract Tests', () => {
  test.describe('GET /organisations/{organisationId}/compliance-declarations', () => {
    test('list response matches schema', async ({ request }) => {
      const response = await complianceDeclarationsApi.getList(
        request,
        ORG_ID,
        OBLIGATION_YEAR
      )
      const body = await response.json()

      const { valid, errors } = validateSchema(
        complianceDeclarationsListSchema,
        body
      )
      expect(valid, `Schema errors:\n${JSON.stringify(errors, null, 2)}`).toBe(
        true
      )
    })

    test('each declaration in list matches schema', async ({ request }) => {
      const response = await complianceDeclarationsApi.getList(
        request,
        ORG_ID,
        OBLIGATION_YEAR
      )
      const { complianceDeclarations } = await response.json()

      for (const declaration of complianceDeclarations) {
        const { valid, errors } = validateSchema(
          complianceDeclarationSchema,
          declaration
        )
        expect(
          valid,
          `Schema errors for declaration ${declaration.id}:\n${JSON.stringify(errors, null, 2)}`
        ).toBe(true)
      }
    })
  })

  test.describe('GET /organisations/{organisationId}/compliance-declarations/{complianceDeclarationId}', () => {
    test('single declaration response matches schema', async ({ request }) => {
      const response = await complianceDeclarationsApi.getById(
        request,
        ORG_ID,
        DECLARATION_ID
      )
      const body = await response.json()

      const { valid, errors } = validateSchema(
        complianceDeclarationSchema,
        body
      )
      expect(valid, `Schema errors:\n${JSON.stringify(errors, null, 2)}`).toBe(
        true
      )
    })
  })
})
