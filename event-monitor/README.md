# 深圳租金动态监测

## Tencent News connection

The collector also searches Tencent News for `深圳 住房 租金`, bounded to five results per cycle. Media articles retain publisher, publication time, article URL, and the provider abstract. They are labeled separately from government notices. Abstracts are not model-generated summaries or measured rent observations. Failures retain the previous articles and record a source error. This is a bounded search, not full historical coverage.

Credentials are read from `TENCENT_NEWS_API_KEY` or the Windows user-scoped DPAPI vault `%LOCALAPPDATA%/AnkeAgent/secrets/tencent-news.dpapi`. Never put plaintext keys in project files, snapshots, or logs. The existing service reads the vault on each collection cycle. The gray-white news cards expand to show source excerpts and the original article; expanded cards remain open across refreshes. Original article navigation permits only HTTPS Shenzhen government subdomains and the exact Tencent article hosts `view.inews.qq.com`, `news.qq.com`, and `new.qq.com`.

Verification: `python -m unittest test_monitor test_tencent_news -v`, plus the plugin event tests and a browser interaction check. A successful API request does not establish rental-data API access, prediction accuracy, or native desktop acceptance.

从登记的深圳官方来源每 10 分钟读取一次公告，筛选交通施工、临时交通管制、城市更新、住房供给、公共服务、环境市政、就业产业、重大活动、住房政策和极端天气。当前已接入市政府通知公告、政务动态和交警交通管制三个栏目。每轮读取首页最多 8 篇相关公告并复查三个指定案例；不代表全网或完整历史覆盖。

原始页面保留在 `data/articles`，事件及版本保存在独立 `data/events.sqlite3`。原租金库保持不变。两端读取同一 JSON 快照。采集失败在来源状态和 `last_run.json` 留痕；一次执行只要有失败就返回非零退出码。服务端口固定为本机 18743，只提供只读健康和事件接口。启动 Anke 或原租金导航仓时启动服务，不重复启动；没有注册开机任务。

每轮还通过 `rent-knowledge/import-events.mjs` 同步已有 PostgreSQL/PGlite 的 `rent_events`、`rent_event_revisions` 和 `rent_documents`，Anke 的知识检索可以返回新闻原文出处。当前为中文词法检索，没有伪造向量。数据库导入失败记录 `knowledgeSync:error`，事件快照仍保留，下一轮重试。原租金观测不更新，后续可按同一时间窗和核验地理范围关联。

Anke 保持原生灰白界面，在原有租金面板加入“租金动态”，同时注册 `ShenzhenRentEvents` 工具。每 30 秒读取快照，新增或正文修订后做一次应用内提醒，去重状态保存在插件私有设置。系统通知需在该面板点“开启系统推送”，并由系统允许；系统可能抑制横幅。应用必须运行才能收到 Anke 提醒。通知成功后、状态写盘前发生崩溃时可能重发一次，不能保证严格恰好一次。

已安装插件的权限不会绕过既有授权上限。更新后需要重载插件或重启 Anke，系统推送还需在插件权限页允许 `notify`；未授予时使用既有应用内 Toast 通道，不偷偷修改权限记录。

原 3D 大屏右侧加入“周边动态”，点击可查看原文摘录，已加载的高斯模型上显示事件浮层。仅当正文明确提到唯一项目名称时选中示意楼房；尚无核验坐标或模型地理配准，当前不生成虚构点位或影响半径。不把公告自动等同于已施工，不把潜在影响等同于租金涨跌。日期未明确写出完整区间时保留待确认。

复核：在本目录运行 `python -m unittest test_monitor -v`；运行 `python monitor.py --limit 3` 获取真实来源；运行 `python monitor.py --serve` 持续监测。配置在 `sources.json`。不会调用模型服务或发送用户住宅信息到外部服务。

niulai 参考页在旧项目 `D:/js/rocket-rl-proposal/simulator_app/MODEL_ROUTING.md` 找回：`https://niulai-66977.app.workbuddy.host/landing.html`。本次网页访问失败，功能按用户给出的“监测—异动—推送”要求独立实现，未声称复现其内部机制。
