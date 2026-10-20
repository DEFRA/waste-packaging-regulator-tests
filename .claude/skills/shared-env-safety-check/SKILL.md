---
name: shared-env-safety-check
description: Use this skill BEFORE running any Playwright test against a shared deployed environment (ENVIRONMENT=dev or test, "test env", "dev env", CDP), and whenever a spec or page object that accepts or cancels certificates is added or edited. It checks that every action which changes shared data (accept with Yes, cancel with Confirm and send, API writes) is skipped outside local / github mocked data. Triggers on "run … against test env", "run full functional suite against test/dev", "is it safe to run against test", "check the specs don't change shared data", "I edited the accept/cancel tests".
---

# Shared environment safety check

dev and test share one live database. The accept and cancel specs really
**accept** and **cancel** certificates. Run against dev or test, they change
data other people rely on, and they clash with each other when tests run in
parallel. Those tests must only run against local or GitHub mock data.

This check must pass **before** any run where `ENVIRONMENT` is not `local` or
`github`. It runs in about a second, so never skip it.

## When to run it

- **Before every run against dev or test:** a single spec, a single test or the full suite.
- **After editing anything** in `test/specs/` or `test/page-objects/` that touches accept, cancel or detail flows, including your own edits. Run it before telling the user the change is done.
- **When the user asks** whether a run is safe.

Local and GitHub runs don't need it; the mock keeps nothing between requests.

## Run it

From the repo root:

```bash
node .claude/skills/shared-env-safety-check/scripts/check_guards.cjs            # all specs
node .claude/skills/shared-env-safety-check/scripts/check_guards.cjs <spec>…   # only the specs about to run
```

- **Exit 0 / `SAFE`:** go ahead with the run, for example with the `test-runner-triage` skill.
- **Exit 1 / `UNSAFE`:** **do not run against dev or test.** Show the user the unguarded lines and fix them first (see below). Running only the safe specs is fine if the user wants that, but never the unsafe ones.

It uses the repo's own `espree` (installed with eslint). If `node_modules` is missing, run `npm ci` first. Don't fall back to a guess.

## What it checks

1. **Finds what changes data,** in `test/page-objects/*.js`. It looks for:
   - `.click()` on `yesRadio` or `confirmAndSendButton`
   - `getByRole(…, { name: 'Yes' | 'Confirm and send' }).click()`
   - `request.post / put / patch / delete`

   Any page-object method that calls one of these (or calls another method that does) counts as data-changing. Today that's `selectYes` and `confirmAndSend`, and new wrappers are picked up automatically.
2. **Checks every spec.** Each call to one of those, directly or through a helper function in the spec, must be **guarded** by either:
   - a `test.skip(<condition>, …)` at the top level of an enclosing `test.describe`, where the condition mentions `sharedEnvironment` or `ENVIRONMENT`, or
   - a `test.skip(sharedEnvironment, …)` inside the test, **before** the call. A skip after the call doesn't count.

It parses the code properly instead of counting braces. An earlier brace-counting version missed a real mistake, and a careless edit once left 4 Yes tests unprotected.

### Known limits (tell the user if relevant)

- **It only looks for the patterns above.** A brand-new way to change data, such as a new button name, a direct `fetch` or a different radio, isn't detected until it's added to `PRIMITIVE_TARGETS`, `PRIMITIVE_ROLE_NAMES` or `WRITE_METHODS` in the script. When a test adds a new action that changes data, update those lists.
- **It checks that a skip exists, not that its condition is right.** A condition that mentions `ENVIRONMENT` but is wrong (e.g. `ENVIRONMENT === 'test'`) would still pass. When editing guards, use the shared constant shown below.

## How to guard a data-changing test (repo convention)

Put the data-changing tests in their own group, so read-only tests in the same file still run on dev and test:

```js
// dev/test share one live database. Read-only tests run everywhere (and skip
// only when the data they need is missing); tests that accept a submission
// only run against local / github mocked data.
const sharedEnvironment = !['local', 'github'].includes(process.env.ENVIRONMENT)
const ACCEPTS_SHARED_DATA =
  'Accepts a submission in shared dev/test data — only runs against local / github mocked data'

test.describe('selecting Yes', () => {
  test.skip(sharedEnvironment, ACCEPTS_SHARED_DATA)
  // tests that call acceptPage.selectYes()
})
```

The cancel spec uses the same pattern with `test.describe('confirm and send', …)` and `CANCELS_SHARED_DATA`.

**Don't** skip a whole parent group just because one child test changes data. That hides the read-only tests too (viewing the page, choosing No, choosing a cancel reason, Change), which are safe on dev and test. For missing data in read-only tests, skip with a "No … in this environment" reason, never fail.

## Read-only actions (fine on dev and test)

These were checked against the frontend's controllers:
- **On the accept page, choosing No** (`selectNo()`) only redirects back to the detail page.
- **In the cancel flow:**
  - Choosing a reason (`selectReason()`) only checks the form and redirects to the confirm page.
  - **Change** and the **cancel button** only move between pages.
- **Only two actions call the backend to change data:** Yes on the accept page (`approveDeclaration`) and Confirm and send on the cancel page (`cancelComplianceDeclaration`).

If the frontend adds another action that changes data, re-check this and update the script's lists.
