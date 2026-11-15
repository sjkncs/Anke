# Anke residential inspection

Local companion: `ANKE_AI_NODE_MODULES=<existing node_modules> node
housing_monitor/inspection/server.mjs`. Open `http://127.0.0.1:47836/`.
Dependencies: `@langchain/langgraph` 1.4.13, `@langchain/core` 1.2.9, both MIT.
No dependency installer or model download runs at application startup.

LangChain RunnableLambda nodes execute inside an actual LangGraph StateGraph:
validate observations, assess explicitly supplied visual cues, prepare a
parameterized Neo4j query, optionally persist. This is an evidence workflow,
not a calibrated defect predictor. Probabilities remain null. Label confidence
is not a defect probability. Manual labels remain manual; OBJ group colors are
exported group identities, not semantic segmentation.

The image UI accepts local PNG/JPEG/WebP, normalized polygon result JSON,
manual polygon drawing, per-object colors, lead reports and evidence export.
No imagery is taken from a cross-origin street-view iframe. Use a permitted
photo or SU screenshot. Geometry-to-image registration is not implemented.

Optional server-only environment variables:

- `ANKE_SEGMENT_URL`: owned segmentation endpoint. POST `{image, classes,
  maskFormat:"normalized-polygons"}`; response `{objects:[{id,label,confidence,
  method:"model",polygon:[[x,y],...],cues:[]}]}`. Optional
  `ANKE_SEGMENT_TOKEN` is used only server-side. A model endpoint must provide
  semantic names as well as masks; SAM2 alone does not name defect classes.
- `ANKE_NEO4J_URL`, `ANKE_NEO4J_USER`, `ANKE_NEO4J_PASSWORD`, optional
  `ANKE_NEO4J_DATABASE`: official Query API `/db/<database>/query/v2`. Check both
  HTTP and body errors, require bookmarks before reporting a write receipt.
- `ANKE_MIROFISH_URL`: separately deployed official MiroFish service. Supported
  API paths: GET `/api/simulation/list`, POST `/api/simulation/create` with an
  existing `project_id`, GET `/api/simulation/<id>/run-status`. No simulation
  starts automatically, no inspection image is sent to MiroFish, and no Zep or
  model key is collected by the browser. Neo4j is not a drop-in replacement for
  upstream MiroFish's Zep graph dependency.

Source review on 2026-11-13 (source inspection, not model/service acceptance):

| Source | Revision | License |
| --- | --- | --- |
| https://github.com/666ghj/MiroFish | 7657031ac01184afe2cb220f5ee3545573b5e843 | AGPL-3.0 |
| https://github.com/langchain-ai/langgraphjs | 572657e381fdf5c421904169b0f8c7c54f7f68d4 | MIT |
| https://github.com/facebookresearch/sam2 | 2b90b9f5ceec907a1c18123530e92e794ad901a4 | Apache-2.0 |

MiroFish README, requirements and API modules were inspected. Its LLM and Zep
credentials are required upstream. Its source is not copied or executed here.
SAM2 is not installed. Neo4j and MiroFish acceptance remain pending.

## Local segmentation evaluation

The product UI is Residential Insight: gray/white split panels, 16px minimum
body labels, hover explanations, model parameters and polygon-union radar.
The radar reports image coverage, not suitability. `history` fetches archived
property-matching notices from the existing housing service. `interpret`
validates observations and delegates to that service's `residential_analyze`
route, then the existing permissioned desktop completion bridge. It uses the
host default model; temporary chat-specific selection is not exposed. A standalone
housing service has no desktop completion callback and fails explicitly.
Technical connectors remain server-side without configuration controls in UI.

`ANKE_SEGMENT_PYTHON` selects an existing Python interpreter;
`ANKE_SEGMENT_MODEL` selects the folder containing `model.onnx` and `config.json`.
The local adapter is used only when no remote endpoint is configured. It runs
CPU inference in a bounded child process without uploading images.
Existing runtime: Python 3.11, ONNX Runtime 1.20.1, NumPy 2.2.6,
OpenCV 4.12.0, Pillow 12.2.0. No packages were installed.

Model: https://huggingface.co/Xenova/segformer-b0-finetuned-ade-512-512
revision `d3e5499fa8701ff0453ca940a8dfeae39b2f1504`, converted from NVIDIA SegFormer.
The upstream license limits use to noncommercial research/evaluation:
https://github.com/NVlabs/SegFormer/blob/master/LICENSE . Weights remain ignored
local evaluation artifacts and are not bundled into application releases.
Download transport was hf-mirror.com after direct access timed out. The ONNX
SHA-256 matches repository LFS metadata:
`3e5c18a4be395f16646438d54c42377ddc202edfa33d5eced0c9506de75c44c2`.
Configuration SHA-256: `435799652b2b64c3e422dea20fed4c59651dae9f0e291fd885e9e067fee0ce2a`.
Both hashes are checked before inference. No downloaded Python code executes.

Preprocessing follows the pinned processor: RGB, bilinear 512x512, 1/255,
ImageNet mean/std. Softmax uses the 128x128 output grid. Regions below 0.2%
are discarded; external contours are simplified and normalized. Holes are
omitted: polygons are approximate semantic regions. Confidence is mean class
softmax, not calibrated accuracy. No defect cues are inferred by this model.

Run `node housing_monitor/inspection/check-local-segment.mjs` with model
variables, `ANKE_AI_NODE_MODULES`, and `ANKE_TEST_IMAGE` naming a local photo.
The browser check runs real inference through the complete workflow and records
an ignored result/screenshot. An existing 2016 Shuiku Xincun image produced
9 regions across 7 classes. Independent accuracy/IoU remains unmeasured.
