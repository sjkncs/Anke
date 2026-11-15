# Life services 2026-11-13

The life settings page and the For You / Daily Care launchers reuse the current settings primitives and service configuration. Migration adds the two presets once, preserves custom shortcuts and respects later removal. Preferences and bounded offer history use existing plugin state persistence.

News uses the existing read-only Tencent adapter. The optional upstream Tencent skill is a separate imported capability; importing it does not install or authenticate its CLI. No source or license equivalence is implied. General news excludes housing/rent topics, keeps source links and timestamps, and supports explicit topic feedback and low-stimulation preference. Cross-service mental-state inference is not performed. Important housing, policy and account warnings remain in their dedicated services.

Care uses the existing renderer refresh loop, checks at most once per minute, uses Asia/Shanghai times, and does not run with the client closed. Quiet hours and opt-in defaults apply. Expired windows are not replayed. Offers persist once per date/slot; priority choices yield a draft, defer, or dismiss. No purchase, booking, payment or signature operation exists in this module. External actions must use an authorized adapter with concrete user confirmation and receipt checks.

Validation: `node --test tests/life-services.cjs tests/life-services-ui.cjs tests/personal-services.cjs tests/service-launcher-ui.cjs tests/anke-services.cjs tests/settings-routes-ui.cjs`. Browser screenshots use isolated state and clearly identified fixture news. They do not establish native UI, supplier or government acceptance.

Report revisions must begin by comparing the November 2 brief and the previous artifact against the three workstreams, questionnaire, model evidence, product architecture and annotated guide. Page count alone is not research completion. Preserve originals and keep measured results separate from proposed specifications.
