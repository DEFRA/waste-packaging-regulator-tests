import { isSecurity } from './utils/profile.js'
import { generateZapReport, writeZapAllureResult } from './utils/zap/zap.js'

export default async function globalTeardown() {
  if (!isSecurity) return
  await generateZapReport()
  await writeZapAllureResult()
}
