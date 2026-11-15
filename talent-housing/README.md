# Anke talent housing service

## Event reading layout (2026-11-14)

Event rows open a wide, scrollable reading dialog instead of expanding a narrow
table cell. It renders original body paragraphs, short Chinese section headings
and list lines as safe semantic HTML, with source and collection metadata at the
end. No original HTML or scripts execute. Escape and Close dismiss the dialog.
The collector preserves block paragraphs while joining inline spans; archived
records without block data fall back to preserved body newlines. Excerpt-only
providers remain excerpts; the reader does not fabricate missing article text.

## Offline event semantics (2026-11-14)

See [SEMANTIC_MODEL.md](SEMANTIC_MODEL.md) for the pinned multilingual MiniLM
revision, licenses, offline CPU runtime, synthetic checks and limitations.
The event collector runs `node refresh-event-semantic.cjs` after each export;
it generates source-matched topic similarities, updates the shared browser/native
presentation asset with backups and records `semanticSync` in the collector log.
Sentence similarity supplements the tenant polarity baseline; it does not replace
it with a validated sentiment or causal model. No new always-on model service.

## Tenant-oriented event text polarity (2026-11-14)

The standalone workspace appends `event-tone.cjs` and `event-tone-ui.js` to
the existing presentation asset. Positive tenant-oriented text is red; negative,
mixed and unclassified text is green, with a text label and expandable evidence.
This is a Chinese clause/phrase NLP baseline with negation and conditional/planned
statement suppression, not a trained semantic model or predicted rent effect.
Source/date links stay in each row; source health/count capsules are hidden.
Source collection and raw snapshots are unchanged. `node sync-event-tone.cjs`
backs up and regenerates the native plugin presentation asset from the shared
classifier/UI files. It is idempotent; run it again after changing those files.
The browser strips the generated segment before appending current shared sources,
so there is only one classifier/UI instance per page.
The v2 baseline scopes negation to comma/contrast clauses, recognizes temporary
traffic restrictions, and suppresses ended restrictions. Run
`node audit-event-tone.cjs` for a source-linked classification snapshot under
`data/event-tone-audit.json`; counts are computed, not human-validated labels.
Checks: `node --test event-tone.test.cjs`; `node verify-event-tone.cjs` (candidate
port 47846, or set ANKE_TONE_URL). The source checkout has no HEAD revision;
this reversible adapter is maintained outside that checkout.

Native synchronization acceptance (2026-11-14): loaded the actual registered
anke.rents panel in Electron, selected events, and observed clause-lexicon-v2,
33 classified rows / 33 labels, no count capsules, hidden source-status chips,
and an active native plugin bridge. Screenshot: `data/event-tone-native.png`.
Three plugin-host/event regression checks and the live browser check passed.
The bundled plugin asset is a reversible runtime deployment; the source checkout
has no HEAD and no Git worktree/commit/remote release acceptance is claimed.

## Official policy evidence and allocation comparison (2026-11-14)

Business review: `node build-policy-review.mjs` generates a separate review CSV.
Authorized export staging: `node policy-intake-cli.mjs <export.json>`;
template and limitations are in `POLICY_KNOWLEDGE.md`. Staging does not publish
to the online knowledge base. Run `node --test policy-intake.test.mjs` for
batch rejection, evidence pinning and pattern-redaction checks.

Open `/policy` for the source-preserving official housing policy index. See
`POLICY_KNOWLEDGE.md` for source contracts, validation and remaining review.
The existing MCP server advertises read-only `anke_official_policy` and
`talent_housing.compare_allocation`; refresh tool discovery in configured hosts.
The 12345 internal platform and a native desktop model conversation are not accepted.
`policy-data/review-questions.json` contains 60 questions pending business annotation.
Run `node --test policy-answers.test.mjs policy.test.mjs allocation-comparison.test.mjs test.mjs deliberation.test.mjs workbench.test.mjs resident-ratings.test.mjs`
and `node policy-browser.mjs`. Synthetic comparison tests do not establish real
occupancy, fairness improvements or turnover time.

## User-supplied historical reference (2026-11-13)

