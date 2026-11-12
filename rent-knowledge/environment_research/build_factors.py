"""Build auditable environment features and rental match review candidates."""
from collections import defaultdict
import csv
import html
import hashlib
import importlib.metadata
import json
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image

ROOT = Path(__file__).resolve().parent

def write_csv(name, rows):
    if not rows:
        return
    with (ROOT/name).open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)

def main():
    inventory=json.loads((ROOT/'inventory.json').read_text(encoding='utf-8'))
    vision=json.loads((ROOT/'vision-results/summary.json').read_text(encoding='utf-8'))
    features=[]; groups=defaultdict(list); review=[]; cards=[]
    for path in vision['results']:
        r=json.loads(Path(path).read_text(encoding='utf-8'))
        key=Path(r['image']).stem
        archive=np.load(ROOT/f'vision-results/{key}_masks.npz')
        masks=archive['masks']; indices=archive['detection_indices']
        h,w=r['size'][1],r['size'][0]
        assert masks.shape==(r['sam_mask_count'],h,w)
        assert masks.shape[0]==len(indices) and set(np.unique(masks)).issubset({0,1})
        all_union=masks.any(axis=0) if len(masks) else np.zeros((h,w),bool)
        assert np.isclose(all_union.mean(),r['sam_union_pixel_fraction'])
        def fraction(categories):
            chosen=[m for m,i in zip(masks,indices) if r['objects'][int(i)]['category'] in categories]
            return float(np.logical_or.reduce(chosen).mean()) if chosen else 0.0
        vehicle={'car','truck','bus','motorcycle','bicycle'}
        row=dict(image_id=key,village=r['village_name'],district=r['district'],
                 image_year=int(r['year']),direction=r['direction'],image_sha256=r['image_sha256'],
                 vehicles_detected=sum(v for k,v in r['detected_counts'].items() if k in vehicle),
                 persons_detected=r['detected_counts'].get('person',0),
                 vehicle_visible_fraction=fraction(vehicle),person_visible_fraction=fraction({'person'}),
                 model_mask_count=len(masks),model_scope='YOLO COCO + MobileSAM; perspective pixels',
                 validation='pending',coordinate_crs='unknown')
        features.append(row);groups[(row['district'],row['village'],row['image_year'])].append(row)
        review.append(dict(image_id=key,image_path=r['image'],category_review='',mask_review='',
                           reviewer='',review_date='',notes=''))
        cards.append(f'<figure><img loading="lazy" src="vision-results/{key}_overlay.jpg"><figcaption>{html.escape(r["village_name"])} · {r["year"]} · {r["direction"]} · {len(r["objects"])} 个检测框</figcaption></figure>')
    write_csv('street_environment_factors.csv',features)
    review_path=ROOT/'manual_review.csv'
    if not review_path.exists():
        write_csv('manual_review.csv',review)
    aggregated=[]
    for (district,village,year),rows in groups.items():
        aggregated.append(dict(district=district,village=village,image_year=year,
                              directions=len({r['direction'] for r in rows}),
                              vehicle_visible_fraction=float(np.mean([r['vehicle_visible_fraction'] for r in rows])),
                              person_visible_fraction=float(np.mean([r['person_visible_fraction'] for r in rows]))))
    write_csv('village_environment_factors.csv',aggregated)
    rentals=json.loads((ROOT.parent/'data/input.json').read_text(encoding='utf-8'))['rows']
    by_name=defaultdict(list)
    for row in aggregated:
        by_name[row['village']].append(row)
    matches=[]
    for rent in rentals:
        for env in by_name.get(rent.get('小区名称','').strip(),[]):
            district=rent.get('区县','')
            if district.removesuffix('区')!=env['district'].removesuffix('区'):
                continue
            observed=rent['观测日期']
            gap=int(observed[:4])-env['image_year']
            matches.append(dict(observation_id=rent['统一观测ID'],community=rent['小区名称'],
                                district=district,observed_on=observed,image_year=env['image_year'],
                                year_gap=gap,rent_monthly=rent.get('月租金_元',''),
                                area_sqm=rent.get('面积_平方米',''),lease=rent.get('出租方式',''),
                                vehicle_visible_fraction=env['vehicle_visible_fraction'],
                                person_visible_fraction=env['person_visible_fraction'],
                                match_basis='exact original name and district only',
                                accepted=False,reason='residence identity, image date and coordinate CRS require verification'))
    write_csv('rental_match_candidates.csv',matches)
    (ROOT/'rental_match_candidates.json').write_text(json.dumps(matches,ensure_ascii=False,indent=2),encoding='utf-8')
    source=Path(inventory['rasters'][0]['path']).parent
    scl_arrays=[];valid=[];scl_records=[];profile=None
    for year in [2019,2022,2025]:
        with rasterio.open(source/f'vicinity_{year}.tif') as rgb, rasterio.open(source/f'delivery/SCL_{year}.tif') as scl:
            assert rgb.crs==scl.crs and rgb.transform==scl.transform and rgb.shape==scl.shape
            signature=(rgb.crs,rgb.transform,rgb.shape)
            if profile is not None:
                assert profile==signature
            profile=signature
            arr=scl.read(1);scl_arrays.append(arr)
            valid.append(np.isin(arr,[4,5,6]) & (rgb.dataset_mask()>0) & np.any(rgb.read()!=0,axis=0))
    common=np.logical_and.reduce(valid)
    if not common.any():
        raise ValueError('No shared clear area')
    for year,arr,mask in zip([2019,2022,2025],scl_arrays,valid):
        scl_records.append(dict(year=year,common_valid_pixels=int(common.sum()),
                                common_valid_fraction=float(common.mean()),
                                vegetation_scl4_fraction=float(np.mean(arr[common]==4)),
                                water_scl6_fraction=float(np.mean(arr[common]==6)),
                                method='Sentinel SCL broad classes; 20m source resampled to 10m; not SAM inference',
                                scope='Cuizhu station vicinity crop; not community or project boundary'))
    write_csv('regional_scl_context.csv',scl_records)
    summary=dict(images=len(features),village_year_groups=len(aggregated),
                 detected_objects=vision['objects'],sam_masks=vision['masks'],
                 rental_candidate_rows=len(matches),candidate_communities=sorted({m['community'] for m in matches}),
                 accepted_matches=0,rental_effect_estimated=False,
                 estimation_status='pending residence/CRS/date validation and sufficient independent communities',
                 original_rasters_verified=3,regional_context=scl_records,
                 unavailable_factors=['validated green view','sky view','building enclosure','metric 3D height','construction-specific detections'],
                 model_versions='ultralytics 8.4.183; torch 2.9.0+cpu; YOLOv8n COCO; MobileSAM',
                 sam3_status='source inspected; gated weights not available; CUDA runtime not installed',
                 sam3d_status='source inspected; upstream Linux + >=32GB VRAM requirement exceeds local Windows 8GB GPU')
    (ROOT/'factor_summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
    provenance=dict(access_date='2026-11-11',
        packages={k:importlib.metadata.version(k) for k in ['ultralytics','torch','rasterio','numpy','Pillow']},
        sources=[
            dict(url='https://github.com/facebookresearch/sam3',revision='f92a5efc4001ebfe9d050d43e61f6fb10e02d73c',license='SAM License'),
            dict(url='https://github.com/facebookresearch/sam-3d-objects',revision='f91db411c50efee93d8db7aeb323885650f6f722',license='SAM License'),
            dict(url='https://github.com/ultralytics/ultralytics/tree/v8.4.183',revision='cc2e0fd5451861c4098d94dba7cdeb56027a90d5',license='AGPL-3.0'),
            dict(url='https://github.com/ultralytics/assets/releases/download/v8.3.0/mobile_sam.pt',sha256='6dbb90523a35330fedd7f1d3dfc66f995213d81b29a5ca8108dbcdd4e37d6c2f')],
        archived_evidence=[dict(path=str(p),sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in sorted((ROOT/'source-evidence').glob('*'))])
    (ROOT/'provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2),encoding='utf-8')
    page='<!doctype html><meta charset="utf-8"><title>深圳街景环境识别</title><style>body{font:15px Microsoft YaHei;background:#f5f5f5;color:#222;margin:28px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}figure{margin:0;background:white;padding:12px}img{width:100%}figcaption{padding-top:8px}</style>'
    page+=f'<h1>深圳街景环境识别</h1><p>{len(features)} 张街景 · {vision["objects"]} 个检测目标 · {vision["masks"]} 个分割掩膜</p><main>'+''.join(cards)+'</main>'
    (ROOT/'深圳街景环境识别.html').write_text(page,encoding='utf-8')
    print(json.dumps(summary,ensure_ascii=False,indent=2))

if __name__=='__main__':
    main()
