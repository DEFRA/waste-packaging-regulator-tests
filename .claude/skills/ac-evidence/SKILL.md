---
name: ac-evidence
description: Use this skill when the user gives you a JIRA ticket (link or key) or a list of Gherkin acceptance criteria and asks to manually test them locally and produce evidence (screenshots, a doc, something to attach to the ticket). Triggers on requests like "run all the AC's locally and get screenshots as evidence", "manually test this ticket", "create evidence doc for AMCR-XXX", "verify these scenarios against local and document it".
---

# Acceptance-criteria evidence capture

Turns a set of Gherkin acceptance criteria into: real screenshots of the
local app in each described state, plus a self-contained HTML evidence doc
(published as an Artifact) that pairs each scenario's Given/When/Then with
its screenshot. Built for attaching to a JIRA ticket as manual-test evidence.

This repo (`waste-packaging-regulator-tests`) is a Playwright test suite
against a *separate* sibling app repo — the actual UI under test. Screenshots
come from driving that real local app through its genuine routes and
controls, not from mocking responses inside this test repo.

## Step 1 — Get the acceptance criteria

If the user gives a JIRA URL/key: try `WebFetch` on it first, but expect it
to fail — Atlassian instances are almost always authenticated and WebFetch
has no session for them. When it fails, say so plainly and ask the user to
paste the ticket's title + AC list (Gherkin scenarios) directly. Don't
silently fabricate scenarios from the ticket key alone.

Once you have the AC text, parse it into discrete `Scenario N: <title>` /
Given / When / Then units — one unit per screenshot you'll need.

## Step 2 — Find the app under test and confirm it's running

- Check this repo's `.env.local` for `dashboardBaseURL` — that's the local
  URL to drive.
- Find the sibling app repo. It's a sibling directory under the same parent
  as this repo (e.g. `waste-packaging-regulators-fe`, `waste-regulator-dashboard-fe`)
  — check `ls ..` from this repo's root, or ask the user for the path if it
  isn't obviously there.
- Confirm the app is actually up: `curl -sk -o /dev/null -w '%{http_code}\n' <baseURL>/`.
  If not running, tell the user it needs to be started (`npm run dev` in that
  repo, or whatever its README says) rather than starting a whole separate
  app's dev server unprompted — that's a side-effecting action in someone
  else's repo.
- Confirm auth is a non-issue locally: this class of app typically runs with
  a mock-auth flag defaulting on for local dev (check the app's
  `src/config/config.js` or equivalent for something like `useMockAuth`) —
  if so, direct navigation works with no login step. If real auth is
  required locally, you'll need real local credentials from the user first.

## Step 3 — Map each scenario to a concrete navigation path

For each scenario, you need: an exact URL (or a page-object-driven click
path) that lands on the state the scenario describes, in the *local* app.

1. **Read this repo's page objects** (`test/page-objects/*.js`) for the
   locators and navigation methods already proven to work for this feature
   — reuse their selectors and click sequences instead of guessing new ones.
2. **Find the state-controlling mock data in the app repo.** Local dev builds
   of these apps typically serve hard-coded mock data (`MOCK_API=true` by
   default outside production) rather than a live backend. Grep the app
   repo's `src/server/routes/**/*.mock.js` (or equivalent) for the feature's
   mock records — each one usually has an `id`, a `status`/state field, and
   is keyed in a `mockXById`-style lookup object used by the detail route.
   That map is your source of truth for "which URL shows which state" — read
   it directly rather than guessing IDs.
3. **Distinguish pre-seeded states from action-triggered states**:
   - States that are just a record's resting status (e.g. Pending, Accepted,
     Cancelled, Not submitted) are usually directly navigable — find a
     seeded record already in that status and hit its detail URL.
   - States that only exist right after a user action (e.g. a one-shot
     "banner just accepted/cancelled" flag set by a POST handler and cleared
     on the next GET) can't be reached by URL alone. You have to actually
     perform the action (click the button, submit the form) and screenshot
     the very next page — before any reload, or the flag clears.
4. **Use a distinct record per mutating action.** If two scenarios both need
   "click Accept" or "click Cancel" on records of the same type, pick two
   *different* pending records for them (check the mock file for more than
   one seeded in that status). Otherwise the first action's mutation
   invalidates the state needed for a later scenario, or for a scenario that
   just wants to view that same record's plain Pending state.

If a scenario's state genuinely isn't reachable locally (no seeded fixture
for it, feature not yet implemented locally), say so explicitly in the doc
rather than skipping it silently — don't fabricate a screenshot.

