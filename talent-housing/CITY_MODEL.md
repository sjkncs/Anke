Shenzhen city scene

The housing overview loads the six preserved district MultiPatch SHP files as
indexed triangle meshes. Original SKP and SHP assets remain unchanged.
Source EPSG:32649 is transformed to EPSG:3857, relative to 114.05E, 22.65N,
in kilometers. Source elevations retain their meter values; vertical datum is
unknown. Mercator horizontal scale and elevation are not physical metrology.
SKP equivalence and ground-control alignment remain unverified.

Rebuild with Python 3.11, pyshp, pyproj and Shapely 2.1:
`py -3.11 build-city-model.py <source-SHP-directory> <plugin-renderer/city>`
Triangle strips retain source vertices. Outer rings use constrained Delaunay
triangulation, never a fan assumption for concave roofs. Invalid rings are
counted; unsupported part types fail. provenance.json records source hashes,
bounds, counts and pending calibration. Assets load sequentially as local
scripts to work under the existing panel policy without new network grants.

The existing overview layout remains unchanged. A district selector and reset
control change the camera. Drag rotates, wheel zooms, shift-drag/right-drag pans.
Only housing coordinates explicitly labeled WGS84, GCJ02 or BD09 are mapped;
GCJ02/BD09 inverse transforms are approximate. Unknown coordinates are omitted.
Geometry is historical source data, not current inventory or availability.

Run `node city-model-browser.mjs` for real WebGL rendering, all district asset
loads, district switching, missing-coordinate exclusion and synthetic marker
projection. This does not establish a live Electron panel refresh, physical
registration, complete city coverage or real housing supply.
