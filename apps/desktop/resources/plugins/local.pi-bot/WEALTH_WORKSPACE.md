# Findesk wealth workspace

## Visual analysis workspace (2026-11-12)

The Wealth Analysis toolbar action opens scenario navigation for news,
announcements, research, financial statements, capital flows, macro, funds,
screening, global markets, portfolios and account quota. All Capabilities
retains the complete catalog and official templates. Less common filters
remain available under More Filters. Queries are user initiated.

`renderer/wealth-visuals.mjs` renders provider results as expandable sourced
article cards, selectable numeric charts with pointer/keyboard readouts,
signed flow bars, holding distributions and quota meters. Nested report groups
are selectable; explicit column/matrix contracts are supported. Details have
search, sorting and 25-row pages. Missing observations break lines rather than
being replaced with zero. Provider text is rendered as text; source links allow
only HTTP(S). No AI summary or sentiment is invented.

Quota objects follow the catalog's nested pool contracts. Remaining can be
calculated as declared limit minus used when no explicit remaining value exists.
No chart normalization or unit conversion is inferred. Unsupported response
shapes remain available through readable fields and complete-data export.

Validation adds `tests/wealth-visuals.cjs` for news links, grouped financial
series, gaps, flows, holdings, quota and empty states. Screenshots under
`output/playwright/wealth/*-fixture.png` use synthetic data. These tests do not
prove authenticated Findesk delivery or acceptance in the running Electron app.

The existing gray/white Bot interface now exposes a wealth board through its
service shortcut and conversation toolbar. The board groups market data,
financial/macro data, flows/screening, news/research, portfolio/risk and global
markets/derivatives. Search, per-Bot local favorites, schema-driven forms,
official cookbook references, result tables, finite numeric trend series,
raw JSON export and research file download are implemented.

The board and `anke_wealth` share `src/wealth.js`. The catalog currently maps
82 REST endpoints with documented parameter contracts and all 97 MCP tools.
These counts are transport operations, not independently delivered data
products. Four REST directory entries without parameter contracts are omitted;
corresponding capabilities remain reachable through MCP where documented.
The catalog is the existing sibling anke.rents snapshot; no upstream code is
executed and no package is installed.

REST credentials resolve only the selected Bot's encrypted FFD_API_KEY. MCP
requires an explicitly assigned, enabled HTTPS ffd.findesk.cn connector and
the existing per-tool bridge authorization. No connector URL, token or broad
tool grants are invented. Official conditional/unavailable states remain in
the catalog; live errors and coverage metadata remain authoritative.

Requests are single-flight across the team, bounded and cancellable. There is
no background polling or automatic replay. HTTP/business failures are errors.
Simulated portfolio writes require stable idempotency keys. They do not place
brokerage trades. External record mutations still require user task intent and
the native high-risk tool approval path. Research downloads reject redirects
and are bounded to 20 MB; other REST responses use the 2 MB shared limit.

Missing authorization disables query controls and provides the existing vault
request flow. Existing wealth Bot instructions are augmented on load without
replacing user customization. The desktop has not been restarted by this task.

Verification:

    node --test tests/wealth.cjs tests/wealth-ui.cjs tests/findesk.cjs tests/anke-services.cjs tests/routes.cjs

The browser test uses fake provider responses and an isolated browser profile.
It verifies categories, form controls, table/chart rendering, cookbook selection
and missing MCP authorization. Source integration, mocked network acceptance
and live provider delivery are separate gates. Live account queries and native
desktop acceptance remain pending account setup and reload.

Official references: https://ffd.findesk.cn/api-docs and
https://ffd.findesk.cn/api-docs/cookbook (accessed 2026-11-12).
