// Accepted accessibility violations: tracked and still reported (see the
// "Known accessibility issues" attachment on each affected test, and the
// per-test WCAG Analysis attachment, which always lists everything axe
// found), but excluded from the pass/fail count so the suite stays green
// while the underlying issue is fixed on the app side.
//
// Remove an entry once its issue is actually fixed — axe will then start
// enforcing that rule again, and a regression will fail the build.
export const KNOWN_ACCESSIBILITY_ISSUES = [
  {
    ruleId: 'region',
    reason:
      'Page content is not fully contained by landmarks — appears identically on every screen, pointing at the shared layout template rather than any one page.'
  },
  {
    ruleId: 'aria-allowed-role',
    reason:
      'An element in the shared layout carries a role attribute that is not valid for its tag — same root cause as the "region" entry above.'
  }
]
