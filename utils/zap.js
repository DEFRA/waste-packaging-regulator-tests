import fs from 'fs/promises'
import path from 'path'

const ZAP_BASE = 'http://127.0.0.1:8090'

async function isZapRunning() {
  try {
    const res = await fetch(`${ZAP_BASE}/JSON/core/view/version/`)
    if (!res.ok) return false
    const data = await res.json()
    return Boolean(data && data.version)
  } catch {
    return false
  }
}

export async function checkZapIsRunning(timeoutMs = 120000, intervalMs = 500) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await isZapRunning()) {
      const res = await fetch(`${ZAP_BASE}/JSON/core/view/version/`)
      const { version } = await res.json()
      // eslint-disable-next-line no-console
      console.log(`OWASP ZAP version: ${version}`)
      return
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error(
    `OWASP ZAP proxy is not reachable at ${ZAP_BASE} after ${timeoutMs / 1000}s.\n` +
      `Please ensure ZAP is running on your machine or CI agent before running security tests.`
  )
}

export async function generateZapReport() {
  let remaining = 1
  while (remaining > 0) {
    const res = await fetch(`${ZAP_BASE}/JSON/pscan/view/recordsToScan/`)
    const data = await res.json()
    remaining = Number(data.recordsToScan)
    if (isNaN(remaining))
      throw new Error(`Unexpected ZAP API response: ${JSON.stringify(data)}`)
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  const reportRes = await fetch(`${ZAP_BASE}/OTHER/core/other/htmlreport/`)
  const reportBuffer = Buffer.from(await reportRes.arrayBuffer())

  const reportDir = 'zap-report'
  await fs.mkdir(reportDir, { recursive: true })
  const reportPath = path.join(reportDir, 'zap-report.html')
  await fs.writeFile(reportPath, reportBuffer)

  // eslint-disable-next-line no-console
  console.log(`ZAP report saved: ${reportPath}`)
}
