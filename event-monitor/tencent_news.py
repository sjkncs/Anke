"""Bounded read-only Tencent News search; credentials stay outside the project."""
import hashlib
import json
import os
import subprocess
import uuid
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ENDPOINT = 'https://openapi.inews.qq.com/api/v1/agent/search'


def credential():
    if os.environ.get('TENCENT_NEWS_API_KEY'):
        return os.environ['TENCENT_NEWS_API_KEY']
    vault = Path(os.environ.get('LOCALAPPDATA', '.')) / 'AnkeAgent/secrets/tencent-news.dpapi'
    if not vault.is_file():
        return None
    # Windows user-scoped DPAPI; never store a plaintext key in source or snapshots.
    child_env = {k: v for k, v in os.environ.items() if k.upper() != 'PSMODULEPATH'}
    result = subprocess.run(['powershell', '-NoProfile', '-NonInteractive', '-Command',
        '$ErrorActionPreference="Stop"; $raw=(Get-Content -LiteralPath $env:ANKE_NEWS_VAULT -Raw).Trim(); $s=ConvertTo-SecureString $raw; '
        '$c=[System.Net.NetworkCredential]::new("",$s); [Console]::Write($c.Password)'],
        env={**child_env, 'ANKE_NEWS_VAULT': str(vault)}, capture_output=True, timeout=15)
    if result.returncode:
        raise RuntimeError('News credential unavailable')
    key = result.stdout.decode('utf-8').strip()
    if not key: raise RuntimeError('News credential unavailable')
    return key


def search(key, query='深圳 住房 租金', limit=5):
    payload = {'page': 1, 'page_size': max(1, min(10, limit)), 'is_show_content': 0,
               'query': {'query_id': str(uuid.uuid4()), 'search': query}, 'article_types': [0]}
    request = Request(ENDPOINT, data=json.dumps(payload, ensure_ascii=False).encode('utf-8'),
        headers={'Authorization': 'Bearer '+key, 'Content-Type': 'application/json',
                 'Accept': 'application/json', 'User-Agent': 'anke-news/0.1',
                 'Skill-Request-Id': str(uuid.uuid4()), 'Caller-Skill': 'anke_tencent-news_0.1'})
    with urlopen(request, timeout=25) as response:
        data = json.load(response)
    if data.get('base_rsp', {}).get('code') not in (0, '0'):
        raise RuntimeError('News provider rejected request')
    if not isinstance(data.get('news_list'), list):
        raise ValueError('Invalid news response')
    return data['news_list'][:limit]


def normalize(item):
    from monitor import categories, DISTRICTS
    url = item.get('url', '')
    u = urlsplit(url)
    if u.scheme != 'https' or u.hostname not in ('view.inews.qq.com', 'news.qq.com', 'new.qq.com') or u.username or u.password or u.port:
        raise ValueError('Invalid news article URL')
    title = str(item.get('title', '')).strip()
    abstract = str(item.get('abstract', '')).strip()
    published = str(item.get('timestamp', '')).strip()
    if not title or not abstract or not published:
        raise ValueError('Incomplete news article')
    body = title+'\n'+abstract
    return {'title': title, 'url': url, 'publishedAt': published,
            'publisher': str(item.get('source', '腾讯新闻')), 'sourceKind': 'media',
            'categories': categories(body), 'districts': [d for d in DISTRICTS if d in body],
            'places': [], 'phase': '媒体报道', 'effectiveStart': None, 'effectiveEnd': None,
            'evidence': [abstract], 'body': body, 'geometry': None,
            'spatialStatus': 'unlocated', 'rentEffect': None,
            'contentHash': hashlib.sha256(body.encode()).hexdigest()}


def collect_news(db):
    from monitor import now, upsert
    key = credential()
    if not key:
        return {'status': 'not_configured', 'count': 0}
    state = {'id': 'tencent-news', 'name': '腾讯新闻', 'url': ENDPOINT,
             'kind': 'media_search', 'checkedAt': now(), 'status': 'ok', 'discovered': 0}
    try:
        for item in search(key):
            upsert(db, normalize(item))
            state['discovered'] += 1
    except Exception as exc:
        state.update(status='error', error=type(exc).__name__)
    db.execute('INSERT OR REPLACE INTO sources VALUES(?,?)',
               (state['id'], json.dumps(state, ensure_ascii=False)))
    db.commit()
    return {'status': state['status'], 'count': state['discovered']}
