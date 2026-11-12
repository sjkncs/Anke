# Anke

Anke is a local-first desktop assistant for housing services, rental evidence,
property operations, daily work and life. This repository contains the desktop
application, bundled assistants, companion services, tests and build metadata.
This is a source baseline, not a production release.

## Source map

| Path | Purpose |
| --- | --- |
| `apps/desktop` | Electron application, UI, native integration and bundled plugins |
| `apps/desktop/resources/plugins/local.pi-bot` | Anke Bot, teams and service workspaces |
| `apps/desktop/resources/plugins/anke.rents` | Rental evidence, events and housing integration |
| `packages` | Shared contracts, agent runtime and SDK packages |
| `crates/host-core` | Rust persistence and native host |
| `rent-knowledge` | PostgreSQL/PGlite, imports, listing sync and geospatial processing |
| `event-monitor` | Registered-source news monitoring and event snapshots |
| `talent-housing` | Local housing workbench, preferences and service work orders |
| `scripts` and `docs` | Build, tests, architecture, specifications and acceptance records |

## Development

Use Node 24, the pnpm version pinned in `package.json`, Rust stable and platform
prerequisites for Electron and native dependencies. On a clean machine:

```sh
pnpm install --frozen-lockfile
pnpm build:js
pnpm build:host
pnpm dev
```

Companion services are optional and use separate runtimes:

```sh
npm --prefix rent-knowledge ci
node talent-housing/server.mjs
python event-monitor/monitor.py --serve
```

The monitor contacts registered public sources. Review each service README
before running it. Geospatial dependencies are listed in
`rent-knowledge/geo-requirements.txt`; imagery and model weights are not bundled.
Browser smoke scripts retain workstation-specific browser defaults requiring
local adjustment; they are not clean-machine acceptance evidence.

## Verification

```sh
pnpm --filter @pi-desktop/desktop typecheck
node --test apps/desktop/test/anke-release-config.test.mjs
npm --prefix apps/desktop/resources/plugins/local.pi-bot test
node --test talent-housing/test.mjs talent-housing/workbench.test.mjs
python -m unittest discover -s event-monitor -p "test_*.py"
```

See the [verification checkpoint](docs/spec/06-delivery/anke-verification-2026-11-12.md).
The full desktop suite and clean-machine installer have not been accepted.

## Data boundaries

This source baseline excludes account databases, API keys, cookies, personal
profiles, raw rental snapshots, recordings, research archives and test caches.
The bundled rental record file starts empty. Import permitted local data using
the service tools; missing knowledge remains unloaded. Source completeness does
not imply dataset redistribution rights, real-time feeds or ten-year coverage.

## Updates and cloud

The owned repository is [sjkncs/Anke](https://github.com/sjkncs/Anke).
Run `node scripts/configure-anke-release.mjs sjkncs/Anke` after version changes.
A source push does not publish an installer. GitHub Actions are initially disabled
at repository level while inherited workflow files remain available for review.

This repository starts private. Public installer distribution requires a
deliberate visibility change or a separate public release channel. Never embed
maintainer GitHub credentials in a desktop client. See the
[release and cloud contract](docs/spec/06-delivery/anke-releases-and-cloud.md).
Supabase accounts, cloud announcements, upgrades and token claims are pending.

## License and provenance

The desktop baseline derives from revision
`4ad0094e87b3c9ab75653a770f67f0d09abd63a4`. Preserve [LICENSE](LICENSE),
[source notes](ANJU_SOURCE_NOTES.md), plugin licenses and notices. Historical
upstream guides are retained in [docs/upstream](docs/upstream/README.original.md).
The bundled Bot retains Apache-2.0 terms. Internal package identifiers remain
for compatibility and are not product-facing branding.
