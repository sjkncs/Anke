"""Read-only official Shenzhen event watch; stdlib + Windows curl, no model key."""
import argparse
import hashlib
import json
import re
import sqlite3
import subprocess
import threading
import time
from datetime import date, datetime, timezone, timedelta
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parent
WAREHOUSE = ROOT.parent
PLUGIN = WAREHOUSE / 'apps/desktop/resources/plugins/anke.rents/data/events.json'
TZ = timezone(timedelta(hours=8))
FACTORS = {
    '交通施工': ['地铁', '轨道交通', '站改造', '道路施工', '调整交通组织', '道路改造'],
    '临时交通管制': ['交通管制', '临时限行', '临时交通管理', '封路', '封闭道路', '禁止通行'],
    '城市更新': ['城中村', '城市更新', '旧住宅', '老旧小区', '楼房改造', '房屋征收', '拆迁'],
    '住房供给': ['租赁住房', '公共租赁住房', '配租', '租金', '住宅用地', '住房供应'],
    '公共服务': ['学校', '医院', '公园', '养老', '公共文化', '体育设施'],
    '环境与市政': ['污水', '噪声', '污染', '停水', '停电', '积水', '绿化', '防洪'],
    '就业与产业': ['产业园', '企业搬迁', '就业', '总部基地'],
    '重大活动': ['APEC', '亚太经合', '大型活动', '演唱会', '赛事'],
    '住房政策': ['住房政策', '住房补贴', '租赁市场', '租赁合同', '租赁税', '租赁监管'],
    '极端天气': ['台风', '暴雨', '气象预警', '地质灾害'],
}
DISTRICTS = ['福田', '罗湖', '南山', '宝安', '龙岗', '盐田', '龙华', '坪山', '光明', '大鹏']


def now():
    return datetime.now(TZ).isoformat(timespec='seconds')


def canonical(url):
    u = urlsplit(url)
    if u.scheme != 'https' or not (u.hostname or '').endswith('.sz.gov.cn') or u.username or u.password or u.port:
        raise ValueError('Only HTTPS Shenzhen government sources are allowed')
    return urlunsplit((u.scheme, u.netloc, u.path, '', ''))


def fetch(url):
    # Schannel handles these government sites; Python OpenSSL returns BAD_ECPOINT.
    result = subprocess.run(['curl.exe', '--silent', '--show-error', '--fail', '--location',
                             '--proto', '=https', '--proto-redir', '=https', '--max-redirs', '3',
                             '--max-time', '20', '--max-filesize', '5000000', canonical(url)],
                            capture_output=True, timeout=25, check=True)
    data = result.stdout
    try:
        return data.decode('utf-8-sig')
    except UnicodeDecodeError:
        return data.decode('gb18030')


class Page(HTMLParser):
    def __init__(self, base):
        super().__init__(convert_charrefs=True)
        self.base, self.links, self.meta, self.body = base, {}, {}, []
        self.stack, self.capture, self.skip, self.link, self.label = [], None, 0, None, []
        self.title, self.in_title = '', False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'meta':
            self.meta[(a.get('name') or a.get('property') or '').lower()] = a.get('content', '')
        if tag == 'title': self.in_title = True
        if tag in ('script', 'style'): self.skip += 1
        if tag == 'a':
            self.link, self.label = a.get('href'), [a.get('title', '')]
        if tag in ('div', 'article', 'section'):
            self.stack.append(tag)
            ident = a.get('id', '') + ' ' + a.get('class', '')
            if self.capture is None and re.search(r'article-content|TRS_Editor|viewTRS|UCAP-CONTENT|article_con|news_cont_d_wrap|ContentRegion|\binfo_c\b|\bnews_con\b', ident, re.I):
                self.capture = len(self.stack)

    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
        if tag in ('script', 'style'): self.skip = max(0, self.skip - 1)
        if tag == 'a' and self.link:
            url = urljoin(self.base, self.link)
            if re.search(r'post_\d+\.html', url):
                try: self.links[canonical(url)] = ''.join(self.label).strip()
                except ValueError: pass
            self.link = None
        if tag in ('div', 'article', 'section') and self.stack:
            if self.capture == len(self.stack): self.capture = None
            self.stack.pop()

    def handle_data(self, data):
        if self.in_title: self.title += data
        if self.link and not self.skip: self.label.append(data)
        if self.capture is not None and not self.skip and data.strip(): self.body.append(data.strip())


def categories(text):
    return [category for category, keys in FACTORS.items() if any(k.lower() in text.lower() for k in keys)]


