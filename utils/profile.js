const VALID = ['functional', 'accessibility', 'security']

const value = (process.env.PROFILE ?? 'functional').toLowerCase()

if (!VALID.includes(value)) {
  throw new Error(
    `Invalid PROFILE "${value}". Must be one of: ${VALID.join(', ')}`
  )
}

export const isFunctional = value === 'functional'
export const isAccessibility = value === 'accessibility'
export const isSecurity = value === 'security'
