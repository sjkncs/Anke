import unittest
from unittest.mock import patch
import tempfile
from pathlib import Path
import monitor
import tencent_news


class NewsTests(unittest.TestCase):
    def article(self, url='https://view.inews.qq.com/a/example'):
        return {'title': '深圳南山住房租金', 'abstract': '新闻摘要仅供原文核验。',
                'timestamp': '2026-11-12 10:00:00', 'source': '测试媒体', 'url': url}

    def test_source_provenance_and_no_rent_inference(self):
        event = tencent_news.normalize(self.article())
        self.assertEqual(event['sourceKind'], 'media')
        self.assertEqual(event['districts'], ['南山'])
        self.assertIsNone(event['rentEffect'])
        self.assertIsNone(event['geometry'])

    def test_host_and_scheme_rejected(self):
        for url in ['http://view.inews.qq.com/a/x', 'https://view.inews.qq.com.evil.test/a',
                    'https://user@view.inews.qq.com/a', 'https://example.com/a']:
            with self.assertRaises(ValueError): tencent_news.normalize(self.article(url))

    def test_collection_versions_and_error_state(self):
        with tempfile.TemporaryDirectory() as folder:
            db = monitor.connect(Path(folder)/'events.db')
            try:
                with patch.object(tencent_news, 'credential', return_value='fixture'), patch.object(tencent_news, 'search', return_value=[self.article()]):
                    self.assertEqual(tencent_news.collect_news(db)['count'], 1)
                    tencent_news.collect_news(db)
                self.assertEqual(db.execute('SELECT COUNT(*) FROM revisions').fetchone()[0], 1)
                with patch.object(tencent_news, 'credential', return_value='fixture'), patch.object(tencent_news, 'search', side_effect=TimeoutError()):
                    self.assertEqual(tencent_news.collect_news(db)['status'], 'error')
                self.assertEqual(len(monitor.snapshot(db)['events']), 1)
            finally: db.close()


if __name__ == '__main__': unittest.main()
