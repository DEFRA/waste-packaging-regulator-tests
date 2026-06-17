import { isSecurity } from './utils/profile.js'
import { generateZapReport } from './utils/zap.js'

export default async function globalTeardown() {
  if (!isSecurity) return
  await generateZapReport()
}
