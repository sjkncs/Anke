# Evidence-aware opinion analysis

The news cards expose source type, scene, issue, sentiment, calibrated confidence,
publication date and modality inventory. A scale slider filters declared macro,
meso and micro annotations. Unknown scale is retained under All, not guessed.

`anke_analysis` accepts level, scene, issue, sentiment, target, impact, horizon,
evidence, model_version, confidence, calibration_id and analyzed_modalities.
Evidence excerpts must occur verbatim in the available textual payload. A numeric
confidence is displayed only with a calibration identifier, model version and
matching evidence. These checks are not verification of a provider's calibration.
No trained classifier or calibrated accuracy is claimed by this implementation.

Sentiment is distinct from target-conditioned financial/housing impact. Rent
assessment compares actual rent with a supplied quality-adjusted interval in the
same units, retaining its date and sample size. Lower/higher than the interval is
not a legal, fairness or investment determination. Confidence is not inferred
from a provider news relevance score.

News observation is opt-in, once per minute while the panel is visible, with no
overlap. Error stops the loop; closing/switching the panel stops observation.
It consumes the selected account's existing news endpoint quota. This is polling,
not streaming or a background social-media collector.

## Remaining production work

- Authorized Weibo feed: official developer authentication/service permissions
  are required (https://open.weibo.com/cli/quickstart, checked 2026-11-12).
- OCR/ASR/image/video understanding: modality inventory is implemented; media
  content is not analyzed by this change.
- Train/evaluate a target/aspect/time-conditioned model using independently
  annotated Chinese finance/housing samples. Split evaluation by time, source
  and duplicate-event cluster. Calibrate confidence on a held-out set; measure
  class F1, Brier/ECE and abstention coverage. Treat this as proposed research.
- Cross-source event deduplication, stance disagreement and incremental updates
  need a persistent ingestion pipeline before population-level opinion trends.

Verification: `node --test tests/opinion.cjs tests/wealth-visuals.cjs
tests/wealth-ui.cjs`. Browser fixtures remain synthetic. Native desktop and
authenticated social-feed acceptance are pending.
