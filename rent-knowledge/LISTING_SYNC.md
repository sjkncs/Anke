# Public listing sync

The collector checks the public Shenzhen first listing page of Anjuke, Lianjia
and Beike at most once per hour while its process runs. This is a bounded sample,
not whole-city coverage, historical backfill, transactions or streaming rent.
The Anke launcher starts one worker; loopback port 18744 prevents duplicates.
There is no machine-start task.

Run `python listing_sync.py` for one cycle or `python listing_sync.py --serve` for
hourly checks. Verification/login redirects, gateways, or zero valid records
pause a source durably; later cycles do not retry it. After resolving access,
use `--source anjuke --resume anjuke` once (or the relevant source). No cookies,
login credentials, challenge bypass or private APIs are used. A web search
reader's access does not prove local access. Nonzero exit means a selected
source failed or remains paused.

Check `data/listing-sync/status.json` and the Agent knowledge action `sync_status`
for attempts, last successful import and pauses. Failed attempts preserve prior
success times. Housing-only batches retain IDs, URLs, observation dates, visible
housing fields and response SHA256; full pages with agent contact details are
not stored. Undisclosed fees/coordinates stay unknown. Platform redistribution
terms remain unverified; outputs stay local.

The existing PostgreSQL importer preserves originals and validates collisions;
export refreshes knowledge and detail snapshots. Per-day content revisions are
observations, not independent homes. Cross-platform same-home identity remains
unverified. Database contention fails visibly. Output files are individually
atomic, not a cross-file transaction; export failure is not synchronization
success. Stop the worker before manual import/export against the same store.

Validation: `python -m unittest test_listing_sync -v`, `node --test test.mjs` and
the plugin `node --test query.test.cjs`. Synthetic isolated checks do not prove
live platform availability, calibrated rent estimates or desktop model behavior.
