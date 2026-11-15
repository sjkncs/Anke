Local reality layer (2026-11-12)

The Reality control imports a user-selected SPLAT, PLY or KSPLAT up to 250 MB
through a browser blob URL. Source media is neither uploaded nor persisted.
Coordinates, CRS, model units and yaw are explicit. Placement is provisional,
not surveyed registration. Removal disposes the viewer and revokes the URL.

Renderer: already-vendored MIT GaussianSplats3D 0.4.7. Its license is retained
beside splats.js. This is not the researched Spark upgrade. Third-party model
data has separate usage rights. No real Shenzhen reconstruction is available.

Validation: node city-model-browser.mjs loads six city meshes, imports the
synthetic ellipsoid via the local chooser, renders it with city geometry and
removes it without page errors. city-synthetic-splat.png is a synthetic fixture,
not empirical imagery. Installed Electron and real registration remain pending.

Local preview CSP permits blob reads, blob workers and WebAssembly compilation;
arbitrary JS evaluation and remote model fetches remain disallowed. The page
must be refreshed after restarting the preview service.
