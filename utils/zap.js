import fs from 'fs/promises'
import path from 'path'

const ZAP_BASE = 'http://127.0.0.1:8080'

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
