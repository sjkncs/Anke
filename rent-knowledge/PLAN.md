# Rental knowledge implementation record

Request: support Shenzhen ten-year average rents, quarterly district rents,
community rents and RAG using PostgreSQL. Preserve the native gray/white UI.

Completed sequence:
1. Verify local CSV evidence, dates, source hash and existing plugin boundaries.
2. Add an independent PostgreSQL domain schema and pinned local runtime.
3. Ingest real listings with raw-field retention; compute stratified SQL metrics.
4. Export cited evidence cards and register the knowledge tool in the plugin.
5. Test import/query/export, missing periods, citations, duplicate protection and
   pgvector model/dimension isolation; compare SQL and tool answers on real data.

Pending data/acceptance: acquire a comparable 2016-2025 historical series;
establish a complete community registry; import policy/report documents;
generate real model-revision-labelled embeddings and wire semantic retrieval
to the Agent; validate a standard PostgreSQL server and live Desktop model chat.
Do not describe these as complete because the local pipeline passes.

The source is an existing uncommitted isolated Anke adaptation of a pinned
upstream archive. Its pre-existing Git/origin ancestry limitation remains in
ANKE_DELIVERY.md. No commit, reset, remote write or PI source backup mutation.
