"""Audit neighboring Shenzhen imagery without changing the original files."""
import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
import rasterio

IMAGERY = Path('C:/Users/Lenovo/Documents/深圳住宅更新整合交付/mutoulong_imagery')
INDEX = Path('D:/picture/official2042_with_streetview_by_name/INDEX.csv')

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for part in iter(lambda: f.read(1024 * 1024), b''):
            h.update(part)
    return h.hexdigest()

def read_csv(path):
    with path.open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))

def main():
    ROOT.mkdir(exist_ok=True)
    rasters = []
    expected = {x['file']: x['sha256'] for x in json.loads((IMAGERY/'pixel_checks.json').read_text(encoding='utf-8'))}
    for file in sorted(IMAGERY.glob('vicinity_*.tif')):
        sha = digest(file)
        if sha != expected[file.name]:
            raise ValueError('Original raster hash mismatch: ' + str(file))
        with rasterio.open(file) as src:
            rasters.append(dict(path=str(file), sha256=sha, crs=str(src.crs),
                                resolution=list(src.res), shape=[src.height, src.width],
                                bands=src.count, bounds=list(src.bounds),
                                role='regional context; not individual building detection'))
    index = read_csv(INDEX)
    nearby = read_csv(IMAGERY/'nearby_streetview_candidates.csv')
    input_data = json.loads((ROOT.parent/'data/input.json').read_text(encoding='utf-8'))
    rentals = input_data['rows']
    communities = {r.get('小区名称', '').strip() for r in rentals} - {''}
    matched = []
    for row in index:
        if row['village_name'].strip() in communities:
            matched.append(row)
    # The exact-name matches are review candidates, not accepted coordinate joins.
    images = []
    for row in nearby:
        file = Path(row['source_path'])
        exists = file.is_file()
        sha = digest(file) if exists else None
        if exists and sha != row['image_sha256']:
            raise ValueError('Street image hash mismatch: ' + str(file))
        images.append(dict(row, exists=exists, verified_sha256=sha,
                           coordinate_status='source CRS unverified',
                           rent_join_status='pending exact residence and date verification'))
    out = dict(rasters=rasters, street_index=dict(path=str(INDEX), sha256=digest(INDEX),
               rows=len(index), distinct_villages=len({r['official_village_no'] for r in index})),
               pilot_images=images, rental_rows=len(rentals),
               exact_name_candidate_images=matched,
               matched_name_count=len({r['village_name'] for r in matched}),
               accepted_rental_environment_matches=0,
               model_scope='Conditional rental association after matched controls; causal effect not yet identified')
    (ROOT/'inventory.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    with (ROOT/'pilot_images.csv').open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(images[0])); w.writeheader(); w.writerows(images)
    print(json.dumps(dict(rasters=len(rasters), indexed_images=len(index),
                         pilot_images=len(images), readable_pilot_images=sum(x['exists'] for x in images),
                         exact_name_candidate_images=len(matched), matched_name_count=out['matched_name_count'],
                         rental_rows=len(rentals)), ensure_ascii=False))

if __name__ == '__main__':
    main()
