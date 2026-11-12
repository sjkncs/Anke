# Anke talent housing service

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
