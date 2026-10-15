// Saved session written by auth/auth.setup.js and loaded by every browser
// project. Keyed by environment as well as nation: a real B2C session saved
// against test/dev is no use against the local mock frontend (and vice versa),
// and reusing it there sends every page into a redirect loop.
//
// A function, not a constant: playwright.local.config.js sets ENVIRONMENT
// before importing the base config, so it must be read at call time.
export function authFilePath() {
  const environment = (process.env.ENVIRONMENT || 'dev').toLowerCase()
  const nationId = process.env.NATION_ID ?? 'EN'
  return `playwright/.auth/nation${nationId}.${environment}.json`
}
