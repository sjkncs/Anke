"""Bounded public-listing observation sync. No login or challenge bypass."""
import argparse
import hashlib
import json
import re
import subprocess
import time
from datetime import datetime, timezone, timedelta
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit

ROOT = Path(__file__).resolve().parent
PLUGIN = ROOT.parent / 'anke-agent-source/apps/desktop/resources/plugins/anke.rents/data'
TZ = timezone(timedelta(hours=8))
SOURCES = {
    'anjuke': ('安居客', 'https://sz.zu.anjuke.com/'),
    'lianjia': ('链家', 'https://sz.lianjia.com/zufang/'),
    'beike': ('贝壳', 'https://sz.zu.ke.com/zufang/'),
}


class Node:
    def __init__(self, tag='', attrs=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), []

    def text(self):
        return ' '.join(c.text() if isinstance(c, Node) else c for c in self.children)

    def find(self, predicate):
        found = []
        for c in self.children:
            if isinstance(c, Node):
                if predicate(c):
                    found.append(c)
                found.extend(c.find(predicate))
        return found

    def classes(self, name):
        return self.find(lambda n: name in n.attrs.get('class', '').split())


class Tree(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs)
        self.stack[-1].children.append(n)
        if tag not in {'img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'wbr', 'area', 'base', 'embed', 'param', 'track', 'col'}:
            self.stack.append(n)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def parse(html, source, observed_at):
    platform, base = SOURCES[source]
    tree = Tree(html).root
    cards = tree.classes('zu-itemmod' if source == 'anjuke' else 'content__list--item')
    rows = []
    for card in cards:
        text = card.text()
        links = card.find(lambda n: n.tag == 'a' and n.attrs.get('href'))
        pattern = r'/fangyuan/(\d+)' if source == 'anjuke' else r'/zufang/(SZ\d+)\.html'
        listing = next((n for n in links if re.search(pattern, n.attrs['href'])), None)
        area = re.search(r'(\d+(?:\.\d+)?)\s*(?:平米|平方米|㎡)', text)
        prices = card.classes('zu-side' if source == 'anjuke' else 'content__list--item-price')
        price_text = prices[0].text() if prices else text
        rent = re.search(r'(\d+(?:\.\d+)?)\s*元\s*/?\s*月', price_text)
        if not listing or not area or not rent:
            continue
        url = urljoin(base, listing.attrs['href'])
        parsed_url = urlsplit(url)
        if parsed_url.hostname != urlsplit(base).hostname or parsed_url.scheme != 'https' or parsed_url.username or parsed_url.port:
            continue
        if not (0 < float(area[1]) < 2000 and 0 < float(rent[1]) < 1000000):
            continue
        identity = re.search(pattern, parsed_url.path)[1]
        communities = [n for n in links if re.search(r'/(?:community/view/\d+|zufang/c\d+/)', n.attrs['href'])]
        district = re.search(r'(南山|福田|罗湖|盐田|宝安|龙华|龙岗|坪山|光明|大鹏新区)\s*(?:区)?\s*[-－]', text)
        title_links = card.classes('content__list--item--title')
        title = listing.attrs.get('title') or listing.text().strip() or (title_links[0].text().strip() if title_links else '')
        lease = '合租' if '合租' in text else '整租' if '整租' in text else '未知'
        # A revision is identified by source listing + local observation date + content.
        description = card.classes('content__list--item--des') or card.classes('details-item')
        summary = description[0].text() if description else text
        def capture(pattern, value=summary):
            match = re.search(pattern, value)
            return match[0].strip() if match else ''
        address_nodes = card.classes('details-item') if source == 'anjuke' else card.classes('content__list--item--des')
        address_text = ''
        if address_nodes:
            location_links = address_nodes[0].find(lambda n: n.tag == 'a' and n.text().strip())
            address_text = ' '.join(n.text().strip() for n in location_links)
        images = card.find(lambda n: n.tag == 'img')
        tags = card.classes('content__list--item--bottom') or card.classes('bot-tag')
        content = {'标题': title, '小区名称': communities[0].text().strip() if communities else '',
                   '区县': district[1] if district else '', '月租金_元': rent[1],
                   '面积_平方米': area[1], '出租方式': lease,
                   '详细地址': capture(r'[^|，。]{0,45}(?:路|街|巷|大道)\s*\d+号', text),
                   '位置描述': address_text,
                   '户型': capture(r'\d+\s*室(?:\s*\d+\s*厅)?(?:\s*\d+\s*卫)?', text),
                   '楼层': capture(r'(?:高|中|低)楼层(?:\s*\(?共?\d+层\)?)?|\d+\s*/\s*\d+层|\d+层'),
                   '朝向': capture(r'东南|西南|东北|西北|南北|东西|朝[东南西北]|(?:^|[/|\s])[东南西北](?=[/|\s]|$)').strip(' /|'),
                   '装修': capture(r'精装|简装|毛坯|豪装', text),
                   '标签': ' · '.join(n.text().strip() for n in tags),
                   '图片URL': urljoin(base, images[0].attrs.get('data-src') or images[0].attrs.get('src') or '') if images else '',
                   '列表描述': summary.strip()}
        revision = hashlib.sha256(json.dumps(content, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:16]
        day = observed_at[:10]
        rows.append({**content, '统一观测ID': f'{source}:{identity}:{day}:{revision}',
                     '平台': platform, '房源ID': identity, '房源URL': url,
                     '小区URL': urljoin(base, communities[0].attrs['href']) if communities else '',
                     '观测日期': day, '观测日期口径': '本机公开列表采集日期，非首次挂牌或成交日期',
                     '采集时间': observed_at, '数据性质': '当前挂牌，非成交',
                     '物业费计收方式': '未知', '面积口径': '平台列表展示面积，待核验',
                     '缺失说明': '空白为列表未披露；未核验产权、物业费及跨平台同房身份；未采集经纪人联系方式'})
    return list({r['统一观测ID']: r for r in rows}.values())


def atomic(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
    temp.replace(path)


def fetch(url):
    # Do not follow redirects to login/challenge hosts or send account cookies.
    result = subprocess.run(['curl.exe', '--silent', '--show-error', '--compressed',
                             '--max-time', '25', '--max-redirs', '0', '--max-filesize', '8000000',
                             '--write-out', '\nANKE_HTTP:%{http_code}', url], capture_output=True)
    body, _, status = result.stdout.rpartition(b'\nANKE_HTTP:')
    if result.returncode:
        raise RuntimeError('transport_error_' + str(result.returncode))
    return body, int(status)


def run_cycle(directory=ROOT / 'data/listing-sync', sources=None, resume=None, fetcher=fetch, importer=None):
    directory.mkdir(parents=True, exist_ok=True)
    state_path = directory / 'status.json'
    state = json.loads(state_path.read_text(encoding='utf-8')) if state_path.exists() else {'schemaVersion': 1, 'sources': {}}
    now = datetime.now(TZ).isoformat()
    state.update(checkedAt=now, intervalSeconds=3600, scope='Each source public Shenzhen rental first page only; not citywide coverage or a streaming feed')
    failures = False
    for source in sources or SOURCES:
        platform, url = SOURCES[source]
        prior = state['sources'].get(source, {})
        if prior.get('paused') and resume != source:
            failures = True
            continue
        if resume != source and prior.get('attemptedAt') and (datetime.fromisoformat(now) - datetime.fromisoformat(prior['attemptedAt'])).total_seconds() < 3600:
            failures = failures or prior.get('status') != 'synced'
            continue
        info = {**prior, 'platform': platform, 'url': url, 'attemptedAt': now, 'paused': False}
        try:
            body, code = fetcher(url)
            html = body.decode('utf-8', errors='replace')
            title = re.search(r'<title[^>]*>(.*?)</title>', html, re.S | re.I)
            challenge = code in (301, 302, 303, 307, 308, 401, 403, 429) or any(v in (title[1] if title else '') for v in ['验证', '登录', '访问受限']) or any(v in html for v in ['@@xxzlGatewayUrl', 'hip.ke.com/forbidden', 'hip.lianjia.com/forbidden', '请拖动滑块', '访问过于频繁'])
            if challenge:
                info.update(status='verification_required', paused=True, httpStatus=code)
                failures = True
            elif code != 200:
                info.update(status='http_error', httpStatus=code)
                failures = True
            else:
                rows = parse(html, source, now)
                if not rows:
                    info.update(status='no_valid_listings', paused=True, httpStatus=code)
                    failures = True
                else:
                    digest = hashlib.sha256(body).hexdigest()
                    # Keep extracted housing evidence, not full pages containing personal contact data.
                    envelope = {'sourceFile': url, 'sha256': digest, 'usage': 'Local research only; platform redistribution terms unverified', 'rows': rows}
                    batch = directory / 'batches' / f'{source}-{now[:10]}-{hashlib.sha256(json.dumps(rows,ensure_ascii=False).encode()).hexdigest()[:16]}.json'
                    atomic(batch, envelope)
                    if importer:
                        importer(batch)
                    else:
                        subprocess.run(['node', str(ROOT / 'sync-import.mjs'), str(batch)], check=True, capture_output=True)
                    info.update(status='synced', httpStatus=code, lastSuccessAt=now, observations=len(rows), batch=str(batch), evidenceSha256=digest)
        except Exception as error:
            info.update(status='sync_error', errorType=type(error).__name__)
            failures = True
        state['sources'][source] = info
        atomic(state_path, state)
    atomic(state_path, state)
    return state, failures


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--serve', action='store_true')
    parser.add_argument('--source', choices=list(SOURCES))
    parser.add_argument('--resume', choices=list(SOURCES))
    args = parser.parse_args()
    # Prevent two launchers from writing the same checkpoints/DB at once.
    import socket
    lock = socket.socket()
    try:
        lock.bind(('127.0.0.1', 18744))
    except OSError:
        print(json.dumps({'status': 'already_running'}))
        return
    while True:
        state, failures = run_cycle(sources=[args.source] if args.source else None, resume=args.resume)
        atomic(PLUGIN / 'sync-status.json', state)
        print(json.dumps({k: v.get('status') for k, v in state['sources'].items()}, ensure_ascii=False), flush=True)
        if not args.serve:
            raise SystemExit(1 if failures else 0)
        args.resume = None
        time.sleep(3600)


if __name__ == '__main__':
    main()
