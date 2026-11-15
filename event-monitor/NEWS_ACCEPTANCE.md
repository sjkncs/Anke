# Anke news acceptance - 2026-11-12

## Delivered behavior

Tencent News search feeds the existing versioned event store and exported plugin snapshot. It searches the fixed public query `深圳 住房 租金`, with five results per cycle. Credentials use a Windows user-scoped encrypted vault outside the project. Government collection retains its existing URL policy. Media source identity remains explicit in cards and knowledge metadata; summaries are provider abstracts, not generated analysis. No rent observations, housing supply, allocation rules, or model configuration were changed.

## Observed evidence

- A live authenticated POST to the Tencent News search endpoint returned `base_rsp.code=0` and article records.
- A subsequent collector invocation successfully read the encrypted vault and imported five articles. The merged event snapshot contains 20 records.
- `py -3.11 -m unittest test_monitor test_tencent_news -v`: eight passed.
- `node --test test-events.cjs test-events-host.cjs` in the rents plugin: three passed. Renderer and plugin JavaScript syntax checks passed.
- `node --test test-events.mjs` in rent-knowledge: passed, including exact media host validation, credential/HTTP rejection, idempotent revisions, publisher metadata and unchanged rental observations.
- `node import-events.mjs`: 20 events imported into the existing knowledge database and its read-only export.
- `node news-browser.mjs` in talent-housing: passed real-snapshot rendering, article links, mouse expansion, keyboard operation, preservation across refresh, 390px viewport width and no page exceptions. Uses an isolated temporary housing database. Screenshot: `../talent-housing/verification/news/news-cards.png`.

## Limits and activation

This is a bounded keyword search and may return older articles; each publication date remains visible. No historical completeness or news licensing beyond the configured provider access was established. Rental and stock APIs remain unconnected. Native Electron display and installed-package synchronization were not tested in this change. Existing collector process on loopback port 18743 was left running: it must be restarted normally to load the new collection hook. No unrelated process was terminated. The initial five articles are already available in the exported snapshots.

Scoped source originals were preserved under `../_backups/news-20261112` before editing. No commit, push, paid subscription, order, or external publication occurred.
