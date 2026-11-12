"""Offline crop regression using a local HTTP raster and a synthetic grid."""
import pathlib
import sys
import tempfile
import threading
import unittest
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
ROOT=pathlib.Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'geo-runtime'))
import numpy as np
import rasterio
from rasterio.transform import from_origin
from collect_geo import clip_asset


class AcquisitionTest(unittest.TestCase):
    def test_georeferenced_remote_crop_retains_grid_and_pixels(self):
        with tempfile.TemporaryDirectory(prefix='anke-geo-') as folder:
            root=pathlib.Path(folder)
            pixels=np.arange(10000,dtype='uint16').reshape(100,100)
            with rasterio.open(root/'fixture.tif','w',driver='GTiff',height=100,width=100,
                               count=1,dtype='uint16',crs='EPSG:4326',transform=from_origin(113.9,22.6,0.001,0.001)) as dst:
                dst.write(pixels,1)
            handler=partial(SimpleHTTPRequestHandler,directory=str(root))
            server=ThreadingHTTPServer(('127.0.0.1',0),handler)
            thread=threading.Thread(target=server.serve_forever,daemon=True)
            thread.start()
            try:
                result=clip_asset(f'http://127.0.0.1:{server.server_port}/fixture.tif',
                                  [113.92,22.52,113.94,22.54],root/'clip.tif')
                self.assertEqual(result['crs'],'EPSG:4326')
                self.assertEqual(result['width'],20)
                self.assertEqual(result['height'],20)
                with rasterio.open(root/'clip.tif') as src:
                    np.testing.assert_array_equal(src.read(1),pixels[60:80,20:40])
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=5)


if __name__=='__main__':
    unittest.main()
