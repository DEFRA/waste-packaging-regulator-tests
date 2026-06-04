import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

export async function analyzeAccessibility(page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze()

  await test.info().attach('WCAG Analysis', {
    body: JSON.stringify(results.violations, null, 2),
    contentType: 'application/json'
  })

  const unexpectedViolations = extractUnexpectedViolations(results.violations)
  expect(unexpectedViolations).toEqual([])
}

function extractUnexpectedViolations(violations) {
  return violations.filter((violation) => violation.nodes.length > 0)
}
