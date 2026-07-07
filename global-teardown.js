import { isSecurity } from './utils/profile.js'
import { generateZapReport } from './utils/zap.js'

export default async function globalTeardown() {
  if (!isSecurity) return
  // entrypoint.sh owns the report/alert-wait when it started ZAP itself
  // (Docker/CDP runs); only generate here for a standalone local run against
  // a manually-started ZAP instance.
  if (process.env.ZAP_MANAGED === '1') return
  await generateZapReport()
}
