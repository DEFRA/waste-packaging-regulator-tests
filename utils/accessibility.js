import { test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'fs'
import path from 'path'

const TEMP_DIR = path.join(process.cwd(), '.accessibility-results')

export async function analyzeAccessibility(page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze()

  const violations = results.violations.filter((v) => v.nodes.length > 0)

  await test.info().attach('WCAG Analysis', {
    body: JSON.stringify(violations, null, 2),
    contentType: 'application/json'
  })

  if (violations.length > 0) {
    // Written per-test to disk so the reporter can aggregate across parallel workers
    fs.mkdirSync(TEMP_DIR, { recursive: true })
    fs.writeFileSync(
      path.join(TEMP_DIR, `${test.info().testId}.json`),
      JSON.stringify(
        { title: test.info().title, url: page.url(), violations },
        null,
        2
      )
    )

    for (const v of violations) {
      await test.step(`[${v.impact}] ${v.id}: ${v.description}`, async () => {})
    }

    await test.info().attach('Accessibility Assessment', {
      body: buildViolationsHtml(test.info().title, page.url(), violations),
      contentType: 'text/html'
    })

    const summary = `Accessibility violations found: ${violations.length} violation(s) on ${page.url()}`
    const error = new Error(summary)
    error.stack = summary
    throw error
  }
}

function buildViolationsHtml(title, url, violations) {
  const rows = violations
    .map(
      (v) => `
    <tr>
      <td class="${v.impact ?? 'unknown'}">${v.impact ?? 'unknown'}</td>
      <td><a href="${v.helpUrl}" target="_blank">${v.id}</a></td>
      <td>${v.description}</td>
    </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Accessibility Assessment</title>
  <style>
    body { font-family: sans-serif; font-size: 14px; padding: 2rem; max-width: 1100px; margin: 0 auto; }
    h1 { font-size: 1.4rem; }
    p.url { color: #555; font-size: 12px; margin: 0 0 1rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; vertical-align: top; }
    th { background: #f4f4f4; }
    .critical { color: #c00; font-weight: bold; }
    .serious  { color: #c44; font-weight: bold; }
    .moderate { color: #c80; }
    .minor    { color: #888; }
  </style>
</head>
<body>
  <h1>${title} — ${violations.length} violation(s)</h1>
  <p class="url">${url}</p>
  <table>
    <thead><tr><th>Impact</th><th>Rule</th><th>Description</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`
}
