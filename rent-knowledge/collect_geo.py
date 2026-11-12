"""Bounded public imagery acquisition; never execute downloaded repository code."""
import argparse
import hashlib
import json
import pathlib
import sys
import urllib.parse
import urllib.request
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'geo-runtime'))


def request(url, payload=None):
    raw = json.dumps(payload).encode() if payload is not None else None
    headers = {'User-Agent': 'Anke-Residential-Environment/0.1', 'Accept': 'application/json'}
    if raw:
        headers['Content-Type'] = 'application/json'
    with urllib.request.urlopen(urllib.request.Request(url, data=raw, headers=headers), timeout=60) as response:
        return response.read()


def save_json(file, data):
    file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


def clip_asset(url, bbox, destination):
    import rasterio
    from rasterio.warp import transform_bounds
    from rasterio.windows import from_bounds, Window
    class RangeBridge(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def do_HEAD(self):
            self.forward('HEAD')

        def do_GET(self):
            self.forward('GET')

        def forward(self, method):
            if self.path != '/asset.tif':
                self.send_error(404)
                return
            headers={'User-Agent':'Anke-Residential-Environment/0.1'}
            if self.headers.get('Range'):
                headers['Range']=self.headers['Range']
            try:
                with urllib.request.urlopen(urllib.request.Request(url,headers=headers,method=method),timeout=60) as response:
                    self.send_response(response.status)
                    for name in ['Content-Length','Content-Type','Content-Range','Accept-Ranges']:
                        if response.headers.get(name):
                            self.send_header(name,response.headers[name])
                    self.end_headers()
                    if method=='GET':
                        while chunk:=response.read(65536):
                            self.wfile.write(chunk)
            except Exception:
                self.send_error(502)
    bridge=ThreadingHTTPServer(('127.0.0.1',0),RangeBridge)
    thread=threading.Thread(target=bridge.serve_forever,daemon=True)
    thread.start()
    try:
        return _clip_local(f'http://127.0.0.1:{bridge.server_port}/asset.tif',url,bbox,destination)
    finally:
        bridge.shutdown()
        bridge.server_close()
        thread.join(timeout=5)


def _clip_local(local_url, original_url, bbox, destination):
    import rasterio
    from rasterio.warp import transform_bounds
    from rasterio.windows import from_bounds, Window
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', GDAL_HTTP_TIMEOUT='60',
                      GDAL_HTTP_MAX_RETRY='2', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif'):
        with rasterio.open(local_url) as source:
            bounds = transform_bounds('EPSG:4326', source.crs, *bbox, densify_pts=21)
            requested = from_bounds(*bounds, source.transform).round_offsets().round_lengths()
            window = requested.intersection(Window(0, 0, source.width, source.height))
            if window.width * window.height > 4000000:
                raise ValueError('Requested crop exceeds four million pixels')
            pixels = source.read(window=window)
            profile = source.profile.copy()
            profile.update(driver='GTiff', width=int(window.width), height=int(window.height),
                           transform=source.window_transform(window), compress='deflate')
            with rasterio.open(destination, 'w', **profile) as output:
                output.write(pixels)
            return {'path':str(destination), 'crs':str(source.crs), 'resolutionMeters':list(source.res),
                    'width':int(window.width), 'height':int(window.height), 'bands':source.count,
                    'sha256':hashlib.sha256(destination.read_bytes()).hexdigest(), 'sourceUrl':original_url}


def collect(args):
    folder = ROOT / 'data' / 'geospatial' / args.name
    folder.mkdir(parents=True, exist_ok=True)
    bbox = args.bbox
    if not (112 < bbox[0] < bbox[2] < 116 and 21 < bbox[1] < bbox[3] < 24):
        raise ValueError('Bounding box is outside the Shenzhen collection scope')
    if bbox[2]-bbox[0] > 0.15 or bbox[3]-bbox[1] > 0.15:
        raise ValueError('Use a bounded crop at most 0.15 degrees on each side')
    report={'acquiredAt':datetime.now(timezone.utc).isoformat(), 'bboxWGS84':bbox,
            'scope':'regional acquisition pilot; not a verified residential project coordinate',
            'status':'collecting', 'files':[], 'errors':[], 'modelInference':'NOT_RUN'}
    sha='826718cac3781614ef5eccd9acf7d7b5dfd06089'
    evidence=folder/'source-evidence'
    evidence.mkdir(exist_ok=True)
    for filename in ['LICENSE','README.md','pyproject.toml','requirements.txt']:
        try:
            if (evidence/filename).exists():
                continue
            content=request(f'https://raw.githubusercontent.com/opengeos/segment-geospatial/{sha}/{filename}')
            (evidence/filename).write_bytes(content)
        except Exception as error:
            report['errors'].append({'stage':'upstream','file':filename,'error':str(error)})
    report['upstream']={'url':'https://github.com/opengeos/segment-geospatial', 'commit':sha,
                        'license':'MIT', 'execution':'source inspected and archived; not installed or executed',
                        'exactGeoSegSAMAuthorCode':'NOT_VERIFIED'}
    try:
        parameters={'collections':'sentinel-2-l2a','bbox':','.join(map(str,bbox)),
                    'datetime':'2025-01-01T00:00:00Z/2026-11-11T00:00:00Z','limit':100}
        url='https://earth-search.aws.element84.com/v1/search?'+urllib.parse.urlencode(parameters)
        catalog=json.loads(request(url))
        save_json(folder/'stac-search.json',catalog)
        candidates=[f for f in catalog['features'] if f['properties'].get('eo:cloud_cover',100)<=15]
        # Require one item to geometrically cover the entire requested crop.
        candidates=[f for f in candidates if f['bbox'][0]<=bbox[0] and f['bbox'][1]<=bbox[1]
                    and f['bbox'][2]>=bbox[2] and f['bbox'][3]>=bbox[3]]
        candidates.sort(key=lambda f:(f['properties'].get('eo:cloud_cover',100),f['properties']['datetime']))
        if not candidates:
            raise ValueError('No recent low-cloud scene fully covers the crop')
        selected=candidates[0]
        save_json(folder/'selected-item.json',selected)
        report['scene']={'id':selected['id'],'datetime':selected['properties']['datetime'],
                         'sceneCloudPercent':selected['properties']['eo:cloud_cover'],
                         'license':'Copernicus Sentinel data terms; see STAC collection',
                         'localCloudAssessment':'pending SCL crop verification; scene cloud is not local cloud coverage'}
        collection=json.loads(request('https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a'))
        save_json(folder/'collection.json',collection)
        for band in ['visual','red','green','nir','scl']:
            if band not in selected['assets']:
                report['errors'].append({'stage':'asset','asset':band,'error':'not present'})
                continue
            try:
                asset=clip_asset(selected['assets'][band]['href'],bbox,folder/f'{band}.tif')
                report['files'].append({'asset':band,**asset})
            except Exception as error:
                report['errors'].append({'stage':'crop','asset':band,'error':str(error)})
        report['status']='acquired' if len(report['files'])==5 else 'partial' if report['files'] else 'failed'
    except Exception as error:
        report['errors'].append({'stage':'imagery','error':str(error)})
        report['status']='failed'
    save_json(folder/'acquisition.json',report)
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0 if report['status']=='acquired' else 1


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--name',default='shenzhen-nanshan-pilot')
    parser.add_argument('--bbox',type=float,nargs=4,default=[113.92,22.51,113.98,22.56])
    args=parser.parse_args()
    if pathlib.Path(args.name).name!=args.name or args.name in ['.','..']:
        parser.error('name must be one directory component')
    raise SystemExit(collect(args))
