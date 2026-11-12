# Public remote sensing acquisition

`collect_geo.py` searches the public Element84 Earth Search STAC API for
Sentinel-2 L2A scenes covering a bounded Shenzhen crop. It preserves the search,
selected item, collection terms, acquisition time, asset URLs and SHA256 hashes.
Only required cloud-optimized GeoTIFF byte ranges are read. A loopback-only
read bridge handles the local GDAL/Windows network incompatibility. Downloaded
GitHub source is data and is not executed.

Pinned inspected reference: opengeos/segment-geospatial at
`826718cac3781614ef5eccd9acf7d7b5dfd06089`, MIT. Its README, requirements,
pyproject and license are archived in source-evidence. This is SamGeo, not
verified author code for the GeoSeg-SAM geological-interpretation paper.
The related JiangLifan-zju/GeoSeg project is another method; its public README
currently requires Qwen3-VL, SAM3, CLIP and local weights. No inference weights
were silently substituted or run.

References checked 2026-11-11:
- https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a
- https://github.com/opengeos/segment-geospatial
- https://github.com/JiangLifan-zju/GeoSeg
- https://sentinels.copernicus.eu/documents/247904/690755/Sentinel_Data_Legal_Notice

Data attribution: Contains modified Copernicus Sentinel data 2026.
The legal notice permits access, adaptation and redistribution with attribution.
Dependency pins are in geo-requirements.txt. Rasterio is BSD-3-Clause; its
bundled GDAL/PROJ dependencies include their own licenses. Binary wheels only
were installed in geo-runtime; no source build hooks were executed. This
runtime is on C: because E: has less than 200 MB free. No GPU stack is installed.

```powershell
python -m pip install --only-binary=:all: --no-cache-dir --target geo-runtime -r geo-requirements.txt
python collect_geo.py --name shenzhen-nanshan-clear
python analyze_geo.py data/geospatial/shenzhen-nanshan-clear
python -m unittest test_geo.py
```

Default bbox is WGS84 [113.92,22.51,113.98,22.56]. This is an acquisition
pilot region, not a verified rental community. The crop is at 10 m for RGB,
red, green and NIR, 20 m for SCL. The script bounds a run to 4 million pixels
per band. Scene selection checks coverage and scene cloud; pixel-verification
checks the actual crop, georeferencing, hashes, grid alignment and clear-pixel
fraction. At least 80% SCL 4/5/6 is required for the diagnostic quality PASS.
Spectral indices are withheld pending radiometric offset validation; intermediate
index candidates are not published as environment indicators. The crop still needs a valid
project location and a validated land-cover model for project indicators.

Observed acquisition: S2A_49QGF_20261007_0_L2A, 2026-10-07, EPSG:32649,
628x566 pixels at 10 m (SCL 314x283 at 20 m). Five crops passed SHA256 and
grid checks. Clear-surface SCL 4/5/6 fraction is 97.31%. Source and preview
are in data/geospatial/shenzhen-nanshan-clear. The initial October 30 scene
was retained separately because its local crop was mostly cloud-obscured.

Residential coordinates remain unresolved: the existing listing CSV has no
usable coordinates. The Overpass residential-name pilot on overpass-api.de
returned HTTP 406; overpass.kumi.systems timed out after 40 seconds. No
residential coordinate was guessed, and no automated retries are scheduled.