The market ledger now exposes a separate historical sales/community-reference
query panel. ShenzhenRents uses the same read-only history store through
dataset=history_sales or reference_202608. Source hashes, date coverage,
candidate identity rules, training preparation, checks and limitations are
documented in `../_workspace/history-reference/README.md`. The 2026-08 community
file can provide dated exact district/name clues for missing addresses; original
attributes take precedence. Resale sale prices never enter rent statistics.
The supplied sales data ends in April 2024 despite the requested 2023-2026 window.

## Shared light palette (2026-11-13)

The real `/workspace/` renderer and `/housing_monitor/` including assets now share the Niulai-video-derived light palette with sibling `anke-website`. Its canonical CSS and synchronization script are `../anke-website/niulai-theme.css` and `sync-niulai-theme.cjs`. CSS files are read per request; reload the browser to apply this color-only change. No service restart, database migration, authentication change or model restart is required. Run `node verify-live-palette.cjs` from that directory for read-only navigation across all housing modes/tabs and monitor/assets at 1440px and 390px. The source-video review distinguishes full-frame decoding from visual inspection of state frames; original Niulai design tokens and pixel-identical parity are not claimed.

## Workspace authentication recovery (2026-11-13)

The browser housing workspace is branded ANKE. If the service restarts while
a page remains open, the standalone bridge refreshes its token from an
uncached same-origin workspace page and retries an authentication rejection
once. Host, Origin and token validation remain required. Old pages need one
reload to obtain this bridge update. Verification and the isolated live-page
reproduction are in `../_workspace/brand-auth/ACCEPTANCE.md`.

## Market address completion (2026-11-13)

Market field coverage chips count addresses, streets and layouts across all
filtered observations before display truncation. Official evidence additions
for high-frequency communities are exact district/name scoped. A source that
only establishes a street does not generate a house number. Address sidecar
changes are read on every query. Historical community candidates remain in
their separate staging database until identity and temporal validity review.

Confirmed addresses now also persist in the housing plugin's versioned
`data/address-overrides.json`, shared by native panel and browser queries on
this computer. The authenticated `/api` action `market_address_save` writes
the sidecar atomically; source records remain unchanged. This is local
application synchronization, not cloud distribution. Geographic daily metrics
are calculated before the 500-row display limit, separately by record type
and lease. Same-platform listing duplicates are collapsed per day; conflicting
daily prices are excluded. Paired changes require identical platform, listing,
project, district and area across dates. CSV/JSON exports are generated by
`node ../rent-knowledge/export-geography.mjs`. No cross-platform unit identity
is inferred, and sample changes are separate from paired changes.

The market ledger remembers selected addresses in a versioned local browser
cache scoped by dataset, district and project. Original source addresses take
precedence. Exact selected map results fill directly; ambiguous candidates
require a user selection. Lookup failures remain visible in the workspace
status. The standalone API routes `residential_locate` and
`residential_street` to the same housing map module used by the client.

## Rental visualization assets (2026-11-13)

The `/workspace/` asset allowlist includes `rent-visuals.js` and
`rent-visuals.css`. Restart an older service after this server change; a page
refresh cannot replace its route handlers. Run
`node --test rent-visuals-live.test.mjs` to validate the real rental snapshot,
browser bridge, asset delivery, project details and filtering in an isolated
service with no access to the user's application database.

To verify an already-running main service, set `ANKE_RENT_LIVE=1` before the
same command. This uses port 47831, permits only read-only API actions and does
not stop that service. The 2026-11-13 running-service check passed after graceful
restart; its screenshot is `verification/rent-visuals/running-service.png`.

## Model deliberation context (2026-11-12)

Every existing `search_homes` call now includes `decisionContext`. It returns
source-linked measurements, unresolved facts, hard-constraint conflicts and
trade-offs between feasible alternatives. Numeric non-dominance is only a
comparison aid, not an allocation or a final recommendation. Unknown values
preserve alternatives rather than silently making them inferior. Candidates
are ID-ordered independently of legacy scenario scores.

