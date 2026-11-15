# Official housing policy knowledge

Latest verification (2026-11-14): 23 clause-bound editorial drafts, including five youth subsidy/refusal answers. Subsidy amount, application, suspension and overlap are routed separately from transition-housing rent. Application cites articles 10, 20 and 21; compound questions retain source retrieval instead of an incomplete short answer. All 15 policy tests, 60 contract checks, browser subsidy rendering and a live localhost subsidy request passed. Browser evidence: `verification/policy-20261114/policy-youth-subsidy.png`. Source coverage remains 47 unique URLs, 48 records and 190 chunks. Official business signoff and native desktop model acceptance remain pending.

The source-preserving policy index is part of the existing talent housing service. Open `/policy` on the same service. It adds no background worker, embedding provider or separate database owner. The read-only `anke_official_policy` tool is advertised by the existing `mcp.mjs` server. A host with an already configured connection must refresh tool discovery. A desktop model conversation has not been accepted.

## Source contract

Public FAQ expansion uses `expand_public_knowledge.py` in the delivery workspace.
Eight official category pages yielded 13 additional FAQs: 20 collected documents
and 128 chunks in total. Two pre-August-2023 FAQs are historical-only by default.
One article failed body validation and was not ingested. Short enumeration
items are preserved through container extraction. Snapshots support bounded
resume; the existing catalog is checked before atomic replacement and backed up.
This is not a full-site or internal 12345 export. No REA execution was needed.

`policy-data/sources.json` contains fetch status, canonical URL, access time, raw HTML SHA256, body SHA256, housing category, publication date and known application deadline. Raw HTML and extracted UTF-8 text remain alongside it. Collection failure never becomes an answer document. An HTML page containing only the site footer does not pass regulation validation. The government 353 regulation was recovered from its government-gazette URL; the older open-government platform URL did not contain an article body.

The collector is `E:/FFD-Downloader-Windows/_workspace/anke-policy-delivery-20261114/collect_official.py`. It performs a bounded manual refresh, not unattended recurring collection. Current validity, supersession, maintenance ownership and official-review signoff remain pending. Adding an authorized 12345 export requires its provenance and use scope; the internal 12345 platform is not connected.

## Retrieval and task routing

The first version performs deterministic Chinese phrase/bigram retrieval with synonyms, article-level chunks and hard filters for housing type, publication date and closed application windows. It does not implement learned semantic embeddings, trained reranking or model distillation. `retrievalScore` is a lexical relevance score, never answer confidence. Answers preserve source excerpts and citations. They do not decide current eligibility or infer that a historical application portal is open.

Eight editorial answer drafts now cover rent, renewal, application process and
abandoned selection, separately for public rental and government-organized
affordable rental housing. Each draft requires an exact source-body hash and
named articles; a source change suppresses the draft until editorial review.
Compound questions, social-operator rentals, qualification exceptions, explicit
batch queries and dates before the cited regulation's effective date fall back
to source lookup. Drafts are marked pending department review in the UI and API.
Run `node evaluate-policy.mjs` for all 60 draft questions. The result measures
scope/date/citation contracts, not answer correctness or readability.

`policy_route` returns minimal tool suggestions: policy lookup, structured housing search, rent calculation or human review. It does not execute write operations or modify queue priorities. Qualification exceptions and school-guarantee substitution go to human review. Source documents are evidence, not executable agent instructions.

## Validation

## Business review and authorized export intake

`node build-policy-review.mjs` generates a separate 20-source review CSV/JSON.
Article matches are lexical candidates, never verified policy equivalence.
Generated files have `.generated` names; reviewer decisions belong in a separate
reviewed copy and are never inferred or applied to live answers by this script.

`node policy-intake-cli.mjs <export.json>` validates an authorized export against
`policy-data/intake-template.json`, pins source hashes, redacts phone/ID/email
patterns and writes only `policy-data/intake-staging/`. Unknown fields, duplicate
IDs, invalid dates and cross-category references reject the whole batch.
Personal names/addresses still need human review. Authorization metadata is a
user declaration, not verified authorization. There is no automatic publish or
12345 platform connection; no model or remote upload is involved.

Run `node --test policy.test.mjs test.mjs deliberation.test.mjs workbench.test.mjs resident-ratings.test.mjs` and `node policy-browser.mjs` from this directory. Browser tests use temporary PGlite storage, real official source snapshots and headless Chromium. They verify source links, historical-batch exclusion, explicit historical access, mobile width and no household writes. Synthetic tests validate contracts only; business question accuracy and readability require a separately annotated set and reviewer signoff.

After every milestone update the project-level requirement matrix, evidence path, observed checks, remaining gap and next dependency. Do not declare the November 2 brief complete from passing code tests.
# 2026-11-14 年度归档与模拟复核补充

社会主体保租房现为独立类型 `social_affordable`，网页与MCP、导入校验一致。沿用353号办法原文及哈希，建立仅含第十八至二十三条、第二十八条的适用视图；不能把同源视图计为新增政策文件。独立来源仍47个，检索记录48份、片段190个。新增社会主体租金上限、申请、续租，以及公租房和政府配租保租房延期腾退答复，共18类解读。14项检查、60题边界检查、浏览器检查通过；社会主体租金截图见 `verification/policy-20261114/policy-social-rent.png`。

后续增补：青年人才过渡住房独立类别 `youth_transition` 已接入网页、只读MCP及导入格式。新增1份办法与6份问答，在线共47份来源、183片段，通俗答复13类。生效日前查询不返回该制度，个人资格与例外不自动裁决。办法文内落款日期2025-12-15、生效日2026-01-01分别保存；网页发布日期缺失保持空值。

13项政策检查及60题边界检查通过；浏览器增加青年人才家具家电答复及第七条原文验收。36份问答关联具体法规条款。截图位于 `verification/policy-20261114/policy-youth-transition.png`。桌面模型整轮对话仍需单独验收。

住房保障栏目7页66条及住房主题页10条已逐条归档。归档位于 `policy-data/public-discovery-20261114/external-archive.json`，76条无正文采集失败；按官网发布日期，2023—2026年分别23、13、12、20条。其他8条早于2023年。

在线检索来源40份；不属于现有住房类别的原文独立归档，不能套用公租房条件。`policy-data/review/simulated-business-review.json` 与同名CSV记录AI模拟审核结论和30条FAQ的对应法规条款，保留原文哈希、意见及正式审核待办。模拟结论不会改变部门正式审核状态。

分页缓存以网址哈希标识，避免调整目录顺序后错用旧快照。复跑采集器前检查并发修改保护；完整目录范围仅指上述栏目，不代表所有区、高校或12345内部文件全量覆盖。
