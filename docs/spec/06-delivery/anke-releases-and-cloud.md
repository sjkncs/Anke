# Anke releases, notifications and cloud roadmap

## Current delivery contract

The maintainer sets the owned public release repository with
`node scripts/configure-anke-release.mjs OWNER/REPOSITORY` before building.
This synchronizes the Bot checker, Electron Main feed and packaging metadata.
The script changes local files only; it never creates a release or uploads.
Run it again after incrementing the desktop version. No repository is assumed.
An unset repository reports unconfigured, makes no release request and never
falls back to an upstream project. Renderer cannot supply a feed URL.

Bot update checks run at startup and every six hours when enabled. A complete
stable release must contain `Anke-Agent-Setup-VERSION.exe` from the configured
repository. Drafts, prereleases, foreign URLs and incomplete uploads are rejected.
The Bot sidebar footer offers a release button; a desktop notification is sent
once per version only if notification permission was already granted. The
update preference also suppresses this notification. Disposed or superseded
requests cannot restore stale UI. The release page provides What's new content.
In-app notes come only from `apps/desktop/resources/anke-release-notes.json`,
keyed by version and locale. An uncatalogued release offers the owned release
page without borrowing unrelated upstream product notes.

Electron Main retains its existing installer delivery and checksum validation.
An installed client requires the matching electron-builder `latest.yml`, installer
and blockmap in a stable GitHub Release. Portable builds remain notify-and-link.
An installer handoff from a pre-existing default Electron shortcut is not proof
of a packaged update. Verify fresh install, N -> N+1 update, retained user data,
cancel/dismiss, offline and incomplete-release behavior on a separate profile
before rollout. No remote release or distributed-client acceptance is claimed.

## Cloud phase (pending, not connected)

Use Supabase Auth for login and password reset; do not store raw passwords in
application tables. Use user_id ownership plus Row Level Security for profiles,
preferences and private data. Keep service-role credentials on the server.
Validate desktop login callback and store refresh sessions in OS secure storage.
See https://supabase.com/docs/guides/auth and
https://supabase.com/docs/guides/database/postgres/row-level-security.

Use one notification inbox for releases, What's new, activities/offers, account
upgrades and token claims, with read state and subscription preferences. Only
published, audience-matched messages appear; expired offers stop accepting claims.
Do not auto-open marketing windows or confuse announcements with operational
housing alerts. Cross-device delivery needs a real project and authenticated
backend; no campaign or account state is fabricated locally.

Plans, entitlements and token balances are server-authoritative. Token claims
require authenticated, idempotent server transactions, eligibility and expiry
checks and an append-only ledger. A client click cannot mint tokens or upgrade
an account. Payment/provider callbacks and reconciliation are separate acceptance
gates. The cloud project, schema migration and service endpoints are pending.

## Verification

First-launch neutral-theme persistence is cosmetic: failure must not abort
bootstrap/sidebar recovery, and the persisted migration marker is written only
after a successful settings save. Rental-role storage uses erasable TypeScript
so Node controller tests load the same implementation without parameter-property
transforms. Legacy source-contract tests must assert Anke's package identity.
Lifecycle confirmation focuses Cancel immediately after mounting, without
depending on animation frames; this also works while the window is hidden.
Native Windows fixtures use bounded timer ticks for settling and retry cleanup
while Electron releases its temporary profile files.

- Bot: `npm test` and `node --test tests/anke-releases.cjs`.
- UI: `node --test tests/settings-routes-ui.cjs tests/update-notice-ui.cjs`.
- Main: `node --test test/updater-controller.test.mjs test/update-timeout.test.mjs`.
- Full desktop tests must run with bounded concurrency on this workstation;
  Vite transport timeouts in an overloaded concurrent run are not a pass.
  A locally provisioned desktop test executable can be selected explicitly via
  `ANKE_ELECTRON_BINARY`; a nonexistent override fails instead of falling back.
  Node 24 avoids Node 22 loader-hook compatibility failures in upstream tests.
