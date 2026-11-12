"""Generate Anke product assets; preserve upstream license documents."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1] / 'apps' / 'desktop'
def mark(size, dark=False):
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    fg, bg = ('#454545', '#ffffff') if dark else ('#ffffff', '#454545')
    draw.rounded_rectangle((0, 0, size-1, size-1), radius=size//4, fill=bg)
    # Architectural A: a roof, two piers and an open central passage.
    draw.line([(size*.22,size*.72),(size*.22,size*.43),(size*.5,size*.22),(size*.78,size*.43),(size*.78,size*.72)],fill=fg,width=max(1,round(size*.085)),joint='curve')
    draw.line([(size*.38,size*.73),(size*.38,size*.51),(size*.62,size*.51),(size*.62,size*.73)],fill=fg,width=max(1,round(size*.07)),joint='curve')
    return image

for filename, size in [('icon.png',256),('icon_1024.png',1024),('tray-icon-mac.png',32)]:
    mark(size).save(root/'build'/filename)
mark(256).save(root/'build/icon.ico',sizes=[(16,16),(32,32),(48,48),(128,128),(256,256)])
mark(128).save(root/'src/assets/brand/logo-light.png')
mark(128,True).save(root/'src/assets/brand/logo-dark.png')
print('Anke desktop and tray icons generated')
