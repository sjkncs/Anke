# Local acceptance: 2026-11-11

## Decision context extension: 2026-11-12

Ran `node --test deliberation.test.mjs test.mjs workbench.test.mjs resident-ratings.test.mjs`:
12 passed, 0 failed. The tests exercise competing cost/commute alternatives,
missing measurements, eligibility blocks, empty supply, immutable inputs, MCP
tool response, real isolated HTTP/PostgreSQL operations and existing work orders.
No production application or unit was inserted or changed. The model receives
facts and comparison context; autonomous model behavior, persistent preference
learning and desktop conversation acceptance have not been verified.

The running local service was restarted and advertises housing-deliberation-v1.
The existing Anke housing.cjs agent bridge successfully queried coverage:
0 applications and 0 units. No live provider conversation was invoked.

## Resident rating extension: 2026-11-12

- node --test resident-ratings.test.mjs test.mjs workbench.test.mjs: 8 passed.
- node workbench-browser.mjs: passed profile registration, sourced aggregate
  import, absent ratings, university/4.5/20-response filters, rating sort,
  existing work orders, reload and mobile layout.
- Rental plugin query.test.cjs and routes.test.cjs: 8 passed; renderer syntax
  and AnkeHousing manifest schema checks passed.
- Screenshot: verification/workbench-v2/resident-ratings-synthetic.png.
- Scope: isolated synthetic housing/reviews, actual HTTP/browser/PostgreSQL.
  No real opinions or live supply were inserted into the operational DB.
  The housing service was restarted to load the updated implementation.

Public-evidence extension on the same date: 16 survey dimensions and 9 primary
references are available through the Chinese Teacher needs reference page and
the read-only `preference_catalog` action. Reran `node --test test.mjs`: 4 passed,
0 failed, including source-ID integrity, absent personal weights and closed-batch
metadata. `node browser-smoke.mjs` additionally verifies the 16 displayed rows
before the original registration and matching path. No coefficients or existing
household records were changed by this extension. The source memo records access
limitations and distinguishes interviews, recruitment services and research.

Implementation: independent talent-housing service beside Anke, with local PGlite
PostgreSQL storage, Chinese registration forms and a read-only stdio MCP adapter.
No Anke/PI source or profiles were edited. No real household records or housing
inventory were imported. No remote model/provider was called.

Verified on Node v22.21.0:

- `node --test test.mjs`: 4 passed, 0 failed. Includes hard constraints,
  missing information, duplicate IDs, priority competition, pending eligibility,
  elapsed dates, HTTP writes, optimistic revisions, database reopening, audit
  records, Origin/token validation and rejection of write-shaped MCP requests.
- `node browser-smoke.mjs`: PASS. Real headless Chromium filled household/unit
  forms, saved synthetic records, displayed recommendations and workflow progress,
  simulated allocation, recorded no page errors and confirmed unit status remained
  available. All test database files were isolated in temporary directories.
- Default service initialization and HTTP check: page returned 200, coverage was
  `{"applications":0,"units":0}`. The empty operational database was initialized
  under `data/postgres`, separate from rental knowledge data. The process closed
  normally after the check. First-run parent-directory creation is covered by the
  persistence test.
- Inspected `verification/matching-synthetic.png`; the displayed household and
  housing unit are explicitly synthetic.

Not yet verified: adding the supplied MCP configuration to Anke, an actual
Anke chat invoking the adapter, desktop Electron integration, real map routing,
school eligibility, official priority rules, survey-calibrated scores or formal
reservation transactions. The browser window is a standalone functional page,
not a replacement or visual-parity claim for the PI native UI.

Survey extension on 2026-11-12: added a structured Chinese survey template with
five sections, 20 questions and three explicitly synthetic choice tasks. The
standalone page renders the template and exports Markdown; the `survey_template`
MCP action is read-only. Browser smoke and unit tests were rerun after this
extension; no real records or scoring coefficients were changed.
