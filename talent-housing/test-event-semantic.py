"""Synthetic topic checks only; no claim of sentiment accuracy."""
import unittest
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('event_semantic', Path(__file__).with_name('event-semantic.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SemanticTests(unittest.TestCase):
    def test_synthetic_topics_and_finite_vectors(self):
        encoder = module.Encoder()
        texts = ['每月房租和停车费又涨了，家庭开支压力很大', '道路施工封闭后每天去学校上班绕路', '孩子申请小学学位需要哪些入学材料', '人才资格认定办理需要等待审核']
        results = module.rank(encoder, texts)
        expected = ['住房成本', '交通通勤', '子女教育', '资格审批']
        for text, topics, label in zip(texts, results, expected):
            self.assertEqual(topics[0]['topic'], label, (text, topics))
            self.assertTrue(all(-1 <= item['similarity'] <= 1 for item in topics))
        import numpy as np
        vectors = encoder.encode(['房租下调', '房租未下调'])
        self.assertTrue(np.isfinite(vectors).all())
        self.assertEqual(vectors.shape, (2, 384))
        self.assertFalse(np.allclose(vectors[0], vectors[1]))


if __name__ == '__main__':
    unittest.main()
