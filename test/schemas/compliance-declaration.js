import Ajv from 'ajv'

const ajv = new Ajv({ allErrors: true })
ajv.addFormat('date-time', (value) => !isNaN(new Date(value).getTime()))

const auditEntrySchema = {
  type: 'object',
  required: ['user', 'timestamp', 'action'],
  additionalProperties: true,
  properties: {
    user: {
      type: 'object',
      required: ['id', 'email'],
      additionalProperties: true,
      properties: {
        id: { type: 'string' },
        email: { type: 'string' }
      }
    },
    timestamp: { type: 'string', format: 'date-time' },
    action: { type: 'string' }
  }
}

const organisationSchema = {
  type: 'object',
  required: ['id', 'registrationType', 'regulator', 'regulatorEmail'],
  additionalProperties: true,
  properties: {
    id: { type: 'string' },
    registrationType: {
      type: 'string',
      enum: ['DirectProducer', 'ComplianceScheme']
    },
    regulator: { type: 'string' },
    regulatorEmail: { type: 'string' }
  }
}

const declarationTextSchema = {
  type: 'object',
  required: ['text', 'language'],
  additionalProperties: true,
  properties: {
    text: { type: 'string', minLength: 1 },
    language: { type: 'string' }
  }
}

export const complianceDeclarationSchema = {
  type: 'object',
  required: [
    'id',
    'created',
    'updated',
    'status',
    'organisation',
    'obligationYear',
    'obligations',
    'obligationStatus',
    'declarationText',
    'submitterName',
    'isRegulation43Compliant',
    'audit'
  ],
  additionalProperties: true,
  properties: {
    id: { type: 'string' },
    created: { type: 'string', format: 'date-time' },
    updated: { type: 'string', format: 'date-time' },
    status: { type: 'string', enum: ['Submitted', 'Accepted', 'Cancelled'] },
    organisation: organisationSchema,
    obligationYear: { type: 'integer' },
    obligations: { type: 'array' },
    obligationStatus: { type: 'string', enum: ['Met', 'NotMet'] },
    declarationText: declarationTextSchema,
    submitterName: { type: 'string' },
    isRegulation43Compliant: { type: 'boolean' },
    audit: { type: 'array', items: auditEntrySchema }
  }
}

export const complianceDeclarationsListSchema = {
  type: 'object',
  required: ['complianceDeclarations'],
  additionalProperties: true,
  properties: {
    complianceDeclarations: {
      type: 'array',
      items: complianceDeclarationSchema
    }
  }
}

export function validateSchema(schema, data) {
  const validate = ajv.compile(schema)
  const valid = validate(data)
  return { valid, errors: validate.errors ?? [] }
}
