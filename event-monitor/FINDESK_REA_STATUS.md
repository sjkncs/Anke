# Findesk integration and REA evidence - 2026-11-12

## Findesk

Official sources: https://www.findesk.cn/ai-access and https://ffd.findesk.cn/api/v1/catalog/public-capabilities . The latter was fetched live with no authentication and contains 87 interfaces, schema 2.0, catalog date 2026-10-12. `sync_findesk.py` refreshes the snapshot; `FindeskCapabilities` searches a bounded set of up to 20 catalog entries in the existing Anke plugin. `anke.findesk.open` opens the official account page through the host's external browser permission. No browser credentials are extracted.

The account page returned an unauthenticated state in the independent request. Account API credentials, entitlement, financial/news/report delivery and billing acceptance remain pending. Public directory access is not a market-data connection. No subscription or paid data request was made. Native packaged desktop synchronization has not been verified.

Validation: `node --test test-findesk.cjs test-events.cjs test-events-host.cjs` in the rents plugin, plus `node --check main.js`. The process test checks registration and invocation of the Findesk catalog route. Source-only integration does not prove native UI activation.

## REA

Recovered prior evidence: `../verification_anke/qoder-reference/COMPARISON.md`, `source-comparison.json`, `qoder-local.png`, `qoder-chat.png`, and `qoder-work-local.png`.

Prior inspected repository: https://github.com/morluto/rea/tree/e2585aa7ce31c37866ca46991ec656fdffaa3b90 , MIT. The recorded target was `D:/Qoder/resources/app/extensions/aicoding-agent`. Evidence ID: `ev_74082f13164d38ac360579648415f6718f0c4f0e8debd9a2cc6e752ad7f6ffdf`. The record establishes one extension entry-point analysis; main-package analysis timed out. The referenced raw evidence bundle has not been recovered during this audit. No full reverse engineering or harness equivalence is claimed. Existing visual comparison and gray-white adaptation are distinct from harness execution.
