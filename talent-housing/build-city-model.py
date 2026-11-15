"""Export the preserved Shenzhen MultiPatch source; never modify source assets."""
import argparse
import base64
import hashlib
import json
from array import array
from pathlib import Path

import shapefile
from pyproj import Transformer
from shapely import Polygon, constrained_delaunay_triangles

DISTRICTS = [('nanshan', '南山区'), ('baoan', '宝安区3D'), ('futian', '福田区'),
             ('luohu', '罗湖区'), ('yantian', '盐田区'), ('longgang', '龙岗区')]


def build(source, output):
    output.mkdir(parents=True, exist_ok=True)
    transform = Transformer.from_crs(32649, 3857, always_xy=True)
    origin = Transformer.from_crs(4326, 3857, always_xy=True).transform(114.05, 22.65)
    manifest = dict(version=1, source_crs='EPSG:32649', render_crs='EPSG:3857',
                    origin=list(origin), units='kilometers', vertical_datum='unknown',
                    control_points='pending', skp_equivalence='not_verified', districts=[])
    for slug, name in DISTRICTS:
        file = source / (name + '.shp')
        reader = shapefile.Reader(str(file))
        positions, indices = array('f'), array('I')
        rejected = 0
        bounds = [float('inf'), float('inf'), -float('inf'), -float('inf')]
        for shape in reader.iterShapes():
            offset = len(positions) // 3
            x, y = transform.transform(*zip(*shape.points))
            for xx, yy, zz in zip(x, y, shape.z):
                px, pz = (xx-origin[0])/1000, -(yy-origin[1])/1000
                positions.extend((px, zz/1000, pz))
                bounds = [min(bounds[0], px), min(bounds[1], pz),
                          max(bounds[2], px), max(bounds[3], pz)]
            starts = list(shape.parts) + [len(shape.points)]
            for start, end, kind in zip(starts, starts[1:], shape.partTypes):
                if kind == 0:
                    for j in range(start, end-2):
                        indices.extend((offset+j, offset+j+1+(j % 2), offset+j+2-(j % 2)))
                elif kind == 2:
                    points = shape.points[start:end]
                    polygon = Polygon(points)
                    if polygon.area == 0:
                        continue
                    if not polygon.is_valid:
                        rejected += 1
                        continue
                    lookup = {tuple(p): offset+start+j for j, p in enumerate(points)}
                    for triangle in constrained_delaunay_triangles(polygon).geoms:
                        indices.extend(lookup[tuple(p)] for p in list(triangle.exterior.coords)[:3])
                else:
                    raise ValueError(f'Unsupported MultiPatch type: {kind}')
        if not positions or not indices:
            raise ValueError(f'Empty district: {name}')
        meta = dict(id=slug, name=name.replace('3D', ''), bounds=bounds,
                    vertices=len(positions)//3, triangles=len(indices)//3,
                    rejected_rings=rejected, source_sha256=hashlib.sha256(file.read_bytes()).hexdigest())
        payload = dict(**meta, positions=base64.b64encode(positions.tobytes()).decode('ascii'),
                       indices=base64.b64encode(indices.tobytes()).decode('ascii'))
        (output / (slug+'.js')).write_text('window.AnkeCity.receive('+json.dumps(payload, ensure_ascii=False, separators=(',', ':'))+');\n', encoding='utf-8')
        manifest['districts'].append(meta)
        print(json.dumps(meta, ensure_ascii=False), flush=True)
    (output/'manifest.js').write_text('window.AnkeCity.start('+json.dumps(manifest, ensure_ascii=False, separators=(',', ':'))+');\n', encoding='utf-8')
    (output/'provenance.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    build(args.source, args.output)
