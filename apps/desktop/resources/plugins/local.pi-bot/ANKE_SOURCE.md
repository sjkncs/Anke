# Anke Bot adaptation

Source: https://github.com/vsd269/PI-Bot
Revision: b37894bdc873879eb48d3c11aeab94b47c688877 (0.3.107).
Retrieved: 2026-11-11. License: Apache-2.0; LICENSE and NOTICE retained.
The original installed 0.3.86 plugin is backed up outside this source tree.

Keep the stable local.pi-bot protocol IDs for host compatibility. User-facing
branding and default administrator use Anke Bot. The mascot extends ANKE's
house logo with hand-drawn limbs. Uploaded and explicitly chosen avatars remain
unchanged. Existing original PI profiles are not imported or modified.
The native upstream layout, conversation engine, permissions and voice controls
are retained. Network integrations require the user's own configuration.

## Teacher and life assistants (2026-11-11)

The one-time assistant migration adds two native collaboration groups and seven
editable role presets. Existing bots, conversations and explicit avatars remain
intact. Deleted presets are not recreated on subsequent launches. No tasks or
notifications run automatically. Model access still uses the user's PI provider.
The `anke_agenda` tool analyzes supplied event intervals and reports overlaps;
it neither reads calendars nor creates reminders. Missing time zones fail clearly.

HITA reference: https://hita.strayrn.com/support/ and
https://github.com/StupidTrees/HITA_X (accessed 2026-11-11).
The latter README describes course schedules, events, educational services and
campus information, and declares MIT licensing. This is a workflow reference:
no HITA code, assets, authentication logic or campus data was copied/executed.
HITA Aura's iOS source availability and current Android fork revision are not
verified. Portal adapters, ICS/Excel import and automatic notice monitoring are
pending; role instructions alone do not establish those capabilities.

Suggested next extensions: explicit calendar import with preview and deduplication;
source-linked teaching resource search; authenticated notice change detection;
daily briefing with opt-in reminders. Keep the existing native gray/white UI.

## Apartment, living and campus services

A separate one-time migration adds three native service groups, with three
coordinators and thirteen service workers. Existing roles and history are kept;
deleted service presets are not recreated. The `anke_service_status` session tool
reports scope and required connections. All external integrations currently
report `not_connected`; this is an explicit capability catalog, not an adapter.
Role instructions support supplied-material analysis and drafting only, subject
to configured models and tools. No payment, email transmission, delivery booking,
medical service or physical device operation is enabled by this migration.

Connection sequence: select the actual property system and gateway; implement
read-only notice, bill and telemetry adapters; verify source timestamps and
failure states; then add explicitly requested transactional operations with
receipts. Mail requires the user's chosen provider and scoped authorization.

## Local service ledger

`anke_service_desk` persists source-linked tasks and manual device observations
in the existing atomic team store. Records are scoped to the originating private
Bot chat or group. Private records never appear in another conversation's ledger.
Stable request IDs deduplicate identical create retries and reject changed input.
Progress follows open -> in_progress -> resolved -> closed, with evidence for each
transition. Billing resolution requires a receipt reference; this is a recorded
user assertion, not payment verification. No external work order is submitted.
Devices retain source, location and observation time; older observations cannot
replace newer ones, and records older than 15 minutes are labeled stale.

Ask a service Bot to record a sourced repair or bill, then request the service
dashboard. `anke_service_dashboard` creates a native private-chat card; group
calls return structured data. The card shows eight active records at most and
the full ledger remains queryable. Native tools are model-mediated, so actual
model selection and tool calling require separate provider acceptance. Ledger
data is included in normal local backup and validated on restore/startup.

## Clickable service desk

The current conversation header includes a Service Desk button. Its native dialog
uses `team.anke.desk` to list this conversation's records, create sourced tasks,
advance progress with evidence, and record timestamped device observations.
It works without a model request. It does not submit work orders or connect
payment, mail, delivery or IoT providers. Changing conversations requires reopening
the dialog; pending reads and writes cannot replace a newer dialog's content.
The dialog is removed when its parent app is disposed.

Verification: `node --test tests/anke-desk-ui.cjs` runs an isolated headless browser
against the real Team persistence and panel handler. It covers form submission,
progress, device recording, reopening, disk contents and a 390-pixel viewport.
This component check does not establish actual Electron desktop acceptance.

## Update compatibility

Display branding does not rename upstream release assets. The read-only checker
accepts `local.pi-bot`, `local.ds-bot`, and historical `PI-bot` package names,
in that priority order. Exact repository URL, tag, uploaded state and nonzero
size checks remain mandatory. It never installs a package automatically.

## Route acceptance

Run `npm run test:anke-routes` for route inventory, dispatch/error checks,
conversation ownership, conflict blocking, service persistence and settings
navigation. Inventory covers 82 panel operations, including one panel-only
microphone operation. Updater fixtures cover the network request without a live
request. Literal renderer calls and the allowlist must match registered operations.
Unknown methods and expired requests are rejected. The service desk operation
is explicitly allowed in the renderer bridge.

The service form browser test uses the production renderer RPC client, request
relay, panel handler and Team store with isolated activation/host dependencies.
Other route smoke tests prove dispatch or malformed-input rejection, not successful
external transactions. Eleven settings pages use isolated service fixtures.
No real desktop profile, provider, microphone, payment or outbound message is used.
