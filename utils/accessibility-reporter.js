import fs from 'fs'
import path from 'path'
import { isAccessibility } from './profile.js'

const TEMP_DIR = path.join(process.cwd(), '.accessibility-results')
const REPORT_PATH = path.join(
  process.cwd(),
  'playwright-report',
  'accessibility-assessment.html'
)
const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor']

export default class AccessibilityReporter {
  async onEnd() {
    // Only the accessibility profile should produce this file at all — for
    // other profiles TEMP_DIR never exists and nothing should be written.
    if (!isAccessibility) return

    // A clean run (zero violations) never creates TEMP_DIR, since
    // analyzeAccessibility() only writes to it when violations are found.
    // Still write a (empty) report in that case — bin/publish-tests.sh
    // requires this file to exist for the accessibility profile, and "no
    // violations" is a valid, publishable outcome, not a missing artifact.
    const files = fs.existsSync(TEMP_DIR)
      ? fs.readdirSync(TEMP_DIR).filter((f) => f.endsWith('.json'))
      : []

    const results = files.map((f) =>
      JSON.parse(fs.readFileSync(path.join(TEMP_DIR, f), 'utf-8'))
    )

    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true })
    fs.writeFileSync(REPORT_PATH, buildReport(results))
    writeAllureFiles(results)
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true })
    }

    console.log(`\n  Accessibility assessment: file://${REPORT_PATH}\n`) // eslint-disable-line no-console
  }
}

function writeAllureFiles(results) {
  const allureResultsDir = path.join(process.cwd(), 'allure-results')
  if (!fs.existsSync(allureResultsDir)) return

  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 }
  for (const { violations } of results) {
    for (const v of violations) {
      if (counts[v.impact] !== undefined) counts[v.impact]++
    }
  }

  fs.writeFileSync(
    path.join(allureResultsDir, 'environment.properties'),
    [
      `Accessibility Tests Affected=${results.length}`,
      `${counts.critical} Critical Accessibility Violations`,
      `${counts.serious} Serious Accessibility Violations`,
      `${counts.moderate} Moderate Accessibility Violations`,
      `${counts.minor} Minor Accessibility Violations`
    ].join('\n')
  )

  fs.writeFileSync(
    path.join(allureResultsDir, 'categories.json'),
    JSON.stringify(
      [
        {
          name: 'Accessibility Violations',
          messageRegex: '.*Accessibility violations found.*',
          matchedStatuses: ['failed']
        }
      ],
      null,
      2
    )
  )
}

function buildReport(results) {
  const totalViolations = results.reduce(
    (sum, r) => sum + r.violations.length,
    0
  )

  const sections = results
    .map(({ title, url, violations }) => {
      const sorted = [...violations].sort(
        (a, b) =>
          IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact)
      )

      const rows = sorted
        .map(
          (v) => `
      <tr>
        <td class="${v.impact ?? 'unknown'}">${v.impact ?? 'unknown'}</td>
        <td><a href="${v.helpUrl}" target="_blank">${v.id}</a></td>
        <td>${v.description}</td>
        <td>${v.nodes.length}</td>
      </tr>`
        )
        .join('')

      return `
    <section>
      <h2>${title}</h2>
      <p class="url">${url}</p>
      <table>
        <thead><tr><th>Impact</th><th>Rule</th><th>Description</th><th>Nodes</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Accessibility Assessment</title>
  <style>
    body { font-family: sans-serif; font-size: 14px; padding: 2rem; max-width: 1100px; margin: 0 auto; }
    h1 { font-size: 1.4rem; }
    h2 { font-size: 1.1rem; margin-top: 2rem; margin-bottom: 0.25rem; }
    p.url { color: #555; font-size: 12px; margin: 0 0 0.75rem; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 1.5rem; }
    th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; vertical-align: top; }
    th { background: #f4f4f4; }
    .critical { color: #c00; font-weight: bold; }
    .serious  { color: #c44; font-weight: bold; }
    .moderate { color: #c80; }
    .minor    { color: #888; }
  </style>
</head>
<body>
  <h1>Accessibility Assessment — ${totalViolations} violation(s) across ${results.length} test(s)</h1>
  ${sections}
</body>
</html>`
}
