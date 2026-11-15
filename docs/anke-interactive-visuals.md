# Interactive market and rent views

The native PI shell is unchanged. The `anke.monitor` plugin adds horizontal and
vertical chart cursors, axis badges, hovered overlay values, visible-range text,
zoom buttons, single-bar arrow navigation and clickable market breadth filters.

The `anke.rents` plugin adds a Rent Board tab with district filtering, project
sorting, locally persisted watch lists, monthly/quarterly sample medians,
keyboard/pointer timeline navigation, zoom, a time slider, area/rent scatter and
project details with the existing residential-map handoff.

`rents.query` returns additive `visual` aggregates from all matching records,
before the existing 500-row ledger limit. Project identity includes district.
Mixed transaction/lease strata have no pooled visual statistics. Missing dates,
prices and areas do not become fabricated time-series observations. These are
sample medians, not a constant-quality rent index. Scatter is bounded to 2,000
valid observations and project detail to 100 rows; the UI discloses those limits.

Reproducible checks, from each plugin directory:

```text
anke.monitor: node --test detail.test.cjs
anke.rents: node --test query.test.cjs visual-data.test.cjs visual-ui.test.cjs
```

Browser tests use explicitly synthetic fixtures and do not authenticate to data
providers, place orders, modify housing records or restart the user's desktop.
They are not proof that an already-open native panel has loaded the latest code.
Real ten-year rent history, verified coordinates and stock chip-distribution
feeds remain dependent on available source data; they are not synthesized here.

## Standalone entry verification, 2026-11-13

The housing service's explicit asset allowlist must include `rent-visuals.js`
and `rent-visuals.css`. The old running servers returned 404 for these assets;
refreshing the browser alone could not update their in-memory route handlers.
The fix is in `../talent-housing/server.mjs`. The main service on port 47831
has now been gracefully stopped through its existing SIGTERM handler and
restarted. The desktop, sidecar and separate port-47834 preview were preserved.

From `../talent-housing`, run `node --test rent-visuals-live.test.mjs`. This starts
an isolated server with empty application state, the real rental snapshot and
the real browser bridge/CSP. It checks asset delivery, project details, district
filters and empty results. Screenshot: `verification/rent-visuals/real-snapshot.png`.
The observed snapshot contained 1,572 whole-unit asking-rent records and 922
district/project identities, dated 2026-11-07 through 2026-11-13. This is a dated
observation, not a fixed expected count or a native Electron acceptance result.

Failed rental queries clear the previous ledger, statistics and charts. Typing a
new query invalidates in-flight responses before the debounce timer fires.

Running-service acceptance: set `ANKE_RENT_LIVE=1`, then run
`node --test rent-visuals-live.test.mjs` from `../talent-housing`. This passed
against port 47831 on 2026-11-13. The test allows only read-only API actions
and verifies real project details, district filters, empty results and the
absence of browser page errors. Both new assets return HTTP 200. Screenshot:
`verification/rent-visuals/running-service.png`. This validates the running
service in Chromium, not the already-open Electron panel.

## Native panel verification, 2026-11-13

Reopening the rental plugin loads the current file-backed renderer. An older
open panel retained its previously loaded script and styles. Native verification
confirmed the source URL, neutral controls, single-period sample summary,
project details and district filtering. Selecting Nanshan returned 119 project
cards, all labeled Nanshan, and opened Huaruncheng Runfu Phase III. No horizontal
document overflow was observed. These counts are a dated snapshot.
Screenshot: `../talent-housing/verification/rent-visuals/native-verified.png`.
This check did not place orders, send chat messages or modify housing records.

Trend hover coordinates now use the SVG screen transform so a letterboxed chart
selects the correct period on narrow and wide panels. The browser regression
checks the first visible period at viewport widths 720 and 1900 pixels.

Rental trend charts also support pointer-captured horizontal drag and double-click
reset. Cursor badges display the selected date and sample median on the axes.
Regression coverage checks dragging changes the visible time range, reset
restores it, and project-to-map routing preserves the district and project.
An unresolved map lookup leaves the map frame hidden and asks for a more
specific address; it does not invent a location.
