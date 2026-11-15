"""Offline evaluation adapter for pinned SegFormer ONNX weights. JSON on stdin/stdout."""
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import sys

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

MODEL_SHA = '3e5c18a4be395f16646438d54c42377ddc202edfa33d5eced0c9506de75c44c2'
REVISION = 'd3e5499fa8701ff0453ca940a8dfeae39b2f1504'
LABELS = {'wall': '墙面', 'building': '建筑', 'house': '住宅',
          'windowpane': '窗户', 'door': '门', 'road': '道路', 'sidewalk': '人行道',
          'tree': '树木', 'plant': '植物', 'grass': '草地', 'fence': '围栏',
          'pole': '杆件', 'car': '汽车', 'person': '行人', 'awning': '遮篷'}


def segment(image, model_dir):
    model_dir = Path(model_dir)
    model = model_dir / 'model.onnx'
    if hashlib.sha256(model.read_bytes()).hexdigest() != MODEL_SHA:
        raise ValueError('Segmentation model hash mismatch')
    config_bytes = (model_dir / 'config.json').read_bytes()
    if hashlib.sha256(config_bytes).hexdigest() != '435799652b2b64c3e422dea20fed4c59651dae9f0e291fd885e9e067fee0ce2a':
        raise ValueError('Segmentation configuration hash mismatch')
    config = json.loads(config_bytes)
    if image.width * image.height > 16000000:
        raise ValueError('Image exceeds 16 megapixels')
    image = ImageOps.exif_transpose(image).convert('RGB')
    rgb = np.asarray(image.resize((512, 512), Image.Resampling.BILINEAR), dtype=np.float32) / 255
    pixels = ((rgb - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225])
    pixels = pixels.transpose(2, 0, 1)[None].astype(np.float32)
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    session = ort.InferenceSession(str(model), sess_options=options, providers=['CPUExecutionProvider'])
    logits = session.run(None, {session.get_inputs()[0].name: pixels})[0][0]
    logits -= logits.max(axis=0, keepdims=True)
    probability = np.exp(logits)
    probability /= probability.sum(axis=0, keepdims=True)
    classes = probability.argmax(axis=0)
    height, width = classes.shape
    objects = []
    for class_id in np.unique(classes):
        label = config['id2label'][str(int(class_id))]
        if label not in LABELS:
            continue
        mask = (classes == class_id).astype('uint8')
        # External contours intentionally exclude holes; polygon coverage is approximate.
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for contour in contours:
            if cv2.contourArea(contour) < width * height * 0.002:
                continue
            contour = cv2.approxPolyDP(contour, 0.6, True)
            if len(contour) < 3:
                continue
            component = np.zeros_like(mask)
            cv2.drawContours(component, [contour], -1, 1, -1)
            selected = (component != 0) & (mask != 0)
            confidence = float(probability[int(class_id)][selected].mean())
            objects.append(dict(id=f'seg-{class_id}-{len(objects)}', label=LABELS[label],
                                confidence=round(confidence, 6), method='model', cues=[],
                                polygon=[[float(x)/(width-1), float(y)/(height-1)]
                                         for [[x, y]] in contour]))
    return dict(objects=objects[:500], model='Xenova/segformer-b0-finetuned-ade-512-512',
                revision=REVISION, sha256=MODEL_SHA, provider='CPUExecutionProvider',
                scope='semantic regions; not defect inference; external contours omit holes')


if __name__ == '__main__':
    try:
        request = json.loads(sys.stdin.buffer.read(8000001))
        encoded = request['image']
        if len(encoded) > 7000000 or not encoded.startswith(('data:image/jpeg;base64,', 'data:image/png;base64,', 'data:image/webp;base64,')):
            raise ValueError('Invalid image')
        data = base64.b64decode(encoded.split(',', 1)[1], validate=True)
        result = segment(Image.open(io.BytesIO(data)), os.environ['ANKE_SEGMENT_MODEL'])
        print(json.dumps(result, ensure_ascii=True))
    except Exception as error:
        print(json.dumps({'error': str(error)}))
        sys.exit(1)
