# Source and adaptation

Housing Monitor adapts the map-first, multi-panel dashboard composition of
https://github.com/sjkncs/worldmonitor at revision
`f46f6360330107a70afb679223770a2c37d902af`, inspected 2026-11-12.
World Monitor copyright 2024–2026 Elie Habib. Its LICENSE declares AGPL version
3 or later; package metadata declares AGPL-3.0-only. This module uses AGPL-3.0
terms and retains the complete upstream license. Anke-specific implementation
and modifications copyright 2026 Anke contributors.

Inspected: package.json, LICENSE, src/components/Panel.ts, InsightsPanel.ts,
src/config/panels.ts, src/styles/main.css and src/styles/panels.css.
No upstream install hook, analytics SDK, cloud account, Tauri runtime or model
download was executed. The implementation reuses Anke's existing Three.js asset
and local services rather than importing World Monitor's global feed stack.
Upstream dependencies include MapLibre, deck.gl, ONNX/transformers, telemetry
and hosted backends; they are not installed by this module.

Local service layout and rendering are adapted; World Monitor's global map,
military layers and AI provider calls are not claimed as integrated. Supply
points require WGS84; existing BD09 records are not silently reprojected.
Building extrusion requires supplied polygon geometry and explicit metre heights.
Insight cards summarize source topics deterministically; the packaged analysis
button uses the existing configured model via permissioned plugin completion.
No live-provider acceptance or simulated model output is claimed.

Boundary overview: Alibaba Cloud DataV administrative boundary service,
https://geo.datav.aliyun.com/areas_v3/bound/440300_full.json, accessed
2026-11-12. Nine district features verified. The remote dataset is not bundled
or relicensed with this source. DataV attribution is linked from the dashboard.

Corresponding source is the housing_monitor directory in the maintained Anke
repository. When deploying this module for remote users, provide those users
access to the corresponding modified source under its license.
