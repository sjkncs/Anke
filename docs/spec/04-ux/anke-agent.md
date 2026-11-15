# Anke Agent rental workspace

## Local reality layer (2026-11-12)

The city overview Reality control accepts local SPLAT/PLY/KSPLAT files up to
250 MB, explicit coordinates, units and yaw. Import is browser-local and
temporary, with no upload. Position remains uncalibrated. Removal releases
viewer resources and object URLs. Reuse vendored MIT GaussianSplats3D 0.4.7;
do not claim this implements Spark or a real Shenzhen reconstruction. Sibling
`talent-housing/city-model-browser.mjs` verifies synthetic import/render/removal.

## Local Shenzhen city geometry (2026-11-12)

The overview housing distribution renders six source-derived district meshes
from preserved local MultiPatch SHP files. The SU originals remain unchanged;
SKP equivalence and ground-control registration remain pending. A district
selector and reset control preserve the gray/white layout. Drag rotates,
wheel zooms, and shift/right drag pans. Explicit WGS84/GCJ02/BD09 housing
coordinates share the local Web Mercator origin; inverse offset transforms
are approximate. Missing or unknown coordinates must not create map markers.
The model must not imply live housing inventory. Rebuild and evidence are
documented in sibling `talent-housing/CITY_MODEL.md`.

## Rental method and source sync (2026-11-12)

The rental skills distinguish the 2019-2025 thesis method from current listing
statistics: matched/hedonic quality-adjusted benchmarks and transaction
calibration precede benefit and adjustment analysis. Rent-only burden and total
housing expense burden are separate measures. Missing estimation data must not
change the explanation of the research method or imply a fitted model.

`ShenzhenRentKnowledge` action `sync_status` reads per-platform status without
performing network writes. The sibling rental knowledge worker checks only each
configured public first page hourly while running. Verification, login redirects
and zero valid listings pause that source until explicit resumption. Failed
attempts are not successful refreshes. PostgreSQL export updates both knowledge
and detail snapshots, retaining demos separately and unknown data as unknown.
Cross-platform property identity, transaction rents, full-city coverage and a
streaming feed are not inferred. See sibling `rent-knowledge/LISTING_SYNC.md`.

## Rental knowledge extension (2026-11-11)

The adjacent `rent-knowledge` domain service uses persistent PGlite PostgreSQL
with pgvector and optionally a standard PostgreSQL connection. It does not
replace host-core SQLite. A launch-time export supplies a separate read-only
`data/knowledge.json` to `ShenzhenRentKnowledge`; the existing ledger/demos
remain separate. No new plugin permissions, process boundary or UI layout is
introduced. The tool supports coverage, structured year/quarter statistics and
lexical retrieval of provenance-bearing derived evidence cards. pgvector search
is available in the service CLI; production semantic embeddings are pending.

`ResidentialEnvironment` is the default surrounding-environment operation for
housing projects. It accepts GeoSegSAM-compatible georeferenced segments and
computes vegetation, water, roads, buildings, public-service and open-space
shares inside a 50–5,000 m buffer. The request must include image ID/source,
image date, CRS, resolution, model name and project coordinates. Without an
actual georeferenced image result it returns `awaiting_segments`; it never
creates a default score. The outputs describe pixel-area composition only and
do not claim accessibility, noise, air quality or housing quality.

Calendar scope is 2016-2025, with 2026 separately included. Missing historical
quarters return no observations. Current real evidence has 1,465 listing
observations dated November 7-8, 2026, 714 district/name community groups and
211 observations without a known district. These are not a complete quarterly
panel or a census of Shenzhen communities. Means/medians, counts, observation
days, source IDs and listing URLs are returned by stratum. Original records,
raw fields, CSV hash and source path are retained; no observations are uploaded.

Acceptance: adjacent `rent-knowledge/test.mjs` exercises import -> PostgreSQL
calculation -> export -> production tool query, gaps and synthetic vector
matching. `verify-real.mjs` compares the imported CSV-derived SQL statistic
with the tool answer and checks idempotent reimport. Plugin lifecycle tests
cover registration and release of both rental tools. Standalone PostgreSQL,
real embeddings and live-provider Desktop chat remain separate checks.

## Existing application contract

