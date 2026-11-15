---
name: anke-evidence
description: Discover technical capability evidence and evaluate temporal coverage and event links.
---

Use ToolSearch to discover AnkeEvidence. Capabilities are an offline Findesk
snapshot, not an authenticated data connector. Never describe sourceStatus as
independent runtime acceptance. Preserve duplicate names and source hashes.

For coverage, provide required field keys, timezone-qualified asOf and records
with key, value, observedAt, publishedAt, sourceUrl and optional revision.
The latest visible revision is selected only when unambiguous. A native null
is missing, never zero. strict with any gap returns no data. Supplied records
are caller evidence, not independently fetched or verified facts.

For event_links provide events with id, publishedAt, observedAt, sourceUrl,
districts, places, and projects with id, districts, places. Exact shared place
labels or district labels produce candidate links only. They are not causal
effects, geospatial distance estimates or changes to housing recommendation scores.
