# Local acceptance: 2026-11-11

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