Anke is a local adaptation of PI-Desktop 0.21.0 at
4ad0094e87b3c9ab75653a770f67f0d09abd63a4. Preserve the upstream license and
Agent runtime. Keep its font scale 1, 14px body and 275px sidebar defaults.
The Anke brand uses a distinct Electron application identity and data profile.
The default/system appearance uses white workspace, #f5f5f5 sidebar,
#454545 actions and #e8e8e8 selections. Explicit
dark or plugin theme choices remain available. The rental panel uses the same
neutral palette. Typography and layout dimensions remain unchanged.
Profiles created before this revision switch once to light through the existing
settings API, tracked by anke.gray-white.v2. Later explicit choices persist.
The original source and user profile remain untouched by this adaptation.
Preserve the native Pi home, composer, sidebar structure and settings pages.
The empty-home heading is 深圳市动态租金 in Chinese and Shenzhen rental trends
in English. It stays the same across project and temporary sessions; directory
names are not interpolated into the heading. Project navigation remains in
the existing sidebar and header.
Do not add a new dashboard, card grid, top-level tabs or duplicate sidebar rows.
Rental module commands use the existing command registry. Four rental skills
and four analytical subagent definitions use the existing Skills and Expert Team
(subagents) settings pages, with their original styling. The runtime persona identifies as
Anke (安客), the housing, work and life assistant under HIT syt. Main sessions,
Bot planning/execution context and analytical specialists distinguish product
identity from the underlying provider. Responsibilities cover application,
progress, viewing, selection, rent payment, move-in and exit, plus daily services.
Answers identify the actual stage, evidence, next action, owner and deadline.
Only the exact old shipped Bot instruction is migrated; custom instructions,
sessions and history survive. Role availability does not mean external accounts
or devices are connected. Tool receipts are required for external success.
The reported `claude-fable-5-2` model on the Anthropic wire requires adaptive
thinking with output effort, even if old catalog metadata selects budget mode.
Other models retain their existing protocol precedence. Request serialization
tests use a fake fetch without contacting a provider. Upstream licenses and attribution
remain in source; product chrome uses Anke branding. Legacy Pi Reply/auth
titles have neutral display labels without rewriting stored transcripts.
The bundled rental plugin contributes a Gray White light-base theme through
the existing theme registry. Select it in Settings > Appearance > Theme; the
built-in Light option also uses neutral gray. Open rental panels use the
same neutral accent from first paint. Theme choice persists through
the existing settings API. No typography or layout values change.
Anke's architectural mark replaces the sidebar mark, home mascot and Windows
application/tray assets. The native 100px hero container remains unchanged.
Reference inspection covers local Qoder IDE runtime metrics and QoderWork's
welcome screen and static CSS. QoderWork's authenticated workspace was not
accessed; prior REA evidence is partial and does not establish runtime parity.

The sidebar rental entry executes the bundled anke.rents command through the
existing command API. Its isolated panel and Agent tool query the same exported
ledger snapshot. The export reads the cockpit database read-only and refreshes
on application launch. Real-time refresh after an import requires relaunching
Anke. Neither renderer reads SQLite. The plugin exposes no arbitrary file path,
shell execution, network fetch or data mutation. Its external navigation accepts
only HTTPS map.baidu.com URLs. Existing plugin grants remain enforced.

The rental welcome uses a lightweight architectural line mark and a stable ANKE
wordmark. Four short Chinese welcome lines rotate every eight seconds only while
the empty home is visible, the document is foregrounded and no text field is
focused. Reduced-motion preference keeps the first line static and disables the
entrance animation. The existing typography scale, composer and service routes
are retained. Marketing copy does not report collection or connection status.

The nine rental roles are provisioned on first session-list load under the
user's `Anke工作区` directory. Each role owns one project group and one durable
session; selecting a service opens that existing session. The initializer is
idempotent and creates no duplicate folders or sessions after restart. The
catalog includes 政务动向 and 智能体联席会议 alongside the original rental
analysis roles.
These business folders are restored in the native project sidebar on bootstrap.
The service grid uses three equal columns on wide windows, two on medium and
one on narrow windows. Windows sets an explicit ANKE relaunch icon and app ID.

