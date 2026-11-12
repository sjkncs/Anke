"""Offscreen check of actual cockpit event selection; no user DB or live session."""
import json
import os
import sys
import tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT))
from PyQt5.QtWidgets import QApplication
from PyQt5.QtCore import QUrl, QTimer
from unittest.mock import patch
from app import MainWindow,STYLE
from map_stage import MapStage
app=QApplication([])
app.setStyleSheet(STYLE)
temp=tempfile.TemporaryDirectory()
with patch.object(MapStage,'baidu',lambda self:self.pages.setCurrentIndex(0)):
    window=MainWindow(Path(temp.name)/'verification.sqlite3')
view=window.dashboard
view.resize(1600,1000);view.show();app.processEvents()
assert view.event_list.count()>0
item=view.event_list.item(0);event=item.data(256)
view.select_event(item);app.processEvents()
assert event['title'] in view.selection.text()
assert view.map_stage.event_heading.text()==event['title']
output=ROOT/'event-monitor/verification';output.mkdir(exist_ok=True)
assert view.grab().save(str(output/'cockpit-events.png'))
result={'cockpitEventCount':view.event_list.count(),'selectedTitle':event['title'],
        'overlayHeading':view.map_stage.event_heading.text(),'mode':'actual Qt widgets with temporary database; map network disabled',
        'geographicMarkerCheck':'no coordinates assigned','nativeNotificationCheck':'not performed'}
(output/'cockpit-acceptance.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
view.close();window.close();temp.cleanup()
print(json.dumps(result,ensure_ascii=False))
QTimer.singleShot(0,app.quit)
app.exec_()
