import { checkZapIsRunning } from './utils/zap.js'

export default async function globalSetup() {
  if (process.env.RUN_SECURITY !== 'true') return
  await checkZapIsRunning()
}