## Step 4 — Capture screenshots

Write a standalone Node script (not part of the checked-in Playwright suite
— put it in a scratchpad/tmp location) that requires `playwright` from this
repo's `node_modules`, launches Chromium once, and for each scenario:
navigate (or click through), `page.waitForLoadState('networkidle')`, then
screenshot. Run action-triggered scenarios last, per distinct record, so
earlier pre-seeded-state screenshots aren't disturbed by the mutations.

**Prefer single-viewport screenshots over `fullPage: true`.** A tall page
(GOV.UK detail pages with big tables routinely run 2500-3500px) embedded
into a doc at a legible display width produces an image taller than one
printed page — inline images don't reliably paginate in Word/most viewers,
so the bottom of the page (often exactly where the buttons or a table the
scenario cares about live) silently gets clipped from view. Instead, for
each scenario, scroll to the region the Then-clause is actually about (top
of page for banners, `locator.scrollIntoViewIfNeeded()` on the relevant
button/table for bottom-of-page assertions) and take a plain
`page.screenshot()` (viewport-bound, no `fullPage`). This also means one
capture often satisfies several scenarios that assert against the same
visible region — say so explicitly in that scenario's note in the doc
rather than silently duplicating the image.

Run the script, confirm it captured one file per scenario with no errors.

## Step 5 — Spot-check before building the doc

Read back 2-3 of the trickier screenshots (banner text, "no buttons" states)
with the Read tool and compare the visible text/state against the AC text
verbatim. Catching a wrong record ID or a stale mutation here is much
cheaper than finding it after publishing.

## Step 6 — Build the evidence doc

Default to producing a **`.docx`**, not raw HTML — JIRA has no inline HTML
renderer, so an `.html` attachment just shows as source code to reviewers.
Ask the user up front (PDF and raw-HTML-artifact are the other options) if
their preference isn't already clear, but `.docx` is the safe default for
"attach this to the ticket": JIRA previews it, and reviewers can comment/edit
in Word if needed.

Build the `.docx` with the `docx` npm package, installed into a **scratch
location** (`npm init -y && npm install docx` in a tmp dir) — never add it to
this repo's `package.json`, it's a one-off authoring dependency, not a test
dependency. Structure: title + ticket hyperlink + meta line (environment /
scenario count / capture date), then per scenario a Heading2, Given/When/Then
as plain paragraphs, and the screenshot via `ImageRun`. Read each PNG's real
pixel dimensions (the width/height are stored at fixed byte offsets 16 and 20
in the IHDR chunk — no image library needed, `buf.readUInt32BE(16/20)` is
enough) so you can set a fixed display width and a proportional height,
never a hardcoded height that distorts the aspect ratio.

Verification note: you can't visually render a `.docx` from the terminal.
Instead confirm it's well-formed by treating it as the zip archive it is:
`unzip -l file.docx` should show one `word/media/*.png` per screenshot, and
`unzip -p file.docx word/_rels/document.xml.rels` should list a `Target=`
line for each image plus the ticket hyperlink. Also grep
`word/document.xml` for your scenario headings/Given/When/Then labels to
confirm nothing got dropped.

If the user asks for PDF instead: skip the npm install entirely and use this
repo's own Playwright — build the HTML version (below), then load it with
`chromium` and call `page.pdf({ format: 'A4', printBackground: true })`. No
extra dependency needed since Playwright's already in `node_modules`.

If the user asks for the HTML/Artifact version (e.g. for online review
rather than a JIRA attachment): load the `artifact-design` skill before
writing — this is a utilitarian QA/evidence report, not a marketing page:
real typographic hierarchy and a considered palette, no oversized hero, no
flashy motion. A pattern that's worked well: header with ticket link +
capture date + environment + scenario count, a jump-to index, then one card
per scenario (title, Given/When/Then as a definition list, full-page
screenshot, caption). Screenshots must be inlined as base64 for the
Artifact's self-contained requirement — generate via a small Node script
(read each PNG, base64-encode, template into the page) rather than
hand-authoring encoded image data. Publish with the `Artifact` tool; pick a
favicon that reads as "evidence/QA" (✅ or similar).

## Step 7 — Report back

Tell the user what was produced (file path and/or Artifact URL) and a
one-line count of scenarios verified. Flag that generated output files
(`.docx`, `.pdf`, or `.html`) are sitting untracked in the repo — ask if they
want them moved, `.gitignore`'d, or left as-is. Don't commit them without
being asked.
