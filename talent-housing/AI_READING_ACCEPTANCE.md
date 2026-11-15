AI reading and brand mark acceptance — 2026-11-14

Implemented:
- Existing 600-second collector and 30-second panel refresh retained. The most
  recent observed snapshot reported 6/6 healthy sources and 43 visible events;
  this is a snapshot, not a guarantee of future platform availability.
- Literal dates, amounts and qualification labels are emphasized without
  rewriting source text. Original paragraphs and source links remain available.
- All 11 runtime rental sections, including dynamically inserted rentVisuals,
  have an interpretation shortcut. The plugin lists configured models and makes
  a read-only completion only after the user clicks Start. No broad transcript
  context is included; source text is explicitly treated as untrusted data.
- Added agent.complete and models.list declarations. A normal desktop restart
  synchronized the bundled plugin permissions; no database permissions were edited.
- Xiaomi, Hugging Face, Radius and Jev marks are bundled from official assets.
  Radius is the Pi gateway at radius.pi.dev, not the unrelated radius.ai.

Reproducible checks:
- node talent-housing/test-ai-reading.cjs: passed mocked completion, invalid
  module/model rejection, all-page coverage, dialog flow, highlights and no JS errors.
- node talent-housing/test-provider-marks.cjs: passed five identity cases,
  unrelated Radius rejection and bundled image decoding.
- ANKE_TONE_URL=http://127.0.0.1:47835 node talent-housing/verify-event-tone.cjs:
  passed real snapshot, paragraph reader, source retention and polarity fixtures.
- py -3.11 -m unittest test_monitor.py test_tencent_news.py: 9 passed.
- node --test service-guard/policy.test.mjs: 4 passed.
- node talent-housing/build-reading-renderer.mjs: production build passed;
  existing large-chunk advisory remains. Renderer output backed up under
  backups/ai-reading-20261114/renderer before deployment.

Native desktop observations via CDP port 47919:
- All 11 sections contain a shortcut; model picker returned 5 configured models.
- News reader displayed 7 emphasized source spans in the inspected notice.
- Radius, Xiaomi, all three Xiaomi regional plans, Hugging Face and Jev images
  all had complete=true and naturalWidth>0 in the real Add Service catalog.
- Screenshots: data/ai-native.png, data/highlights-native.png,
  data/provider-native.png. Browser mock screenshots are separate.

Limitations:
- No paid model request was made; output quality and current provider availability
  are not established by the mocked completion test or model-list success.
- Monitoring requires the local services to remain running; it does not operate
  while the PC is off. Existing guard restart bounds and checkpoints are retained.
- Python's WindowsApps alias did not execute tests; the explicit Python 3.11
  launcher rerun passed. Initial hot reload retained old plugin permissions;
  the normal full application restart resolved it and native model listing passed.
