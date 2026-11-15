# Visualization and decision-card repair — 2026-11-12

Changes: recoverable GenUI errors offer a manual retry that remounts the same
owning-session URL; session isolation and sandbox remain unchanged. Runtime
operational guidance encourages native decision cards for unresolved material
preferences, with one supported recommendation and no repeat questions.
Visualization publishing requires a successful write to the advertised session
directory and does not claim rendering success from file storage alone.

Validation completed:

- Desktop TypeScript no-emit check: passed.
- Agent-runtime TypeScript build: passed.
- Electron-Vite production build: passed (existing large-chunk warnings).
- Card, recovery, native-reader boundary and rich-option tests: 26 passed.
- Headless Chromium retry/remount/foreign-window regression: 1 passed.
- GenUI protocol, security headers and vendor manifest tests: 15 passed.
- Runtime mode-prompt and fragment validation tests: 17 passed.
- Installed native Host, disposable profile and copied real chart: passed,
  10,691 bytes identical to source. Initial 10-second startup probes timed out;
  the 45-second bounded acceptance succeeded. No second Host used live data.

The original chart exists and its quoted path matches. Its historical missing
state has not been reproduced inside the live desktop; the original cause is
unconfirmed. The running desktop and sidecar must reload/restart to pick up
compiled changes. No automated test certifies stock data accuracy or the stated
trend conclusion. Recommendation frequency remains a model decision guided by
the operational prompt, not a forced per-message popup.
