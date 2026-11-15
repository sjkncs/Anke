ANKE local pipeline protection

The existing launcher checks the core/Electron binaries before starting. A Windows named mutex serializes concurrent launcher invocations. The guard starts once per user session using an exclusive loopback listener on port 18745. It checks housing, workspace, inspection, event collection, and listing-worker liveness every 15 seconds.

Missing processes are restarted at most three times per service per ten minutes. Occupied ports and running-but-unhealthy processes are marked degraded and never killed. The guard does not replay agent tasks or reset collection checkpoints, paused sources, CAPTCHA states, or login requirements. Listing liveness is not evidence of successful collection. A user closing the desktop does not cause the guard to reopen it. Core and agent sidecar crash recovery remains owned by the existing Electron RuntimeSupervisor.

Launch with 启动AnkeAgent.cmd. Status is written atomically to service-guard/logs/status.json; transition and restart records are in guard.jsonl. Workers started by this guard write local stdout/stderr logs. Stop only the PID recorded by guard_started to disable protection; dependent services are deliberately left running. A full OS reboot requires launching ANKE again; no scheduled task or login persistence is installed.

REA entry repair: the anke.rea plugin declares type=commonjs in its own package.json, matching its existing module.exports entry without changing its permissions or MCP server configuration.

Checks: node --test service-guard/policy.test.mjs; node --check service-guard/guard.mjs. Smoke acceptance must additionally check real desktop settings, plugin reload, authenticated housing queries, duplicate guard launch, and missing-process recovery.
