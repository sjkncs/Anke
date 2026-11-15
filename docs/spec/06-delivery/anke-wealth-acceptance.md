# Anke wealth integration acceptance

The plugin wealth workspace preserves native Bot layout and theme. Its
service shortcut and toolbar open the same board. The board consumes the
official Findesk REST/MCP catalog and cookbook through plugin-owned transport,
not renderer fetch. Account keys remain in the current Bot vault; explicit
MCP server and per-tool grants are mandatory. User-created Bot instructions
are preserved when wealth tool guidance is appended.

Acceptance requires addressability of every catalog MCP tool and each REST
endpoint with a parameter contract, argument rejection before transport,
session ownership enforcement, cancellation, single-flight requests, explicit
HTTP/business errors, portfolio idempotency and no automatic replay.
Browser acceptance additionally requires categorized search, official scenario
references, editable forms, tables, finite numeric trends, raw export, local
favorites and disabled actions when authorization is missing.

Run local.pi-bot tests/wealth.cjs, tests/wealth-ui.cjs, tests/findesk.cjs,
tests/anke-services.cjs and tests/routes.cjs. Synthetic network fixtures are
never represented as real account or data-source acceptance. Live balances,
provider coverage, paid delivery and installed desktop reload remain separate
verification gates. See the plugin WEALTH_WORKSPACE.md for implementation
scope, limits and current delivery boundaries.
