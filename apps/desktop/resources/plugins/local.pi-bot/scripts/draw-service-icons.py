"""Render original service illustrations using the pinned Claude Drawing library."""
import math
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, 'E:/codex-home/codex-data/skills/claude-drawing/lib')
from sketchbook import Sketchbook

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'renderer/service-icons'
OUT.mkdir(parents=True, exist_ok=True)
INK = '#434748'
PALE = '#d7dcd9'
LABELS = {'education':'教育培训','food':'外卖配送','parcel':'快递寄送','repair':'设备报修','billing':'费用缴纳','property':'物业通知','activities':'社区活动','operations':'智能运维','iot':'智能公寓','health':'医疗保障','remote-work':'居家工作','campus':'校园动态','mail':'邮件中心','wealth':'财富管理','career':'职业规划'}

def draw(key, seed):
    p = Sketchbook(256,256,seed=seed,keep_stages=False)
    p.paper(tone='#fafaf8',tooth=.35,mottle=.15,fibres=.05)
    def line(points,w=4): p.ink(points,width=w,colour=INK,wobble=.45,tremor=.12,gaps=0)
    def polygon(points,fill=PALE):
        p.tint(p.poly(points),fill,strength=.68,grain=.4,streak=.3)
        line(points+[points[0]])
    def circle(x,y,r):
        line([(x+math.cos(i*math.pi/20)*r,y+math.sin(i*math.pi/20)*r) for i in range(41)])
    if key=='wealth':
        polygon([(48,202),(48,167),(83,167),(83,202)])
        polygon([(94,202),(94,137),(129,137),(129,202)])
        polygon([(141,202),(141,103),(176,103),(176,202)])
        line([(47,137),(91,111),(127,119),(194,59)],5)
        line([(165,60),(195,58),(194,88)],4)
        circle(73,75,26)
        line([(63,64),(73,76),(84,64)],3)
        line([(61,79),(86,79)],3);line([(73,76),(73,93)],3)
    elif key=='career':
        polygon([(48,111),(181,111),(181,205),(48,205)])
        line([(90,110),(90,89),(140,89),(140,110)],4)
        line([(49,143),(112,156),(180,143)],3)
        polygon([(106,147),(122,147),(122,165),(106,165)],'#b9c9c0')
        line([(153,88),(190,51),(214,51)],5)
        line([(198,37),(215,51),(200,67)],4)
    elif key=='food':
        polygon([(75,91),(178,94),(169,207),(83,204)])
        line([(103,96),(104,64),(145,62),(151,96)])
        line([(106,143),(145,145),(143,173),(111,173),(106,143)])
        line([(146,146),(161,146),(160,159),(146,161)])
        line([(123,134),(129,122),(124,114)],3)
        line([(51,132),(70,132)],3);line([(42,152),(67,151)],3)
    elif key=='education':
        polygon([(48,83),(91,80),(128,95),(165,80),(207,84),(205,192),(167,189),(128,206),(90,190),(48,193)])
        line([(128,97),(128,203)])
        for x in (66,147):
            for y in (112,134,155):line([(x,y),(x+37,y+2)],3)
        line([(190,62),(205,47),(217,59),(204,74)],4)
    elif key=='parcel':
        polygon([(53,91),(128,56),(205,92),(203,182),(127,216),(53,179)])
        line([(54,92),(127,126),(204,93)]);line([(127,127),(128,213)])
        line([(92,74),(165,110),(165,143)],3);line([(74,155),(101,167)],3)
    elif key=='repair':
        line([(72,54),(62,80),(76,103),(96,108),(164,187)],10)
        circle(177,200,16);line([(83,52),(99,69),(91,91),(71,82)],5)
        line([(178,59),(191,73),(115,157)],9);polygon([(103,160),(119,174),(94,202),(76,186)])
    elif key=='billing':
        polygon([(68,47),(192,47),(190,207),(175,197),(158,209),(143,197),(126,209),(109,198),(91,210),(68,199)])
        line([(104,79),(127,102),(149,79)]);line([(127,101),(127,137)])
        line([(104,106),(151,106)],3);line([(104,121),(151,121)],3)
        line([(92,160),(166,160)],3);line([(92,179),(148,179)],3)
    elif key=='property':
        polygon([(65,54),(189,54),(189,197),(65,197)])
        line([(91,90),(161,90)],4);line([(91,116),(164,116)],4);line([(91,141),(142,141)],4)
        circle(191,186,30);line([(180,185),(189,195),(205,173)],4)
    elif key=='activities':
        polygon([(54,74),(202,74),(202,204),(54,204)])
        line([(54,107),(202,107)]);line([(87,51),(87,87)],6);line([(169,51),(169,87)],6)
        for x,y in [(85,135),(128,135),(169,135),(85,172),(128,172)]:circle(x,y,6)
        line([(161,174),(170,183),(188,161)])
    elif key=='operations':
        polygon([(51,68),(202,68),(202,175),(51,175)])
        line([(79,134),(102,114),(127,139),(156,96),(179,109)])
        line([(127,177),(127,201)]);line([(94,204),(161,204)])
    elif key=='iot':
        polygon([(63,120),(128,64),(193,120),(190,208),(64,208)])
        line([(110,208),(110,164),(145,164),(145,208)])
        line([(94,69),(106,50),(128,43),(151,49),(166,66)],4)
        line([(108,78),(128,66),(149,78)],3)
    elif key=='health':
        polygon([(51,84),(203,84),(203,202),(51,202)])
        line([(97,83),(97,55),(156,55),(156,83)])
        polygon([(118,110),(139,110),(139,133),(163,133),(163,154),(139,154),(139,179),(118,179),(118,154),(95,154),(95,133),(118,133)],'#b9c9c0')
    elif key=='remote-work':
        polygon([(64,65),(190,65),(190,164),(64,164)])
        polygon([(64,164),(190,164),(215,194),(41,194)])
        line([(107,183),(151,183)],3);line([(100,100),(120,115),(99,131)],4)
        line([(138,130),(161,130)],4)
    elif key=='campus':
        polygon([(45,106),(127,57),(210,106)])
        for x in (69,119,170):polygon([(x,111),(x+15,111),(x+15,187),(x,187)])
        line([(43,194),(212,194)],6);line([(36,209),(219,209)],5)
    elif key=='mail':
        polygon([(44,79),(211,79),(211,197),(44,197)])
        line([(46,83),(128,144),(208,82)]);line([(48,193),(99,146)],3);line([(207,192),(157,146)],3)
    p.finish(grain=.1,soft=.05)
    p.save(OUT/(key+'.png'))

for i,key in enumerate(LABELS):draw(key,seed=70+i)
sheet=Image.new('RGB',(5*240,3*290),'#ffffff')
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',20)
for i,(key,label) in enumerate(LABELS.items()):
    x,y=(i%5)*240,(i//5)*290
    sheet.paste(Image.open(OUT/(key+'.png')).resize((210,210)),(x+15,y+12))
    ImageDraw.Draw(sheet).text((x+120,y+237),label,font=font,fill=INK,anchor='mt')
sheet.save(OUT/'service-icons-preview.jpg',quality=92)
print(f'Rendered {len(LABELS)} service icons and preview.')
