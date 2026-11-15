# ANKE personal notebook and task outline

Date: 2026-11-15. Candidate changes are isolated because the supplied source snapshot has no resolvable Git HEAD. Existing source, runtime, and conversations are preserved.

## Behavior

- Both native Agent transcripts and the embedded Anke Bot use one React notebook component. Bot publishes only its active conversation identity and rendered message anchors through an in-process event.
- Select completed reply text to add a note. Right-click a generated or inline image to add an image note. Explicit confirmation commits; cancellation discards the draft. Notes can be edited, deleted, exported, and navigated back to their source.
- Text anchors store message identity, exact quote, and surrounding context. Ambiguous or changed text is not automatically highlighted. Original replies and model prompts are untouched.
- Each user turn has an editable task title. Local character-bigram/word cosine similarity suggests parent tasks. Short continuation turns attach to the preceding task. At most three levels are allowed; cycles and invalid parents are rejected. This is a lexical baseline, not an LLM semantic classifier.
- Loaded history is outlined; a missing anchor reports that earlier history must be loaded. This does not pretend that the full server-side history is already mounted.

## Persistence boundary

Personal reading overlays use a separate versioned IndexedDB store in the same desktop renderer origin. Confirmed writes wait for transaction completion and report failures. These overlays survive renderer reload and a normal restart with the same application profile. They do not write the host-owned SQLite database, alter canonical transcripts, or become agent context. JSON export provides an explicit user copy. Chat backup, account sync, and profile migration do not yet include this separate store. Clearing the application profile can remove it.

This local ANKE feature intentionally reintroduces personal reading annotations requested by the user after upstream ADR 0268 removed the earlier prompt-injecting annotation/side-chat mechanism. Retired directive and decision identifiers are not reused. Upstream chat/host ownership and model-role semantics remain unchanged.

## Validation

`node test.mjs`: real shared component in an isolated Playwright browser, with Agent and Bot DOM anchor shapes. Tests cover task rename, confirmed text note reload, canceled image note, confirmed image note reload, quote ambiguity, and cycle rejection. No paid model calls and no personal messages are used.

`node typecheck.mjs`: candidate renderer TypeScript using existing workspace sources, without installing dependencies.

`node build.mjs`: production renderer build to this candidate directory, preserving the active runtime until validation passes.

Native desktop acceptance and standalone Bot microphone-panel operation are separate from browser verification. The Bot integration targets the embedded main-window Bot, not a standalone panel renderer.

## Observed results

- Production renderer build: PASS, 5,534 modules, latest build 76 seconds. Existing large-bundle warnings remain.
- Candidate renderer typecheck: PASS, zero diagnostics.
- Agent and Bot anchor fixtures: PASS for text submit/reload, task rename/reparent, image cancel/submit/edit/reload, and absence of browser page errors. The edit test addresses the editor textbox by its role because the shared Field's implicit label incorporates existing textarea content.
- Bot app module syntax check: PASS.
- Active renderer files and Bot integration deployed after backups. No ANKE/Electron process was running at deployment; native launch and full desktop restart acceptance remain unperformed.
- No real provider calls, user-chat mutation, remote push, or paid inference occurred.
