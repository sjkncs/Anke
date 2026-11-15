# Settings visual acceptance, 2026-11-14

Usage cards expose reported Bot/model totals using local brand marks, donut shares, numeric rows and trend tooltips available on pointer hover and keyboard focus. Escape dismisses the tooltip. The report's existing grouping/filter IDs and missing-value semantics remain authoritative. No external billing or endpoint metrics are synthesized.

MCP uses a responsive two-column editor and authorization panel, falling back to a single column on narrow windows. The configuration is a labeled multiline JSON textarea. Formatting validates JSON and reports errors without saving. Checkbox cards show selection, all/clear actions and a selected count. Saving submits existing settings plus the explicitly checked Bot IDs; it never implicitly enables a service or grants all tools. Host validation remains authoritative.

Acceptance: isolated browser fixture at 1440px and 720px verifies model images decode, trend focus/Escape, editor size, 15 authorization cards, selection, invalid JSON rejected before save, and the exact selected Bot payload. Existing settings route and character compatibility tests passed (2/2). Main renderer build passed. Fixture screenshots contain synthetic labeled usage, not private account statistics.

Real desktop settings interaction and provider/MCP connections are not tested by those fixtures. No live desktop restart or paid calls were made. Local presentation assets and compiled renderer are backed up before synchronization.
