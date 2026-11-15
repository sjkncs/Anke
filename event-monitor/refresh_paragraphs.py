"""Reparse already archived official articles; no network or synthetic text."""
import hashlib
import json
from monitor import ROOT, connect, parse, upsert, export

db = connect()
changed = 0
try:
    records = [json.loads(row[0]) for row in db.execute('SELECT data FROM events')]
    for record in records:
        archive = ROOT / 'data/articles' / (hashlib.sha256(record['url'].encode()).hexdigest()[:24] + '.html')
        if not archive.exists():
            continue
        event = parse(record['url'], archive.read_text(encoding='utf-8'))
        if event:
            changed += upsert(db, event) == 'updated'
    export(db)
    print(json.dumps({'reparsed': len(records), 'updated': changed}))
finally:
    db.close()
