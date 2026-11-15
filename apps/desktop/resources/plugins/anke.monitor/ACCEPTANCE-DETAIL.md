# Stock-detail acceptance (2026-11-12)

## Scope

The active source checkout is an unborn Git repository with existing untracked
project files. No base revision or dedicated Git worktree could be established
without creating repository history. Changes remain local and uncommitted.
Existing monitor modules were reused in place; no sibling project was copied.

## Observable changes

- The bot's Wealth Board header action and service launcher open the native
  monitor plugin. More Data preserves the existing Findesk capability workspace.
- A selected stock opens a fixed, scrollable detail overlay rather than a
  below-the-fold section. Escape closes it and Tab stays inside its controls.
- Quotation, valuations, capitalization, volume ratio and upstream limits are
  shown together. Missing fields remain dashes rather than fabricated values.
- Existing day/week/month charts, overlays, indicators, drawing and replay
  controls are retained.

## Checks

- `node --test detail.test.cjs`: 2 passing tests, including isolated Chromium
  interaction, period change, indicators, keyboard zoom, close and missing data.
- Bot plugin: `node --test --test-reporter=dot tests/visual-workspace-ui.cjs
  tests/wealth.cjs tests/wealth-ui.cjs`: 6 passing tests.
- Syntax checks passed for both changed app modules, stock-facts and market.
- Live read-only calls through the actual monitor adapters returned 5,704
  market rows and 321 Tencent forward-adjusted daily bars for sz300308,
  last date 2026-11-12. This does not establish quote freshness beyond source
  timestamps, future availability, or Findesk account acceptance.
- `output/stock-detail-fixture.png` is explicitly a synthetic browser fixture,
  not a screenshot of live market history or the running Electron application.

## Acceptance boundary

The existing desktop process/profile was not restarted or attached. Native
Electron launcher acceptance is pending. No Findesk credentials or upstream
account state were changed. No remote publish, commit or push was performed.