def parse(url, html):
    p = Page(url); p.feed(html)
    title = p.meta.get('articletitle') or p.title.split('-深圳政府在线')[0].strip()
    published = p.meta.get('pubdate') or p.meta.get('publishdate') or ''
    if not title or not p.body:
        raise ValueError('Article title/body missing; source structure needs review')
    body = '\n'.join(p.body)
    cats = categories(title)
    if not cats: return None
    sentences = re.split(r'(?<=[。；\n])', body)
    evidence = [s.strip() for s in sentences if categories(s) or re.search(r'\d{1,2}月\d{1,2}日', s)]
    # Explicit full-year date ranges only; publication date is never an effect date.
    ranges = re.findall(r'(20\d{2})年(\d{1,2})月(\d{1,2})日\s*(?:起)?\s*[至到—－-]\s*(?:(20\d{2})年)?(?:(\d{1,2})月)?(\d{1,2})日', body)
    start, end = None, None
    if ranges:
        y, m, d, ey, em, ed = ranges[0]
        try:
            start = date(int(y), int(m), int(d)).isoformat()
            end = date(int(ey or y), int(em or m), int(ed)).isoformat()
            if end < start: start, end = None, None
        except ValueError: pass
    place_title = re.sub(r'^.*?关于', '', title)
    places = sorted(set(re.findall(r'[\u4e00-\u9fffA-Za-z0-9]{2,18}(?:站|路|街道|城中村改造单元)', place_title)))
    phase = ('采购' if re.search(r'采购|招标|中标', title) else
             '规划公示' if re.search(r'规划|许可证|用地|公示', title) else
             '交通措施' if re.search(r'交通组织|管制|限行', title) else '公告')
    # Event date and scope are source facts; rent direction is a research hypothesis.
    return {'title': title, 'url': canonical(url), 'publishedAt': published,
            'categories': cats, 'districts': [d for d in DISTRICTS if d in body or d in title],
            'places': places, 'phase': phase, 'effectiveStart': start, 'effectiveEnd': end,
            'evidence': evidence[:8], 'body': body, 'geometry': None,
            'spatialStatus': 'named_area_only', 'rentEffect': None,
            'contentHash': hashlib.sha256(body.encode()).hexdigest()}


def lifecycle(event, today=None):
    today = today or date.today().isoformat()
    if event['effectiveEnd'] and event['effectiveEnd'] < today: return 'expired'
    if event['effectiveStart'] and event['effectiveStart'] > today: return 'upcoming'
    if event['effectiveStart']: return 'active'
    return 'date_unconfirmed'


def connect(path=None):
    path = Path(path or ROOT / 'data/events.sqlite3'); path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.executescript('''
      CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY, fingerprint TEXT UNIQUE, data TEXT NOT NULL,
        version INTEGER NOT NULL, first_seen TEXT NOT NULL, last_seen TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS revisions(event_id TEXT, version INTEGER, observed_at TEXT, data TEXT,
        PRIMARY KEY(event_id,version));
      CREATE TABLE IF NOT EXISTS sources(id TEXT PRIMARY KEY, data TEXT NOT NULL);
    ''')
    return db


def upsert(db, event):
    # Republished identical titles/dates share an event, even across departments.
    fp = hashlib.sha256((re.sub(r'\s+', '', event['title']) + event['publishedAt'][:10]).encode()).hexdigest()
    old = db.execute('SELECT id,data,version,first_seen FROM events WHERE fingerprint=?', (fp,)).fetchone()
    stamp = now(); version = (old[2] if old else 0)
    old_data = json.loads(old[1]) if old else None
    # Parser improvements also need a new revision, even if source text is stable.
    keys = ['contentHash','places','categories','districts','phase','effectiveStart','effectiveEnd']
    if old and all(old_data.get(k)==event.get(k) for k in keys):
        db.execute('UPDATE events SET last_seen=? WHERE id=?', (stamp, old[0])); db.commit(); return 'unchanged'
    event = dict(event, id=old[0] if old else fp[:24], version=version + 1,
                 firstSeen=old[3] if old else stamp, changedAt=stamp)
    encoded = json.dumps(event, ensure_ascii=False)
    db.execute('INSERT OR REPLACE INTO events VALUES(?,?,?,?,?,?)',
               (event['id'], fp, encoded, version+1, event['firstSeen'], stamp))
    db.execute('INSERT INTO revisions VALUES(?,?,?,?)', (event['id'], version+1, stamp, encoded))
    db.commit(); return 'updated' if old else 'new'


