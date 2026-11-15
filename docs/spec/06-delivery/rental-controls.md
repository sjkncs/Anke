# Rental workspace acceptance

The rental workspace follows the neutral desktop control scale without altering
application zoom. Single-period series show a dated median and sample count,
not a trend. Time navigation remains available for multi-period series.

Scatter opacity changes plotted opacity. The optional central distribution
filters plotted points at each axis's 95th percentile only; source records,
aggregate statistics and the default full-sample plot remain unchanged.

Event filters use supplied publisher and category fields. Render publication
dates, effective dates, phase, collection-source health and unknown metadata.
Deduplicate only identical source URLs in the display. Keep source data intact.
Tables must not cause document-level horizontal overflow at 600/760/1200px.

Run `node --test rental-controls.test.cjs` in the request worktree. The synthetic
browser fixture covers these interactions without provider calls or data writes.
Also run sibling `talent-housing/rent-visuals-live.test.mjs`: the isolated service
must load the real rental snapshot and show project details and empty filters.
This does not validate the user's installed desktop plugin window or providers.

Event article opening must require HTTPS, an allowed government/Tencent hostname,
no credentials or custom port, and exact membership in the collected snapshot.
Run `node --test event-links.test.cjs` for native validation and standalone bridge
membership rejection. Do not broaden external URL opening to arbitrary websites.

The header Refresh action refreshes both market data and event data. Collection
health uses bounded error labels (network failure, timeout, provider failure),
not raw exception text, and exposes the last check time on hover.

Scatter opacity and display scope persist within the page across data refresh,
period changes and project sorting. Each axis percentile is computed once per
plot redraw, not once per observation. An empty central selection has an empty
state instead of invalid SVG coordinates. Reloading the page restores defaults.
