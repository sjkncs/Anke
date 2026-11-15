Local repair acceptance — 2026-11-14

Changes: plugin-local CommonJS declaration fixes anke.rea entry loading; launcher validates binaries and serializes startup; external worker guard reuses healthy services, bounds retries, and writes status and worker logs. Existing runtime crash supervision is preserved.

Observed desktop acceptance: anke.rea was reloaded through the running desktop IPC. The application log records plugin.mcp.connect with toolCount=170 and plugin.load.success. No provider request or native reverse-engineering task was submitted.

Checks executed:
node --test service-guard/policy.test.mjs — 4 passed.
node --check service-guard/guard.mjs — passed.
PowerShell Parser.ParseFile on 启动AnkeAgent.ps1 — no syntax errors.
node anke-agent-source/packages/host-runtime/node_modules/vitest/vitest.mjs run src/runtime-supervisor.test.ts --root anke-agent-source/packages/host-runtime — 6 passed.
node service-guard/smoke.mjs — 9 checks passed; machine-readable output in logs/smoke.json.

Recovery fault injection: verified port 47835 belonged to talent-housing/city-preview.mjs before stopping PID 19980. Guard PID 3260 started replacement PID 38760 at 01:52:31Z; state became healthy at 01:52:47Z. Subsequent authenticated market/event requests passed. No conversation, model task, database or collection checkpoint was reset.

An initial Windows process inventory decoded Chinese paths incorrectly, so the listing worker was incorrectly considered absent. Three launch attempts exited with already_running; the worker's existing single-instance lock prevented duplicate collection. The guard now receives process inventory as base64-encoded UTF-16 JSON, and the rerun reports the existing worker healthy. Initial smoke issues (waiting for recovery state publication and event-specific filter validation) were corrected; the final smoke passed.

Limits: process liveness does not prove collection freshness or source accessibility. Occupied/wedged services are reported degraded, not forcibly terminated. The guard does not automatically replay user tasks. Paid model streaming, real native REA engines, reboot persistence, and forcibly crashing the active desktop/host were not tested. Existing host recovery was covered by its six focused tests. No OS scheduled task, dependency install or Git publication was performed.

The local source checkout has an unborn branch (no HEAD commit), so a dedicated Git worktree could not be created. Only the plugin's package declaration was added inside that checkout; the separate guard, launcher and local documentation contain the remaining changes. No existing unrelated source changes were reset.