Application branding follows that same architectural mark. Windows ICO contains
nine sizes from 16 through 256 pixels; small sizes use the mark alone, while
larger sizes include the ANKE wordmark. Tray resources use the mark alone on
transparency. `scripts/generate-anke-icons.ps1` regenerates these assets and
backs up the previous assets before replacement. The local launcher uses a
separate Anke executable with the ANKE icon, preserving the original Electron
executable and PI profile. macOS ICNS packaging is not validated on Windows.
Windows packaging uses `local.anke.agent`, product/executable/shortcut name
`Anke Agent`, and `Anke-Agent-*` installer/portable artifact names. The ICO is
embedded by the packager and copied as `app-icon.ico` for window lookup.
`node --test apps/desktop/test/anke-package-brand.test.mjs` checks packaging
identity and all nine ICO entries. Config validation is not installer acceptance.
Window and tray icon lookup also checks the source build directory when a
renamed Electron runtime reports itself as packaged without packaged resources.

Anke Bot bundles the Apache-2.0 PI-Bot plugin at revision
b37894bdc873879eb48d3c11aeab94b47c688877. Native plugin layout and protocol IDs
remain stable. A hand-drawn house mascot replaces the default brand and new
avatars; explicit user avatars remain unchanged. The original PI installation
and its team data are preserved separately.

Rental event monitoring adds an Events section inside the existing plugin panel,
not a new application shell. A separate local official-source collector exports
versioned evidence, scope and explicit effective dates. `ShenzhenRentEvents`
provides read-only filtering. The plugin checks every 30 seconds and persists
notification revisions through its private settings. `notify` gates in-app
alerts; native notifications require the panel opt-in and platform permission.
No provider, session message injection or remote account is used. Official-source
links are restricted to HTTPS subdomains of sz.gov.cn. The local cockpit displays
events beside the 3D scene and as a Gaussian viewer overlay; unregistered model
coordinates never receive geographic event markers or invented rent effects.

Imported observations are the default; demo data requires an explicit dataset
switch. Listing and transaction records and whole/shared rentals are filtered
separately; mixed strata have no pooled median. Summaries include sample counts,
coverage and dates. Missing districts are not estimated. The ledger returns at
most 500 rows with an explicit truncation flag while summaries cover all rows.
The snapshot has no credentials. The current database has demo observations only.

Acceptance path: launch isolated Electron; check Anke brand and font ramp;
click Shenzhen rents; verify empty imported dataset; switch to demo; filter an
administrative district; inspect ledger and project comparison; change a rent
scenario; verify numeric outputs. Query-tool tests cover dataset separation,
record/lease strata, source preservation, invalid filters and empty results.
External provider authentication is a separate, unperformed check.

### Teacher and life Bot workspaces

Anke Bot now has lowered arms with small fists and larger wings behind the house
body. Existing explicit avatars remain unchanged. A one-time roster migration
adds teacher and life collaboration groups, using native administrator/worker
delegation. Seven editable roles cover teaching coordination, lesson preparation,
course resources, teaching notices, life coordination, agenda and commute/housing.
Deleted presets stay deleted after restart. No automatic tasks are enabled.

The native `anke_agenda` tool sorts supplied event intervals and reports overlaps
across explicit time zones. It creates no reminders and reads no external account.
Campus portals, calendar import and notice subscriptions remain unconnected until
their dedicated adapters and user login are available. See the plugin's
`ANKE_SOURCE.md` for HITA workflow-reference provenance and acceptance boundaries.

### Apartment service roster

Three additional native groups cover apartment services, daily living, and
campus/work. Their thirteen service roles cover property notices, bills,
activities, repair/warranty, operations, IoT, parcels, food delivery, medical
support, tutoring, remote work, campus updates and email. These are editable
coordination presets, not connected external services. The `anke_service_status`
tool must return `not_connected` for all adapters until implementation and real
connection verification exist. Supplied-material drafting remains available via
configured models. Existing chats survive migration and presets are seeded once.
No monitoring schedules, financial transactions, account changes or actuator
commands start automatically. Acceptance covers migration/restart persistence,
catalog completeness and native session-tool ownership, not external providers.

### Local service ledger and dashboard

Service conversations can persist sourced tasks, deadlines, locations and progress
through `anke_service_desk`. Records are scoped to their originating private Bot
or group, without a cross-conversation aggregate. Status transitions retain a
history and billing resolution requires a receipt reference. This does not verify
payment or submit a property work order. Stable create request IDs reject changed
retries. Writes use the existing queued atomic store and roll back on failure.

