import { isSecurity } from './utils/profile.js'
import { startSpiderScan } from './utils/zap/zap.js'

export default async function globalSetup() {
  if (!isSecurity) return
  await startSpiderScan(process.env.baseURL)
}
