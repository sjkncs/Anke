# Anju source adaptation

Upstream: https://github.com/vastsa/PI-Desktop
Snapshot: 4ad0094e87b3c9ab75653a770f67f0d09abd63a4 (package version 0.21.0).
License: LGPL-3.0-or-later; preserve upstream LICENSE and attribution.

The Git transport reset repeatedly. The official codeload archive at the exact
revision supplies the baseline instead. The immutable snapshot is retained in
../upstream-source. This directory is a dedicated orphan worktree on
fix/rent-source-ui, without fabricated upstream history or a local commit.

The Agent application uses upstream Electron, React, Rust Host and Pi sidecar.
Its typography, sidebar, composer, settings and shared primitives remain upstream
source. Only the English and Simplified Chinese shell name, empty greeting and
composer placeholder change. The PyQt application opens the rent cockpit only.

Acceptance: compare styles and UI components byte-for-byte with the snapshot;
build the JavaScript workspaces; launch Electron with an isolated data directory;
check actual renderer fonts and host startup. A renderer build alone does not
prove Rust Host or external model authentication. No API key belongs in this tree.

Initial environment exception: no Cargo executable is available on PATH. The
matching official 0.21.0 portable release can supply a prebuilt Host after its
GitHub SHA-256 digest is verified; do not substitute another release's protocol.

Verified on 2026-11-10: `pnpm run build:js`, desktop typecheck and style-token
check passed. Runtime Host handshake and Pi sidecar configuration succeeded.
Playwright inspected the main window (not the auxiliary plugin launcher): 14px
body, 28px home heading, 275px sidebar, font-scale 1, no renderer page errors.
195 upstream component/style files matched the immutable snapshot byte-for-byte.
The official portable SHA-256 is
64d5983d8bd6e58f7f6946a93b96f0b95f2f376717f11f3cca7356e361806716.
The official Host has no Authenticode signature; integrity here is the
GitHub-published release digest, not a signature claim. External model calls
and rent-specific tool integration remain unverified.