The existing Anke model receives this context through its current housing tool.
It can decide whether to clarify, retrieve more evidence or explain a choice;
the service does not implement a scripted dialogue tree or start another model
process. No preference learning or persistence is claimed. Policy constraints,
user limits, qualification and work-order authority remain unchanged.

Validation: `node --test deliberation.test.mjs test.mjs workbench.test.mjs resident-ratings.test.mjs`.
These are synthetic, isolated checks; a live desktop model conversation and
longitudinal preference learning require separate acceptance.

## Resident ratings and personalized matches (2026-11-12)

The existing gray/white talent search now offers university/government scope,
resident-rating sort, minimum 0-5 survey average and minimum response count.
Import an optional residentRating object: score, positive integer count, source,
and verifiedOn date. No rating is synthesized when absent. This aggregate is
displayed independently of the 0-100 short/long-term match; opinions do not alter
household utility or policy priority. Future-dated ratings are not displayed.
Pending eligibility prevents a confirmed match; ineligible candidates are excluded.
All card states remain visible for verification, with qualified matches first.
AnkeHousing and the read-only talent_housing MCP expose the same filters.
Run node --test resident-ratings.test.mjs test.mjs workbench.test.mjs and
node workbench-browser.mjs. Browser acceptance uses synthetic data in an isolated
database; real evaluation collection and policy calibration remain unperformed.

## Integrated housing workbench (2026-11-12)

Open http://127.0.0.1:47831/workspace/ after starting `node server.mjs`.
The Anke launcher starts this service automatically. The existing gray/white
plugin panel now contains candidate profiles, talent housing search, government
and university supply import, and ZhuXiaoZhi work orders. The original Pi shell
and its own source are preserved.

Recommendation first applies eligibility and hard constraints, then compares
explicit short-term preferences and supplied current long-term evidence.
Government/university supply provenance is mandatory. Planned amenities do not
contribute to the current-condition score. Unknown required information stays
unscored. User-entered preference weights are scenario parameters, not learned
satisfaction estimates. The legacy allocation simulator keeps policy priority
separate from preference utility.

Supply import previews JSON before confirmation and saves atomically. Each
order records revisions and dated transitions from materials through review,
matching, selection, contract, handover and completion. The assistant cannot
approve eligibility, confirm selection, sign a contract or confirm occupancy.
These are local workflow records; no government submission connector or live
unit reservation has been connected. No real government supply is bundled.
Spatial pins use supplied BD09 coordinates; they are not reconstructed buildings
or remote-sensing-derived environmental measurements.

The supplied recommendation transcript concerns an economics proposal and
advertising research. It informed utility/cost framing only; it is not a source
of housing approval rules and was not ingested as operational instructions.

Acceptance commands: `node --test test.mjs workbench.test.mjs` and
`node workbench-browser.mjs`. Browser fixtures use an isolated temporary database
and synthetic candidates/supply. Screenshots and the explicit acceptance scope
are in `verification/workbench-v2/`. They do not establish native Electron,
provider chat, real housing availability, official approval or school admission.

Public-source update 2026-11-11: the Teacher needs reference page and the read-only
`preference_catalog` tool action expose 16 survey dimensions with 9 primary-source
references. They distinguish historical recruitment/rules, a closed application
batch, mixed-population research and interview hypotheses. No personal weights or
matching coefficients are inferred from these sources. See
`research/preferences-public-sources-20261111.md` for the Chinese research memo.
The page also exposes a read-only survey template and download button; the editable
Chinese version is `research/survey-template-20261112.md`. Scenario questions are
explicitly survey settings and are not real listings or policy parameters.

This first implementation supplies local anonymous application/unit registration,
eligibility progress, explained weighted matching, and serial-priority allocation
simulation. It is separate from PI's host-owned SQLite and the rental warehouse.
It preserves the existing Anke and PI source, profiles and styling. No real
applications or available housing units are bundled. Tests use synthetic fixtures.

## Run

Run `node server.mjs` in this directory, then open http://127.0.0.1:47831 .
The server binds loopback only, checks Host/Origin and a per-process request token,
and keeps data in its own `data/postgres`. Node 22 and the existing pinned PGlite
0.5.16 from adjacent `rent-knowledge/node_modules` are reused without installing
dependencies. No paid model, map API or remote service is contacted.

