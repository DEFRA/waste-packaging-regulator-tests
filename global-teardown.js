import { generateZapReport } from './utils/zap.js'

export default async function globalTeardown() {
  if (process.env.RUN_SECURITY !== 'true') return
  await generateZapReport()
}
