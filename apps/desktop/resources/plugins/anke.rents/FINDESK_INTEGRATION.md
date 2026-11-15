# Findesk data access

## Scenario-first workflow

`FindeskCapabilities({action:"cookbook"})` returns a compact scenario directory.
Pass an exact scenario id such as `history`, `minute5`, `news`, `research`, or
`macroSeries` as `query` to obtain the complete original template. Keyword
search returns summaries, keeping unrelated code out of the agent context.
The official cookbook contains 21 scenarios at the current snapshot.

Refresh with `node sync-findesk-cookbook.cjs`. It discovers the current official
documentation asset and parses literal template text without evaluating any
downloaded JavaScript. Unexpected structure or interpolation fails closed.
The snapshot records source URL, asset URL, SHA-256 and retrieval time.
It does not install the SDK or execute examples. Example code may contain
placeholder credentials, historical dates or HTTP/MCP snippets; these are not
all standalone Python scripts. Use the existing credential vault/environment.
First execute a minimal scenario through an authorized configured connection,
then replace task-specific symbols, fields and dates. Macro series still needs
a confirmed dictionary indicator code. Options retain the official 503 notice.

## Verified official sources (2026-11-12)

- Documentation: https://ffd.findesk.cn/api-docs
- Product manual: https://ffd.findesk.cn/api-docs/manual
- Manual fragment: https://ffd.findesk.cn/api/v1/docs/data-api-fragment
  (manual version 2026-11-11).
- Public capability catalog: https://ffd.findesk.cn/api/v1/catalog/public-capabilities
- Public plan comparison: https://ffd.findesk.cn/api/v1/catalog/plan-comparison
  (policy version 2026.11.08-v1 at inspection).
- Current API-key entitlement: `GET /api/v1/entitlement`. The docs describe it
  as read-only and not consuming quota. Data requests use
  `Authorization: Bearer <FFD_API_KEY>`.

The user supplied a September policy/account snapshot. It is historical input,
not an authenticated balance response. The current public policy returns empty
`fixed_pools` in the inspected trial entry; do not fill these from an older
screen. Public trial `portfolio_task` is 30 while the supplied comparison says
100 tasks; retain the discrepancy until account entitlement resolves it.

## Anke behavior

`FindeskCapabilities({action:"plans"})` and `rents.findesk` return synchronized
public policy, source links, retrieval time, and documented entitlement route.
The existing default catalog/search behavior is unchanged. These routes do not
claim authenticated financial-data delivery and return `accountBalance:null`.
Run `event-monitor/sync_findesk.py` to refresh catalog and policy. This performs
only unauthenticated public reads; no data purchase or financial operation.

Map market quotes/history, fundamentals, macro, flows, screening, events, and
portfolio analysis to financial services. Map news and research to information
services. None of these proves a Shenzhen project-level rent API exists.
Use the field dictionary and capability contracts to discover real estate
indicators before requesting data; do not invent community-level rental series.

Keep three independent states: plan permission, channel/coverage availability,
and account balance. A channel returning 503 is unavailable even if included
in the plan. The account concurrency, batch size, and daily limits control
execution; never infer these from a global plan label. Partial coverage and
empty results must not become zero-valued financial observations.

Authenticated requests remain pending: neither `FFD_API_KEY` nor
`FINDESK_API_KEY` was present in the inspected process environment. No browser
session was extracted and no account credential was requested in chat.
The user's existing Bot MCP/vault configuration is the credential entry point.

Validation: `node --test test-findesk.cjs test-events-host.cjs`. The production
plugin-process test invokes both catalog and plan routes without touching an
actual financial account. Native desktop activation remains a separate check.
