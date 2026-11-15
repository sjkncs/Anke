# Offline event semantics

Model: https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
Revision: e8f8c211226b894fcb81acc59f3b34ba3efd5f42 (accessed 2026-11-14).
License: Apache-2.0. Purpose: sentence similarity, not sentiment inference.
Artifact: onnx/model_quint8_avx2.onnx, 118453870 bytes; tokenizer.json and config.json.
SHA256: 98a01d88b7de996cdea58c32ca71208c09968d143798814b2ea09d3439dc334f;
verified against the pinned upstream LFS object. Setup fails on a mismatch.
Runtime: isolated .semantic-venv, Python 3.11.9, onnxruntime 1.23.2 (MIT),
tokenizers 0.22.1 (Apache-2.0), numpy 2.2.6 (BSD-3-Clause).
Install uses binary wheels only; no downloaded source/build hooks or remote
model code is executed. The setup script downloads from an immutable revision
using the existing Windows proxy. Inference is offline, CPU-only, two threads;
no credentials, external inference, or telemetry are used.

Mean pooling follows the upstream model card, with attention masks and L2
normalization. Inputs are bounded at 128 tokens. Nine manually written topic
descriptions are semantic search anchors, not empirical training labels.
The top three cosine similarities are retained. Display suppresses scores
below 0.4, an uncalibrated presentation threshold, not a confidence estimate.
Polarity remains the explicit tenant-oriented lexical baseline; embeddings
do not infer negation, causality, geographic applicability or future rent.

Run `.semantic-venv/Scripts/python.exe test-event-semantic.py` for four synthetic
topic cases, finite 384-dimensional embeddings and distinct negated embeddings.
These checks do not establish polarity accuracy or representativeness.
Run `node refresh-event-semantic.cjs` to rebuild changed snapshots and synchronize
the native generated asset with a backup. The collector runs this after export;
failure is recorded as semanticSync:error without stopping source collection.
Unchanged snapshots skip inference. UI annotations require exact title AND
excerpt matches, preventing reuse after an article is edited. Browser and native
receive the same generated annotations; no separate always-on model process.

Generated audit: data/event-semantic-audit.json includes source hash, revision,
timing and humanValidated:false. Original snapshots and source records are not
modified. A model result must never be represented as a verified tenant review.
