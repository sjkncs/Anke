# Wealth visualization acceptance — 2026-11-12

## Delivered

The Wealth Analysis entry opens visual scenarios for news, announcements,
research, financials, flows, macro, fund holdings, screening, global markets,
portfolios and quotas. The separate Wealth Board still opens market/K-line
monitoring. Existing advanced capability forms remain accessible.

Results use provider-dependent article cards, grouped numeric charts, signed
bars, holdings distributions and quota meters. Interactions include source links,
article search, indicator/group switching, pointer/keyboard readouts, series
window selection and searchable/sortable paginated detail tables. Unsupported
or text-only payloads remain readable; absent data is not fabricated.

No automatic news interpretation, investment forecast or account transaction
was added. Headline/summary/analysis text is displayed only when supplied.

## Reproducible checks

From this plugin directory:

```
node --test tests/wealth-visuals.cjs tests/wealth-ui.cjs tests/wealth.cjs tests/visual-workspace-ui.cjs
node --test tests/findesk.cjs tests/anke-services.cjs tests/routes.cjs
node --check renderer/app.mjs
node --check renderer/wealth.mjs
node --check renderer/wealth-visuals.mjs
```

The first group passed 8 tests; the second passed 95. Isolated browser fixtures
exercise linked articles, unsafe-link rejection, literal HTML display, financial
gaps/group changes, signed flows, holdings, quota, empty/text-only results,
query integration and mode switches. Screenshots under
`output/playwright/wealth/` are explicitly synthetic, not current market evidence.

## Boundaries

Authenticated Findesk data and the running Electron application's reload were
not tested. No account secrets were inspected or changed. No new package was
installed. No commit, push or publication was performed. The source checkout
still has unborn Git history and unrelated untracked work; those files were
preserved. Full upstream UI parity is not claimed for undocumented payloads.