Manual device entries have identifiers, locations, sources and observed times.
Older observations cannot replace newer ones; records become stale at 15 minutes.
No gateway or actuator is connected. The dashboard uses existing native view
cards in private chats and structured summaries in groups, preserving layout.
Acceptance: invoke native registered tools to create/retry/progress a repair,
display its source and deadline, test receipt requirements and scope isolation,
fail a disk write, then reload the real Team and verify persistence without jobs.
Device tests cover stale observations and ordering. Actual provider execution,
desktop rendering and real external-service/device integration remain unverified.

The conversation header also exposes a clickable Service Desk dialog, independent
of model tool selection. Users can create a sourced task, update its progress,
inspect history and manually record a device observation in the current scope.
The dialog preserves the existing layout and identifies all disconnected services.
Component acceptance uses an isolated browser with real Team persistence and the
panel API, including reopen and narrow-viewport checks. Actual Electron rendering
and external provider acceptance remain separate pending checks.

Anke Bot display branding must not rename upstream release artifacts. The
read-only update checker retains the canonical `local.pi-bot`, previous
`local.ds-bot`, and historical `PI-bot` asset names, with exact repository and
tag validation. Regression coverage is in the plugin's `tests/updates.cjs`.

The service desk operation must be reachable through the renderer allowlist and
the panel dispatcher. Route acceptance verifies both lists and renderer callers;
browser acceptance traverses the RPC relay before writing an isolated Team store.
A direct panel-handler test alone is insufficient.

Windows Anke icons use an opaque off-white rounded tile and a charcoal house
outline for visibility on dark desktops. The shortcut, executable, window and
tray use this same artwork. The ICO contains 16/20/24/32/40/48/64/128/256 pixel
frames. NSIS installer and uninstaller icons explicitly reference this ICO.
Package configuration validation does not establish acceptance of an installer:
extract the actual executable and live window icons separately. The current
local launcher uses a branded Electron executable; a new release installer has
not been built or validated.

Switching between Agent and Anke Bot collapses any native work panel inherited
from the previous mode, including a maximized preview. Native preview contents
must not composite over the destination Bot workspace. Repeated activation of
the same mode preserves its explicitly requested panel. Bot workspace open and
close remain available after a round trip. Acceptance uses the actual workspace
adapter in `workspace-mode-ui.cjs`; the browser fixture simulates native panel
presentation and does not establish real Electron compositing acceptance.

Existing Bot updates merge omitted fields with the latest stored record inside
the roster queue. A color-only update must retain the name, model, instructions
and sessions. The model-facing update tool treats an empty optional name as no
rename, while explicit empty names in the settings editor remain invalid. A
successful tool receipt includes the saved ID, name and color after persistence;
write failures must throw and roll back without a success receipt. Regression
coverage: `tests/bot-color-update.cjs` in the Anke Bot plugin.

Anke Bot settings navigation and user-facing renderer copy use Anke branding,
including About, feedback drafts, connectors, permissions, workspace errors,
default models and exported chart filenames. Canonical source URLs and internal
plugin identifiers remain intact for compatibility and license traceability.
The updater explicitly describes upstream component releases, not Anke custom
release readiness. All eleven settings routes assert no legacy host branding in
visible dialog text in `tests/settings-routes-ui.cjs`.

The housing plugin preserves the native shell and gray/white typography. Its
integrated workbench adds candidate profiles, source-restricted housing search,
government/university supply import and ZhuXiaoZhi local work orders. The spatial
overview uses actual supplied coordinates and surrounding data panels, without
invented buildings or explanatory microcopy. Missing supply remains visibly
empty. Recommendation scores are scenario utilities, not satisfaction forecasts.
Planned amenities remain separate from current long-term evidence. Operator
review, selection, contract and occupancy receipts cannot be fabricated by the
assistant. Local workflow completion never claims an official system submission.
The loopback service is started by the existing Anke launcher. Browser acceptance
uses actual plugin assets and an isolated domain store; it does not establish
native Electron or provider-chat acceptance. See the adjacent talent-housing
README and workbench-v2 acceptance artifact for reproducible checks.

Anke Bot exposes a service grid at the top of its existing sidebar. Thirteen
local hand-drawn icons distinguish education/training, food delivery, parcels,
repairs and related services. Entries select existing scoped conversations;
they never create duplicate workers or change the native shell typography.
Food delivery owns the Luckin and McDonald's HTTP MCP connector assignments.
Bearer tokens use the existing Windows DPAPI vault and bot-scoped references.
Readiness distinguishes configured from verified connectivity. The setup checks
only initialization and tool discovery; an actual order still requires a user
request for its specific contents. McDonald's stays disabled pending its token.
# Reading pace and service artwork repair (2026-11-12)

