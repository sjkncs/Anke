# Anke Agent local delivery

Rental knowledge addition (2026-11-11): `../rent-knowledge/README.md` records
the PostgreSQL/pgvector runtime, pinned dependencies, evidence scope and CLI.
The new ShenzhenRentKnowledge plugin tool reads PostgreSQL-derived snapshots;
existing UI and ledger are unchanged. 1,465 real listings were imported into
the separate knowledge store, grouped into 714 district/community names.
The original ledger's imported count is still zero. Historical 2016-2025
coverage and real semantic embeddings remain pending. Numerical integration,
idempotent real-data reimport and synthetic-vector SQL checks pass; no new
live-provider or standalone PostgreSQL acceptance is claimed.

Home heading correction: show 深圳市动态租金 consistently, without inserting
the current workspace directory into the rent heading. Project navigation stays
in the sidebar/header. The Electron acceptance now asserts the exact heading.

Latest revision (2026-11-11): native Pi structure retained; default Light now
uses neutral gray/white, including rental panel focus/hover states. New Anke
architectural logo replaces sidebar, home mascot, Windows and tray marks.
Profiles migrate once via anke.gray-white.v2. Build, typecheck, style-token
check, five rental tests and actual Electron query/theme persistence flow passed.
Current screenshot: verification_anke/anke-gray-final.png. Reference comparison:
verification_anke/qoder-reference/COMPARISON.md, relative to the delivery root.
The blue/white sections below describe earlier revisions, superseded here.

Base: PI-Desktop 0.21.0, 4ad0094e87b3c9ab75653a770f67f0d09abd63a4.
Dedicated request worktree: feat/anke-unified-rents. No commit or remote write.
The GitHub archive baseline remains pinned; Git transport failed in the prior
task, so no claim of fresh origin/main ancestry is made. The task reuses that
verified local revision. Source and profile backup predates modifications.

The original dependency tree has workspace symlinks into the Pi checkout. A
shared root junction would resolve Anke imports to old Pi branding, so this
candidate uses an offline, frozen-lockfile install from the existing pnpm store.
No dependency versions change and all install hooks remain disabled. Electron
and the matching official prebuilt Rust Host are reused from the verified host
environment. Force-building voice-runtime was necessary because a copied
incremental build marker referred to excluded dist outputs.

Main changes: distinct Anke identity/profile; localized shell and composer;
sidebar entry using the existing command API; bundled rents plugin and skill;
read-only ledger export; source-tagged filters, comparisons and scenarios.
Renderer, Host and Agent process boundaries remain intact. No new IPC contract.
Plugin permissions are declared and processed by the upstream runtime.

Verification commands:

    node --test apps/desktop/resources/plugins/anke.rents/query.test.cjs
    node packages/plugin-devkit/dist/cli.js check apps/desktop/resources/plugins/anke.rents
    node scripts/check-style-tokens.mjs
    pnpm --filter @pi-desktop/desktop... build
    pnpm --filter @pi-desktop/desktop typecheck
    node ../verify_anke.cjs

Original source/UI comparison evidence is retained under verification_pi_source.
Anke acceptance is separate under verification_anke; the new sidebar entry
intentionally changes one upstream component, with upstream type ramp retained.

Observed: desktop build, typecheck, plugin package check and style-token check
passed. The actual Electron main window -> sidebar command -> plugin panel path
passed, with 14px body, font-scale 1 and a 275px sidebar. Imported data is empty;
demo listing/whole-unit data has 320 records. Selecting Nanshan yields 32 rows
and four projects. Area 100, reference rent 80, current rent 30, ratio 40%,
cap 5%, fee 180 yields 3330 yuan/month. Host handshake and Pi sidecar ready
were observed. Forced test shutdown exits plugin children with exitCode 0 and
upstream logs labels those exits as plugin crashes; they occurred after the
successful assertions, not during panel execution. Provider calls and live map
navigation were not executed. The rent-tool registration integration uses a
stub only at the public Pi plugin API; panel E2E uses the real host bridge.

Blue/white revision: Lingee reference palette uses white content, pale gray
sidebar and #1677ff accents. Anke profiles migrate once to light through the
existing settings API; subsequent explicit theme choices remain available.
Default/system renderer appearance is light. Font sizes and sidebar width
remain upstream values. Electron acceptance asserts actual light theme,
white body, blue accent and pale-gray rental panel background.
Observed after rebuild: Electron acceptance passed all palette assertions and
the existing command/filter/comparison/calculation flow. Typecheck, style-token
check and five rental tests passed. Screenshots: verification_anke/anke-agent.png
and verification_anke/rent-overview.png in the delivery directory.

Gray White: the rental plugin contributes a light-base neutral theme through
the existing registry (ui.theme). Settings > Appearance > Theme selects it;
built-in Light restores blue/white. Rental panels use app.getAppearance and
appearance:changed to follow it. Actual Electron acceptance covered selecting
Gray White, panel synchronization, renderer reload persistence and restoring
Light. Screenshots: verification_anke/anke-gray-white.png and rent-gray-white.png.

Native UI correction: removed the added workspace dashboard, top navigation,
module cards and repeated sidebar entries. The upstream empty hero, composer,
sidebar layout and settings components are restored. Rental modules are exposed
through the command registry; rental skills use the existing Skills page, and
four rental expert definitions use the existing Subagents page, labeled 专家团.
Branding and domain text change independently of the native component layout.
The identity prompt specifies 我是HIT syt旗下的智能办公助手。 Live provider
identity replies and expert execution remain untested.

After this correction, desktop build, typecheck, style tokens and five rental
tests passed. Actual Electron verification passed native hero visibility, absence
of the added dashboard, native expert catalog loading, rental queries and scenario
calculation, plus both theme selections and reload persistence. The check is
node ../verify_anke.cjs; current home screenshot is
verification_anke/anke-native-restored.png in the delivery directory.

Answer formatting update (2026-11-14): Agent and Bot user-facing prose uses
plain paragraphs through shared runtime instructions and display cleanup.
Heading hashes, emphasis asterisks and hyphen-list markers are suppressed,
including partial streamed markup and historical answers. Agent copy actions
and Bot copy/download/read actions use the same projection. Literal code, URLs,
dates, negative numbers and structured tool arguments retain their meaning.
Verification and live-provider limitations are recorded in
E:/FFD-Downloader-Windows/_workspace/anke-answer-format-20261114/ACCEPTANCE.md.
