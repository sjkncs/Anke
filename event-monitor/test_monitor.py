import copy
import tempfile
import unittest
from pathlib import Path
from monitor import Page, canonical, connect, lifecycle, parse, snapshot, upsert


def article(body, title='关于地铁坪洲站施工期间调整交通组织的通告'):
    return f'<meta name="ArticleTitle" content="{title}"><meta name="PubDate" content="2026-11-01"><div class="article-content"><p>{body}</p></div>'


class MonitorTest(unittest.TestCase):
    def test_dates_scope_and_no_invented_coordinates(self):
        e = parse('https://www.sz.gov.cn/content/post_123.html', article('宝安区2026年11月17日至11月20日，非本市载客汽车限行。'))
        self.assertEqual((e['effectiveStart'], e['effectiveEnd']), ('2026-11-17','2026-11-20'))
        self.assertEqual(lifecycle(e, '2026-11-18'), 'active')
        self.assertEqual(lifecycle(e, '2026-11-21'), 'expired')
        self.assertIsNone(e['geometry']); self.assertIsNone(e['rentEffect'])
        self.assertIn('非本市载客汽车限行', e['body'])

    def test_publication_is_not_effective_date(self):
        e = parse('https://www.sz.gov.cn/content/post_123.html', article('罗湖区规划公示。'))
        self.assertEqual(lifecycle(e), 'date_unconfirmed')
        self.assertIsNone(e['effectiveStart'])

    def test_idempotent_revisions_and_cross_site_republication(self):
        with tempfile.TemporaryDirectory() as temp:
            db = connect(Path(temp)/'test.sqlite')
            a = parse('https://www.sz.gov.cn/content/post_123.html', article('宝安区道路施工。'))
            self.assertEqual(upsert(db,a),'new'); self.assertEqual(upsert(db,a),'unchanged')
            b = dict(a, url='https://szjj.sz.gov.cn/content/post_456.html')
            self.assertEqual(upsert(db,b),'unchanged')
            c = parse(a['url'],article('宝安区道路施工，延长至年底。'))
            self.assertEqual(upsert(db,c),'updated')
            self.assertEqual(snapshot(db)['events'][0]['version'],2)
            self.assertEqual(db.execute('SELECT count(*) FROM revisions').fetchone()[0],2)
            db.close()

    def test_reject_untrusted_and_missing_body(self):
        for url in ['https://www.sz.gov.cn.evil.com/a','file:///x','http://www.sz.gov.cn/a']:
            with self.assertRaises(ValueError): canonical(url)
        with self.assertRaises(ValueError): parse('https://www.sz.gov.cn/a','<title>新闻</title>')

    def test_nested_body_and_script_exclusion(self):
        p = Page('https://www.sz.gov.cn/'); p.feed('<div class="article-content"><div>正文</div><script>evil()</script><p>后文</p></div><p>页脚</p>')
        self.assertEqual(p.body,['正文','后文'])


if __name__ == '__main__': unittest.main()
