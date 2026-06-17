import { isSecurity } from './utils/profile.js'
import { checkZapIsRunning } from './utils/zap.js'

export default async function globalSetup() {
  if (!isSecurity) return
  await checkZapIsRunning()
}
