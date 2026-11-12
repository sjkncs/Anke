# Anke verification checkpoint — 2026-11-12

## Verified scope

- Bot regression suite: 394 passed.
- Bot routing/service checks: 102 passed.
- Targeted Bot update, settings, color and workspace checks: 11 passed.
- Desktop updater, owned-feed configuration and lifecycle controllers: 17 passed.
- Native isolated desktop probes: permission settings, configuration sync,
  custom endpoint without a key, and lifecycle dialog each passed after fixes.
- TypeScript checking passed after the owned release-notes change.

The native probes mount application components in isolated Electron fixtures;
they do not establish installer delivery or a production cloud connection.

## Repairs at this checkpoint

An unset owned repository blocks update requests and downloads. Main, Bot and
packaging share a local configuration workflow. Release announcements reject
foreign or incomplete installer assets. Footer notification permission is not
requested in the background and announcements are deduplicated per version.
Uncatalogued versions never borrow upstream release notes.

Lifecycle cancellation receives focus immediately on mount. Hidden Windows
fixture waits no longer rely on animation frames, and temporary-profile cleanup
retries transient file locks. Existing component assertions now check the
product's actual Anke branding.

## Outstanding acceptance

The all-desktop test run did not finish. High-concurrency transport timeouts
and the interrupted bounded rerun are failures/incomplete evidence, not a pass.
Targeted reruns cover the repairs listed above only.

No installer release was published. Repository identity must be supplied by
the maintainer before binding the feed. Fresh install and N-to-N+1 delivery on
a separate installed profile remain pending. The Supabase project, login flow,
private-data ownership checks, news delivery, account upgrades and server token
ledger are not connected and must not be represented as live capabilities.

Raw local logs: `../verification_anke` beside the source checkout, including
`final-controllers.log`, `native-four-fixed.log`, `native-lifecycle-final.log`,
`typecheck-final.log` and `build-final.log`. The lifecycle failure in the earlier
four-probe log is superseded only by the passing dedicated lifecycle rerun.