def atomic_json(path, data):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp'); temp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    for attempt in range(5):
        try: temp.replace(path); return
        except PermissionError:
            if attempt == 4: raise
            time.sleep(.05)


def snapshot(db):
    events = []
    for encoded, in db.execute('SELECT data FROM events ORDER BY last_seen DESC'):
        e = json.loads(encoded); e['status'] = lifecycle(e); events.append(e)
    events.sort(key=lambda e: e['changedAt'], reverse=True)
    return {'schemaVersion': 1, 'generatedAt': now(), 'pollSeconds': 600,
            'events': events, 'sources': [json.loads(r[0]) for r in db.execute('SELECT data FROM sources')],
            'counts': {'events': len(events), 'located': sum(e['geometry'] is not None for e in events)},
            'coverage': 'registered_official_sources', 'rentImpactEstimated': False}


def export(db):
    data = snapshot(db); atomic_json(ROOT / 'data/events.json', data); atomic_json(PLUGIN, data)
    return data


def collect(db, config, limit=8):
    articles = dict.fromkeys(config['seedArticles'], '')
    stats = {'new': 0, 'updated': 0, 'unchanged': 0, 'errors': []}
    for src in config['sources']:
        state = dict(src, checkedAt=now(), status='ok', discovered=0)
        try:
            html = fetch(src['url']); p = Page(src['url']); p.feed(html)
            if not p.links: raise ValueError('No article links; not a valid feed')
            candidates = [(u, t) for u, t in p.links.items() if categories(t)]
            state['discovered'] = len(candidates)
            for u, title in candidates[:limit]: articles[u] = title
        except Exception as exc:
            state.update(status='error', error=type(exc).__name__); stats['errors'].append(src['id'])
        db.execute('INSERT OR REPLACE INTO sources VALUES(?,?)', (src['id'], json.dumps(state, ensure_ascii=False)))
        db.commit()
    archive = ROOT / 'data/articles'; archive.mkdir(parents=True, exist_ok=True)
    for url in articles:
        try:
            html = fetch(url); event = parse(url, html)
            if event:
                stats[upsert(db, event)] += 1
                # Preserve original downloaded source for later audit, never execute it.
                (archive / (hashlib.sha256(url.encode()).hexdigest()[:24]+'.html')).write_text(html, encoding='utf-8')
        except Exception as exc:
            stats['errors'].append({'url': url, 'error': type(exc).__name__})
        time.sleep(.4)
    atomic_json(ROOT / 'data/last_run.json', dict(stats, completedAt=now()))
    export(db)
    try:
        subprocess.run(['node', str(WAREHOUSE / 'rent-knowledge/import-events.mjs')],
                       capture_output=True, timeout=60, check=True, cwd=str(WAREHOUSE / 'rent-knowledge'))
        stats['knowledgeSync'] = 'ok'
    except Exception as exc:
        stats['knowledgeSync'] = 'error'
        stats['errors'].append({'component':'postgresql', 'error':type(exc).__name__})
    atomic_json(ROOT / 'data/last_run.json', dict(stats, completedAt=now()))
    return stats


def serve(config):
    # A fixed loopback-only read endpoint also acts as the single-instance lock.
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path not in ('/health', '/events'):
                self.send_error(404); return
            try:
                result = (ROOT / 'data/events.json').read_bytes() if self.path == '/events' else b'{"service":"anke-events","ok":true}'
                self.send_response(200); self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Cache-Control', 'no-store'); self.end_headers(); self.wfile.write(result)
            except FileNotFoundError: self.send_error(503)
        def log_message(self, *args): pass
    try: server = ThreadingHTTPServer(('127.0.0.1', 18743), Handler)
    except OSError: return  # Existing process owns the port; never kill it.
    def loop():
        db = connect()
        while True:
            try: collect(db, config)
            except Exception as exc:
                atomic_json(ROOT / 'data/service_error.json', {'at': now(), 'error': type(exc).__name__})
            time.sleep(max(300, config['intervalSeconds']))
    threading.Thread(target=loop, daemon=True).start()
    server.serve_forever()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--serve', action='store_true')
    parser.add_argument('--limit', type=int, default=8); args = parser.parse_args()
    config = json.loads((ROOT / 'sources.json').read_text(encoding='utf-8'))
    if args.serve: serve(config)
    else:
        result = collect(connect(), config, max(1, min(30, args.limit)))
        print(json.dumps(result, ensure_ascii=False))
        if result['errors']: raise SystemExit(2)
