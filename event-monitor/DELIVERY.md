# Delivery record — 2026-11-11

Scope: monitor registered official Shenzhen rental-factor events; update the existing cockpit and native Electron Anke rental plugin without restyling the application shell.

Evidence: 3 live source columns, 14 real events after the expanded pass, no request/parser errors, PostgreSQL knowledgeSync=ok. Bounded first import included the APEC non-local passenger-car restriction, Line 15 Pingzhou construction and Luohu Luoling urban-village planning announcement. Original HTML and versioned SQLite records are retained.

Checks executed:

- `python -m unittest test_monitor -v`: 5 passed.
- `node --test .../query.test.cjs .../environment.test.cjs .../test-events.cjs .../test-events-host.cjs`: 11 passed, including actual production plugin child-process init/panel/unload, with host API boundary fixtures.
- `node --test test.mjs test-events.mjs` in rent-knowledge: 3 passed; SQL ingestion, document revision, embedding isolation and original rental observation separation.
- `python -m unittest test_app -v`: 7 passed; original cockpit import, filters and demo behavior.
- `python verify_cockpit.py`: actual Qt widget event selection, 14 event records, title overlay, temporary database; screenshot includes original DEMO rent figures and real event headlines. Map networking disabled for this check; no real Gaussian model was loaded.
- Loopback `/health`: service=anke-events, ok=true. `/events` responds with exported events.
- Anke knowledge lexical query `APEC 限行`: returns the actual government notice URL.

Boundaries: Anke is already running; no forced restart or session interruption. Modified plugin code loads on plugin reload/app restart. Existing grants are preserved. Native OS banner not exercised; requires notify permission plus the user-facing notification toggle. Service is running locally; no Windows startup task registered. Current positioning is named scope + 3D overlay, not coordinate-accurate model event markers. No causal rent percentage is estimated. Coverage is three registered columns, their current first page, up to eight relevant notices per source each pass and three seed documents, not all news on the web.

Source checkout: existing `feat/anke-unified-rents` dedicated local Anke worktree, root commit `0000000`, no configured remote. This local source snapshot has no usable origin/main integration baseline; no commit, push or upstream integration claimed. No new dependencies installed.