Use the records page's Chinese forms to register anonymized applications and
units. Blank unit measurements stay unknown; blank required household fields fail
validation. Workflow fields append a dated event when both are supplied.
Application priority is an operator-entered lower-number-first order with
a mandatory rule version, not an inferred talent ranking. Equal priorities use
submission date then anonymous ID; this deterministic simulation tie-break is not
a policy-approved lottery. All modifications retain revisions and audit records;
stale edits fail rather than overwrite newer input. Avoid identifiable personal,
medical, credential or contact data. Multi-user access controls are not provided.

## Rules and acceptance

Only verified applicants receive simulated assignments. Hard limits include fixed
monthly cost (rent plus fees), usual commute, bedrooms, elevator, available date,
allowed housing type and available unit status. Unknown hard requirements or any
positively weighted unknown factor return needs_verification with no score.
Commute must be entered per applicant/unit; no invented route calculations exist.
Quality is an explicitly supplied 0-100 assessment, not a trained estimate.
The legacy v1 matcher excludes unverified education evidence. Workbench v2 can
compare explicitly sourced, dated current-condition education assessments;
these assessments do not establish school admission eligibility.

Commute and cost scores decrease linearly to zero at the household's limits;
space starts at 60 at the minimum bedroom count, adds 20 per extra bedroom and
caps at 100. These v1 coefficients are scenario assumptions requiring survey
calibration. The score is not a probability or empirical satisfaction estimate.
Priorities precede preferences, one unit is assigned at most once, and simulation
never reserves units or changes eligibility. Progress reports calendar elapsed
days, not promised processing deadlines. Actual service transitions and official
eligibility verification remain operator responsibilities.

`node --test test.mjs` covers the public HTTP registration/edit/recommend/simulate
path with actual PostgreSQL persistence and reopening, audit revisions, missing
facts, hard constraints, eligibility, priority conflicts, duplicate prevention,
Origin/token checks and the MCP tool handler. It does not validate live provider
chat, desktop UI interaction, real routing, school enrollment or official policy.

`node browser-smoke.mjs` additionally fills the Chinese forms in a real headless
Chromium browser, saves synthetic records to an isolated temporary PostgreSQL
directory, opens matching/progress/simulation views, checks browser errors and
confirms simulation leaves unit availability unchanged. It reuses the installed
Playwright runtime and Chromium at the explicit local paths in that script; it
does not exercise Anke's Electron window or provider chat. The screenshot under
`verification/matching-synthetic.png` contains synthetic records only.

## Anke MCP connection

`mcp.mjs` is a read-only stdio MCP adapter for the running loopback service.
Add it through Anke's existing MCP settings using the example configuration;
it can query coverage/progress/matches and run simulations but cannot save
records, approve eligibility, reserve units or change contracts. Existing Anke
profiles are not automatically edited. Start the service first. The adapter uses
the service's single PostgreSQL owner and never opens the data directory itself.

```json
{"mcpServers":{"anke-talent-housing":{"command":"node","args":["C:/Users/Lenovo/Desktop/全市租金导航仓/talent-housing/mcp.mjs"]}}}
```

Next gates: confirm actual rule and tie-break versions with HR, obtain anonymized
applications and asset-office housing records, calibrate preferences, and add
formal reservation transactions only after confirming workflow and authority.

## News reading and AI interpretation

The running event collector polls public sources every 600 seconds; the panel
refreshes every 30 seconds. Both depend on the local services remaining active.
Source dates, amounts and qualification labels are highlighted without changing
the source text. The reader preserves paragraph boundaries and never runs source HTML.

Every rental module has an AI interpretation shortcut. In the desktop plugin it
lists configured models and calls `agent.complete` only after an explicit click.
The plugin declares that permission; the host retains its permission checks.
No approvals or application records are changed. Browser previews cannot access
desktop model credentials and explain that the desktop client is required.
Run `node test-ai-reading.cjs` for the mocked completion contract and browser checks;
these checks do not establish live paid-model quality or model availability.
