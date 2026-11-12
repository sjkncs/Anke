"""Inspect real cropped Sentinel pixels; indices are not GeoSeg-SAM inference."""
import hashlib
import json
import pathlib
import sys
ROOT=pathlib.Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'geo-runtime'))
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.warp import reproject


def analyze(folder):
    acquisition=json.loads((folder/'acquisition.json').read_text(encoding='utf-8'))
    if acquisition['status']!='acquired':
        raise ValueError('Acquisition is not complete')
    metadata=[]
    for item in acquisition['files']:
        file=pathlib.Path(item['path'])
        if hashlib.sha256(file.read_bytes()).hexdigest()!=item['sha256']:
            raise ValueError('Raster hash mismatch')
        with rasterio.open(file) as src:
            metadata.append({'asset':item['asset'],'crs':str(src.crs),'shape':[src.height,src.width],
                             'validPixels':int(np.count_nonzero(src.dataset_mask()))})
    with rasterio.open(folder/'red.tif') as red_src, rasterio.open(folder/'green.tif') as green_src, rasterio.open(folder/'nir.tif') as nir_src, rasterio.open(folder/'scl.tif') as scl_src:
        def reflectance(src, asset):
            info=json.loads((folder/'selected-item.json').read_text())['assets'][asset]['raster:bands'][0]
            return src.read(1).astype(float)*info.get('scale',1)+info.get('offset',0)
        red=reflectance(red_src,'red')
        green=reflectance(green_src,'green')
        nir=reflectance(nir_src,'nir')
        if not(red_src.transform==green_src.transform==nir_src.transform and red.shape==green.shape==nir.shape):
            raise ValueError('Spectral grids are not aligned')
        scl=np.zeros(red.shape,dtype='uint8')
        reproject(scl_src.read(1),scl,src_transform=scl_src.transform,src_crs=scl_src.crs,
                  dst_transform=red_src.transform,dst_crs=red_src.crs,resampling=Resampling.nearest)
        usable=np.isin(scl,[4,5,6]) & (red_src.read_masks(1)>0) & (green_src.read_masks(1)>0) & (nir_src.read_masks(1)>0)
        usable &= (np.abs(nir+red)>1e-6) & (np.abs(green+nir)>1e-6)
        ndvi=np.divide(nir-red,nir+red,out=np.zeros_like(red),where=(nir+red)!=0)
        ndwi=np.divide(green-nir,green+nir,out=np.zeros_like(red),where=(green+nir)!=0)
        result={'scope':'Nanshan regional crop, not a matched residential community',
                'scene':acquisition['scene'],'rasterChecks':metadata,'method':'Sentinel-2 spectral-index diagnostic; NOT GeoSeg-SAM/SAM inference',
                'quality':{'totalPixels':int(usable.size),'usableScl456Pixels':int(usable.sum()),
                           'usablePercent':float(usable.mean()*100),'sclHistogram':{str(int(k)):int(v) for k,v in zip(*np.unique(scl,return_counts=True))}},
                'qualityStatus':'PASS' if usable.mean()>=0.8 else 'INSUFFICIENT_CLEAR_PIXELS',
                'spectralIndices':'PENDING radiometric offset validation; withheld from environment indicators',
                'caution':'Index thresholds are diagnostic candidates, not validated semantic segmentation or a residential quality score'}
        if not usable.any():
            raise ValueError('No usable clear-sky surface pixels')
        (folder/'pixel-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    from PIL import Image
    with rasterio.open(folder/'visual.tif') as src:
        rgb=src.read([1,2,3]).transpose(1,2,0)
        Image.fromarray(rgb.astype('uint8')).save(folder/'preview.png')
    print(json.dumps(result,ensure_ascii=False,indent=2))


if __name__=='__main__':
    analyze(pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'data/geospatial/shenzhen-nanshan-pilot')
