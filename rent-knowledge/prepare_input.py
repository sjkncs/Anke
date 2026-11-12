"""Convert a local evidence CSV to UTF-8 JSON without changing source fields."""
import csv
import hashlib
import json
import pathlib
import sys

source = pathlib.Path(sys.argv[1]).resolve(strict=True)
target = pathlib.Path(sys.argv[2])
with source.open(encoding="utf-8-sig", newline="") as stream:
    rows = list(csv.DictReader(stream))
payload = {
    "sourceFile": str(source),
    "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "usage": "Local analysis; platform redistribution terms not verified",
    "rows": rows,
}
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
print(json.dumps({"rows": len(rows), "sha256": payload["sha256"]}))
