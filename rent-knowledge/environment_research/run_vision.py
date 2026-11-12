"""Real Shenzhen street-image YOLO detections and box-prompted MobileSAM masks."""
import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import time

os.environ['YOLO_AUTOINSTALL'] = 'false'
os.environ['ULTRALYTICS_SAFE_LOAD'] = 'true'
os.environ['YOLO_CONFIG_DIR'] = str(Path(__file__).resolve().parent/'runtime-settings')
import numpy as np
from PIL import Image, ImageDraw
import torch
from ultralytics import YOLO, SAM
from ultralytics import settings
settings.update({'sync': False, 'clearml': False, 'comet': False, 'dvc': False,
                 'mlflow': False, 'raytune': False, 'wandb': False})

ROOT = Path(__file__).resolve().parent
YOLO_PATH = Path('D:/js/rocket-rl-proposal/perception/model_artifacts/yolov8n.pt')
SAM_PATH = ROOT/'models/mobile_sam.pt'
MODEL_HASHES = {
    YOLO_PATH: 'f59b3d833e2ff32e194b5bb8e08d211dc7c5bdf144b90d2c8412c47ccfc83b36',
    SAM_PATH: '6dbb90523a35330fedd7f1d3dfc66f995213d81b29a5ca8108dbcdd4e37d6c2f',
}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main(limit):
    torch.set_num_threads(4)
    for path, expected in MODEL_HASHES.items():
        if sha(path) != expected:
            raise ValueError('Model hash mismatch: ' + str(path))
    # Validate SAM as a tensor-only checkpoint before the library deserializes it.
    checkpoint = torch.load(SAM_PATH, map_location='cpu', weights_only=True)
    if not isinstance(checkpoint, dict):
        raise ValueError('Expected a SAM state dictionary')
    del checkpoint
    detector, segmenter = YOLO(str(YOLO_PATH)), SAM(str(SAM_PATH))
    inventory = json.loads((ROOT/'inventory.json').read_text(encoding='utf-8'))
    candidates = inventory['pilot_images'] + inventory['exact_name_candidate_images']
    seen, samples = set(), []
    for row in candidates:
        if row['source_path'] not in seen:
            seen.add(row['source_path']); samples.append(row)
    out = ROOT/'vision-results'; out.mkdir(exist_ok=True)
    rows = []
    for sample in samples[:limit]:
        source = Path(sample['source_path'])
        if sha(source) != sample['image_sha256']:
            raise ValueError('Image hash mismatch')
        key = source.stem
        result_path = out/f'{key}.json'
        if result_path.is_file():
            existing = json.loads(result_path.read_text(encoding='utf-8'))
            if existing['image_sha256'] == sample['image_sha256']:
                rows.append(existing); continue
        start = time.monotonic()
        image = Image.open(source).convert('RGB')
        result = detector.predict(image, conf=0.35, imgsz=640, device='cpu', verbose=False)[0]
        boxes = result.boxes.xyxy.cpu().numpy()
        classes = result.boxes.cls.cpu().numpy().astype(int)
        confidences = result.boxes.conf.cpu().numpy()
        objects = [dict(category=result.names[int(cls)], confidence=float(c), box_xyxy=b.tolist())
                   for b, cls, c in zip(boxes, classes, confidences)]
        # A maximum of 16 boxes bounds CPU cost. Detections beyond this remain listed.
        selected = np.argsort(-confidences)[:16]
        selected_boxes = boxes[selected]
        overlay = image.copy(); draw = ImageDraw.Draw(overlay)
        masks = np.zeros((0, image.height, image.width), dtype='uint8')
        union = np.zeros((image.height, image.width), dtype=bool)
        if len(selected_boxes):
            sam = segmenter.predict(image, bboxes=selected_boxes.tolist(), imgsz=1024,
                                    device='cpu', verbose=False)[0]
            if sam.masks is not None:
                raw = sam.masks.data.cpu().numpy()
                masks = np.stack([np.asarray(Image.fromarray(m.astype('uint8')).resize(image.size,
                            Image.Resampling.NEAREST)) for m in raw])
                union = masks.any(axis=0)
                # Mask ordering follows the SAM box prompts.
                for idx, mask in zip(selected, masks):
                    objects[int(idx)]['sam_pixel_fraction'] = float(mask.mean())
        for obj in objects:
            draw.rectangle(obj['box_xyxy'], outline=(32, 111, 220), width=3)
            draw.text(tuple(obj['box_xyxy'][:2]), obj['category'], fill=(255, 70, 50))
        tint = np.asarray(overlay).copy()
        tint[union] = (0.55*tint[union]+0.45*np.array([35, 160, 235])).astype('uint8')
        Image.fromarray(tint).save(out/f'{key}_overlay.jpg')
        np.savez_compressed(out/f'{key}_masks.npz', masks=masks, detection_indices=selected[:len(masks)])
        value = dict(image=str(source), image_sha256=sample['image_sha256'],
                     village_name=sample['village_name'], district=sample.get('region'),
                     year=sample['selected_year'], direction=sample['direction'],
                     size=[image.width,image.height], objects=objects,
                     detected_counts=dict(Counter(x['category'] for x in objects)),
                     sam_union_pixel_fraction=float(union.mean()),
                     sam_prompt_count=len(selected_boxes), sam_mask_count=len(masks),
                     metric_scope='perspective image pixels; not land area, traffic flow or pollution',
                     human_validation='pending', rental_join='pending',
                     models={'yolo':'ultralytics 8.4.183 / yolov8n COCO',
                             'sam':'MobileSAM box-prompted; not SAM3 or SAM3D',
                             'sha256':{str(p):v for p,v in MODEL_HASHES.items()}},
                     seconds=round(time.monotonic()-start,2))
        result_path.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
        rows.append(value)
        print(json.dumps(dict(image=key,objects=len(objects),masks=len(masks),seconds=value['seconds'])),flush=True)
    summary = dict(processed_images=len(rows), available_images=len(samples),
                   objects=sum(len(r['objects']) for r in rows),
                   masks=sum(r['sam_mask_count'] for r in rows),
                   independent_accuracy='pending manual labels',
                   results=[str(out/f"{Path(r['image']).stem}.json") for r in rows])
    (out/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(summary,ensure_ascii=False))

if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--limit',type=int,default=8)
    args=parser.parse_args()
    if not 1 <= args.limit <= 100:
        raise ValueError('Limit must be between 1 and 100')
    main(args.limit)
