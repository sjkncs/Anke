"""Offline sentence embeddings; topic similarity is not sentiment or causality."""
import hashlib
import json
import os
from pathlib import Path
import time

os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer

ROOT = Path(__file__).resolve().parent
REVISION = 'e8f8c211226b894fcb81acc59f3b34ba3efd5f42'
TOPICS = {
    '住房成本': ['租房每月房租、物业费、停车费和住房补贴影响家庭住房支出。', '住宅租赁价格上涨下降，租客支付房屋租金。'],
    '交通通勤': ['道路施工封闭、交通限行管制影响出行和上下班通勤。', '地铁公交开通，去学校上班的路程和时间。'],
    '子女教育': ['子女入学资格、学位申请和学校招生政策。', '周边小学中学的教育资源和孩子上学。'],
    '医疗养老': ['医院医疗服务、老人照护和社区养老设施。'],
    '环境品质': ['住宅噪声污染、清洁卫生、绿化公园和生活环境。'],
    '房源供应': ['人才住房公租房新增供应、房源配租和申请分配。'],
    '资格审批': ['人才资格审核、优才卡申请和住房审批办理时间。'],
    '入住服务': ['房屋装修家具家电、拎包入住、物业维修和交付。'],
    '其他资讯': ['大型会议活动、经济金融新闻及一般行政公告。'],
}


class Encoder:
    def __init__(self):
        folder = ROOT / 'models/minilm-multilingual'
        self.tokenizer = Tokenizer.from_file(str(folder / 'tokenizer.json'))
        self.tokenizer.enable_truncation(max_length=128)
        self.tokenizer.enable_padding()
        options = ort.SessionOptions()
        options.intra_op_num_threads = 2
        options.inter_op_num_threads = 1
        self.session = ort.InferenceSession(str(folder / 'model_quint8_avx2.onnx'), options, providers=['CPUExecutionProvider'])
        self.names = {i.name for i in self.session.get_inputs()}

    def encode(self, texts):
        tokens = self.tokenizer.encode_batch(texts)
        inputs = {
            'input_ids': np.array([t.ids for t in tokens], dtype=np.int64),
            'attention_mask': np.array([t.attention_mask for t in tokens], dtype=np.int64),
            'token_type_ids': np.array([t.type_ids for t in tokens], dtype=np.int64),
        }
        outputs = self.session.run(None, {k: v for k, v in inputs.items() if k in self.names})[0]
        mask = inputs['attention_mask'][..., None]
        vectors = (outputs * mask).sum(axis=1) / np.maximum(mask.sum(axis=1), 1)
        return vectors / np.maximum(np.linalg.norm(vectors, axis=1, keepdims=True), 1e-12)


def rank(encoder, texts):
    labels = [label for label, examples in TOPICS.items() for _ in examples]
    anchors = encoder.encode([text for examples in TOPICS.values() for text in examples])
    vectors = encoder.encode(texts)
    result = []
    for scores in vectors @ anchors.T:
        aggregated = {label: max(float(score) for name, score in zip(labels, scores) if name == label) for label in TOPICS}
        result.append([{'topic': label, 'similarity': round(score, 4)} for label, score in sorted(aggregated.items(), key=lambda x: x[1], reverse=True)[:3]])
    return result


def build():
    started = time.perf_counter()
    source = ROOT.parent / 'event-monitor/data/events.json'
    snapshot = json.loads(source.read_text(encoding='utf-8'))
    encoder = Encoder()
    events = snapshot['events']
    # Keep title prominent and bound input; source excerpt may describe other cities.
    texts = [e['title'] + '。' + '；'.join(e.get('evidence', []))[:240] for e in events]
    rankings = []
    for offset in range(0, len(texts), 8):
        rankings.extend(rank(encoder, texts[offset:offset + 8]))
    records = [{'title': e['title'], 'excerpt': '；'.join(e.get('evidence', [])) or '未提供原文摘录', 'body': '\n\n'.join(e['paragraphs']) if e.get('paragraphs') else e.get('body', ''), 'url': e.get('url', ''), 'topics': topics} for e, topics in zip(events, rankings)]
    manifest = {
        'method': 'minilm-onnx-topic-v1', 'model': 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
        'revision': REVISION, 'license': 'Apache-2.0', 'snapshotGeneratedAt': snapshot['generatedAt'],
        'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'humanValidated': False,
        'cosineIsProbability': False, 'polarityModel': False, 'records': records,
        'elapsedSeconds': round(time.perf_counter() - started, 3),
    }
    target = ROOT / 'event-semantic-data.js'
    temp = target.with_suffix('.tmp')
    temp.write_text('window.ankeEventSemantics=' + json.dumps(manifest, ensure_ascii=False) + ';\n', encoding='utf-8')
    temp.replace(target)
    audit = ROOT / 'data/event-semantic-audit.json'
    audit.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'events': len(records), 'elapsedSeconds': manifest['elapsedSeconds'], 'revision': REVISION}))


if __name__ == '__main__':
    build()
