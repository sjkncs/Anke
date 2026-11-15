# Settings row alignment acceptance

Removed the 20px conditional-row inline margin from the shared settings CSS.
Appearance sidebar and Conversation conditional rows now retain the same card
width, label inset and control edge as their siblings. Dependency behavior and
saved settings are unchanged. Original source copies are in
`../backups/settings-alignment-20261112` beside the checkout.

Validation:

- `pnpm --filter @pi-desktop/desktop run build`: passed (existing chunk-size warning).
- `node --test apps/desktop/test/settings-responsive-layout.test.mjs apps/desktop/test/transcript-folding-settings.test.mjs`: 7 passed.
- `node ../verify_settings_alignment.cjs`: real Electron with an isolated profile,
  four cases covering Appearance and Conversation at zoom 1 and 1.5. Each case
  asserts card left/right, width/height, title left and control right against the
  first row with tolerance below 1 CSS pixel. Row counts: 4, 7, 4, 7. Passed.

Measured geometry and screenshots: `../verification_settings_alignment/`.
The business data profile was isolated, but the original probe omitted Electron's
`--user-data-dir` and therefore shared Chromium zoom preferences with normal use.
The 150% probe persisted zoom level 2.223901085741545 (factor 1.5). This was a
verification isolation defect, not a font-size or CSS alignment change.
The probe now passes a separate Electron profile directory and resets zoom in
cleanup. The normal profile's Preferences was backed up before resetting zoom.
