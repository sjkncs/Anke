# Anke Shenzhen rental knowledge

Public-source sync added 2026-11-12: see `LISTING_SYNC.md`. The Anke launcher
starts the hourly first-page collector, with durable pauses on verification or
zero valid records. `ShenzhenRentKnowledge` action `sync_status` exposes source
freshness. PostgreSQL export now refreshes the detail tool as well as statistics;
the original 1,465-row acceptance below describes the initial import only.

This local domain store is separate from PI Desktop's host-owned application database. It exports a read-only snapshot to the existing `anke.rents` plugin; it changes no native UI styles, IPC contracts or plugin permissions.

## Runtime and sources

- Node >=22.19. Pinned runtime dependencies: PGlite 0.5.16 and its pgvector extension 0.0.17 (Apache-2.0), pg 8.23.0 (MIT). Exact transitive integrity is in package-lock.json. Install hooks were disabled. These dependencies were absent from the existing host and were installed for the new runtime, not merely for E2E.
- Official implementation references checked 2026-11-11: https://pglite.dev/docs/ , https://pglite.dev/extensions/ , https://github.com/pgvector/pgvector , https://node-postgres.com/ . Local default is persistent WASM PostgreSQL, not a separately installed PostgreSQL server.
- Set `ANKE_RENT_DATABASE_URL` locally to use a standard PostgreSQL server with pgvector installed. The same schema is used. Do not commit connection secrets. Server connectivity is not yet accepted on this machine.
- The input is the local 1,465-row public listing CSV collected on 2026-11-07/08, SHA256 `8853f0eb812765d3d5a4f8c3c0f656a0c6658674f9c4ef446c768775568480b5`. Original CSV and evidence files stay unchanged. Platform redistribution terms remain unverified; no data is uploaded.

## Commands

```powershell
npm ci --ignore-scripts --no-audit --no-fund
python prepare_input.py '<source CSV>' data/input.json
node cli.mjs ingest data/input.json
node cli.mjs export
node cli.mjs query '{"action":"coverage"}'
node cli.mjs query '{"action":"statistics","grain":"quarter","level":"district","year":2026,"quarter":4,"district":"南山","lease":"整租"}'
node cli.mjs query '{"action":"statistics","grain":"year","level":"community","community":"招商玺家园","lease":"整租"}'
node cli.mjs query '{"action":"search","query":"南山租金","year":2026}'
npm test
node verify-real.mjs
```

The normal Anke launcher refreshes this snapshot from the database before starting Electron. Import new CSV batches explicitly, then export. The tool does not promise an automatic public-web feed.

## Metric contract

The ten complete calendar years are 2016-2025; 2026 is separate year-to-date evidence. Coverage reports every quarter, with missing quarters empty. Dates are observation dates, never inferred first-listing or transaction dates. Current observations cover two days only, not an entire quarter.

Statistics are stratified by listing/transaction type and whole/shared/unknown lease. Fields include arithmetic mean and median unit rent, area-weighted unit rent, mean monthly rent, valid-unit-rent sample size, observation count, distinct platform listing count and observed days. Invalid area/rent fields stay in raw records but are excluded from corresponding calculations. Community keys use district plus exact original name; aliases are not resolved. Missing district records remain in city statistics but cannot enter district/community comparisons. Cross-platform physical homes are not deduplicated. Means are observation-weighted, not a city population estimate or a repeat-rent index.

Historical report aggregates have a separate `rent_aggregate_evidence` table with source/series/methodology, preventing accidental pooling with listings. That table is currently empty; historical acquisition is pending. No complete citywide community registry is available.

## Retrieval

`ShenzhenRentKnowledge` exposes coverage, SQL-derived statistics and Chinese-bigram lexical evidence retrieval. Source listing URLs accompany results. Numerical answers use computed fields, not text-model arithmetic. Derived cards retain source hashes and date coverage. No policy documents have yet been imported.

`rent_documents.embedding` is a pgvector column. `node cli.mjs embed file.json` accepts `[{"id":"document ID","embedding":[...],"model":"exact model revision"}]`; `vector-search` accepts query embedding/model/limit. Model and dimension are isolated. Changed derived text invalidates its embedding. Real semantic embeddings have not been generated or connected to the Agent tool; only synthetic-vector SQL correctness is tested. Existing API credentials are not read or sent anywhere by this service.

The bundled `ResidentialEnvironment` tool is the default protocol for GeoSegSAM-compatible remote-sensing analysis. It requires project coordinates, buffer radius, CRS, image provenance, acquisition date, ground resolution, model identifier and georeferenced category segments. It computes area composition for vegetation, water, roads, buildings, public services, open space and other classes inside the buffer. No segments means `awaiting_segments`; there is no fallback imagery or invented score. The current rental CSV has no usable longitude/latitude values, and the workspace has no GeoTIFF/mask source, so no Shenzhen project has yet been measured.

## Shenzhen image environment pilot (2026-11-11)

`environment_research/研究说明.md` records the local redevelopment imagery bridge,
56 real street-image YOLOv8n + MobileSAM runs, factor CSVs, a visual gallery,
and PostgreSQL-compatible evidence tables. Run `node environment_research/import.mjs`
to import its assets/features/candidate joins. The separately checked importer is
idempotent and preserves pending identity/date/coordinate validation. Seven listing
rows in two exact district/name candidates do not support a rental-effect estimate.
SAM3/SAM3D were inspected, not run. The native application UI is unchanged.

## Acceptance

## Listing field preservation (2026-11-13)

`listing-fields.mjs` carries disclosed dwelling attributes and raw source fields through snapshot export. Community position labels remain separate from street addresses. Property fees quoted per square metre are not converted into monthly totals automatically. The market table provides a transparent horizontal scroll track, fixed headers and an expandable source-field view. Verified project addresses are maintained in the housing plugin's `data/project-addresses.json` with district/name matching and source URLs; supplied listing addresses take precedence. `node refresh-listing-fields.mjs` restores attributes from existing import evidence and creates a backup before replacing the snapshot. It does not collect new listings or change rent observations.

Run `node --test listing-fields.test.mjs test.mjs` and `python -m unittest test_listing_sync -v` for field/export/parser checks.

`npm test` runs the actual in-memory PostgreSQL engine and pgvector through import, duplicate protection, SQL statistics, export, the production plugin query function, historical gaps, invalid inputs, model isolation and refresh. `node --test ../anke-agent-source/apps/desktop/resources/plugins/anke.rents/query.test.cjs` checks plugin registration/routing. Desktop live-provider chat and a standalone PostgreSQL server are separate pending acceptance steps.