Service artwork is bundled as data-image module exports because the existing
plugin-renderer protocol serves modules/styles, not PNG paths. Do not broaden
the host protocol or filesystem permission for decorative assets. The browser
service-entry check rejects PNG requests to reproduce this boundary.

Appearance and Anke Bot General expose the same device-local display preference,
`anke.readingSpeed`: 20, 40 (default), 80 characters/second, or 0 (immediate).
This only limits presentation. Persistence, tool execution, approvals and stop
requests retain their existing timing. Native smooth streaming retains its
buffer after completion and does not accelerate to clear a backlog. Existing
history opens immediately. Anke Bot offers a once-per-mount slowdown dialog for
an observed completed reply >=160 characters and >80 characters/second. Its
reply metadata shows elapsed task time and whole-task average character rate;
this is not a provider token/s measurement. No telemetry leaves the device.

Bundled extension cards hide internal package IDs; execution IDs, attribution
and plugin security boundaries are unchanged. Appearance setting rows share a
70px minimum height and existing semantic theme tokens.

Recovery keeps its existing evidence-first adoption, explicit retry confirmation,
duplicate-admission fencing and exclusive state writer. Orders are never replayed
automatically. MCP discovery is not order execution or a remote image-upload API.

Reading buffers only request repainting for the selected conversation. Failed
and cancelled results bypass the display buffer. Plugin teardown clears its
timer directly, without a document-wide mutation observer. The native browser
hook test exercises a nonempty first chunk, completion, history and a live speed
change against React in Chromium; it does not exercise the installed desktop
window or a live provider. Attachment checks use an isolated fixture profile.

## Installed desktop live verification (2026-11-12)

### University supply ratings and match search

The existing housing panel adds university/government scope, resident-rating
sorting and minimum score/response-count filters without changing theme or shell.
Optional sourced residentRating aggregates use 0-5, with count and verifiedOn.
Absent opinions display unavailable; future evidence is ignored. Personalized
short/long-term 0-100 scores remain independent. Pending/ineligible qualification
cannot become matched even with a high resident rating. Import previews and the
downloadable field template include rating provenance. AnkeHousing and the
read-only talent_housing MCP share this query path. No live reviews are bundled.
Candidate coverage: sibling talent-housing/resident-ratings.test.mjs exercises
HTTP import, sorting/filtering, qualification gates, MCP dispatch and DB reopen;
workbench-browser.mjs exercises profile registration, supply import and filters.

The real desktop and configured remote provider were exercised through the
desktop's loopback debugging connection, separately from fixture tests.
Service artwork: all 13 service images loaded at natural width 256.
Text task `85f9c9c0-a43f-4442-9598-cfe560ab70f4` completed in about 17 seconds.
At the device-local 20-character/second preference, task
`e33023a8-30a6-4c44-b999-1a67e6715155` produced measured visible increments
of approximately 20 characters/second and continued revealing after completion.
The sampling record is `apps/desktop/resources/plugins/local.pi-bot/output/pace-native-live.json`.
Task `a9e40d50-3ac6-4849-8c15-13012d03bc78` was stopped using the real Stop
button and ended interrupted. This does not establish crash recovery acceptance.

Live image testing exposed Windows packaged-app directory virtualization:
canonicalize each managed child root independently before comparing paths.
Keep external files and other sessions subject to the existing native boundary.
The current custom Sonnet model also needed its explicit supportsImages binding
enabled; attachment storage success alone did not establish vision success.
After both repairs, task `1f186ff9-a1ac-446c-b7ab-24225c79e7b1` correctly
described the uploaded gray line-art steaming cup in about seven seconds.
Error and needs_review statuses now bypass presentation buffering as well.

Real native plugin MCP discovery returned eight Luckin tools and 36 McDonald's
tools. The existing connector client successfully executed only read-only
queryShopList (public university-town coordinates) and now-time-info calls.
No orders, payment, external image upload, or messaging were performed.
Neither crash/resume nor the fast-output recommendation dialog was triggered
in this live run. Those remain distinct from unit/fixture coverage.
Verification: node --test tests/attachments.cjs tests/attachment-limits.cjs
tests/reading-pace.cjs: 32 passed. attachments-native.cjs: nine assertions passed
against the current desktop source. No credentials are included in test artifacts.
