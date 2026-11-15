import json
import tempfile
import unittest
from pathlib import Path
from listing_sync import parse, run_cycle

HTML = '''<html><title>深圳租房</title><div class="zu-itemmod">
<h3><a href="https://sz.zu.anjuke.com/fangyuan/12345">整租测试住宅</a></h3>
<p>2室1厅 | 60平米</p><a href="https://shenzhen.anjuke.com/community/view/9">测试小区</a>
<span>南山-桃源</span><span>整租</span><div class="zu-side">6000 元/月</div></div></html>'''


class SyncTest(unittest.TestCase):
    def test_actual_parser_and_import_checkpoint_and_pause(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            batches = []
            def ingest(batch):
                batches.append(json.loads(batch.read_text(encoding='utf-8')))
            state, failed = run_cycle(root, ['anjuke'], fetcher=lambda _: (HTML.encode(), 200), importer=ingest)
            self.assertFalse(failed)
            self.assertEqual(state['sources']['anjuke']['status'], 'synced')
            self.assertEqual(batches[0]['rows'][0]['月租金_元'], '6000')
            self.assertEqual(batches[0]['rows'][0]['区县'], '南山')
            state, failed = run_cycle(root, ['anjuke'], resume='anjuke', fetcher=lambda _: (b'@@xxzlGatewayUrl', 200), importer=ingest)
            self.assertTrue(failed)
            self.assertTrue(state['sources']['anjuke']['paused'])
            self.assertIn('lastSuccessAt', state['sources']['anjuke'])
            state, failed = run_cycle(root, ['anjuke'], fetcher=lambda _: self.fail('Paused source retried'))
            self.assertEqual(len(batches), 1)

    def test_zero_results_and_redirects_never_import(self):
        for body, code in [(b'<html>no listings</html>', 200), (b'', 302)]:
            with tempfile.TemporaryDirectory() as folder:
                state, failed = run_cycle(Path(folder), ['beike'], fetcher=lambda _: (body, code), importer=lambda _: self.fail('Invalid import'))
                self.assertTrue(failed)
                self.assertTrue(state['sources']['beike']['paused'])

    def test_revision_and_missing_lease_and_wrong_host(self):
        first = parse(HTML, 'anjuke', '2026-11-12T10:00:00+08:00')[0]
        second = parse(HTML, 'anjuke', '2026-11-12T11:00:00+08:00')[0]
        self.assertEqual(first['统一观测ID'], second['统一观测ID'])
        changed = parse(HTML.replace('6000', '6100'), 'anjuke', '2026-11-12T11:00:00+08:00')[0]
        self.assertNotEqual(first['统一观测ID'], changed['统一观测ID'])
        self.assertEqual(parse(HTML.replace('sz.zu.anjuke.com/fangyuan', 'evil.example/fangyuan'), 'anjuke', '2026-11-12'), [])

    def test_ke_sources_and_hourly_checkpoint(self):
        html='''<div class="content__list--item"><p class="content__list--item--title"><a href="/zufang/SZ123.html">整租测试房源</a></p><p>宝安区-西乡 <a href="/zufang/c123/">测试小区</a> 50㎡ 整租</p><div class="content__list--item-price">3000元/月</div></div>'''
        for source in ['lianjia', 'beike']:
            row=parse(html,source,'2026-11-12T10:00:00+08:00')[0]
            self.assertEqual(row['出租方式'],'整租')
            self.assertEqual(row['小区名称'],'测试小区')
            self.assertEqual(row['区县'],'宝安')
        with tempfile.TemporaryDirectory() as folder:
            run_cycle(Path(folder), ['anjuke'], fetcher=lambda _: (HTML.encode(), 200), importer=lambda _: None)
            state, failed=run_cycle(Path(folder), ['anjuke'], fetcher=lambda _: self.fail('Hourly checkpoint ignored'))
            self.assertFalse(failed)

    def test_disclosed_attributes_survive_list_parser(self):
        html = HTML.replace('2室1厅 | 60平米', '2室1厅 | 60平米 | 中楼层(共20层) | 南北 | 精装 | 桃源路123号')
        row = parse(html, 'anjuke', '2026-11-13T10:00:00+08:00')[0]
        self.assertEqual(row['户型'], '2室1厅')
        self.assertEqual(row['楼层'], '中楼层(共20层)')
        self.assertEqual(row['装修'], '精装')
        self.assertEqual(row['朝向'], '南北')
        self.assertIn('桃源路123号', row['详细地址'])

    def test_import_failure_does_not_mark_success(self):
        with tempfile.TemporaryDirectory() as folder:
            def fail(_):
                raise RuntimeError('import failed')
            state, failed = run_cycle(Path(folder), ['anjuke'], fetcher=lambda _: (HTML.encode(), 200), importer=fail)
            self.assertTrue(failed)
            self.assertEqual(state['sources']['anjuke']['status'], 'sync_error')
            self.assertNotIn('lastSuccessAt', state['sources']['anjuke'])


if __name__ == '__main__':
    unittest.main()
