# Findesk account access

Full catalog access is now implemented by `anke_wealth` and the wealth board;
see WEALTH_WORKSPACE.md. The smaller `anke_findesk` interface below remains
compatible for existing callers.

`anke_findesk` is registered through the existing Bot-session tool gate. It
resolves only that Bot's `FFD_API_KEY` in the encrypted vault. Use
`request_secret` to collect the key through Bot settings, never through chat.
No shared-key fallback or account-wide grant is inferred.

Start with `status` (local metadata), then `entitlement` (GET
`https://ffd.findesk.cn/api/v1/entitlement`). The latter returns the provider's
current response without inventing balances from public plan limits.

For a user-requested search, `news` and `research` accept a query of at most
200 characters and copy the official cookbook REST routes with a limit of
10. News uses seven days and min_score zero. Research searches metadata and
does not download files. Searches can consume quota. No automatic retries,
polling or background searches occur. HTTP errors fail explicitly. Shared
transport enforces cancellation, a 30-second timeout, a 2 MB response limit
and rejects redirects. Results pass through vault redaction.

Other official scenarios remain available as templates in
`FindeskCapabilities` (`action: cookbook`). This account tool does not execute
Python snippets or pretend to implement all 21 cookbook scenarios.

Source: https://ffd.findesk.cn/api-docs/cookbook (snapshot retrieved
2026-11-12, sibling `anke.rents/data/findesk-cookbook.json`).

Verification: `node --test tests/findesk.cjs` from this plugin directory.
Tests use fake credentials and mocked HTTP; they do not establish live account
access, native desktop registration or quota deductions.
