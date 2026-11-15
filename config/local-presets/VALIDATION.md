# 同步验证记录

日期：2026-11-15。

- 配置 JSON 解析通过；配置数量为 38 个 Bot、5 个房间、10 个工作区、2 个模型服务、15 个模型条目、2 个 Bot HTTP 连接器。独立 MCP 服务器文件为 0。
- 对变更文件执行凭证候选扫描及禁止发布的二进制文件检查，未发现命中；密钥字段已替换为占位符。扫描不能代替第三方服务认证验证。
- 暂存前 `git diff --check` 通过；包含新增文件的 `git diff --cached --check` 检出源网页与第三方打包文件的空白格式问题，未通过。为保留源文件内容，本次没有批量改写来源网页或打包代码。
- `node --test apps/desktop/resources/plugins/local.pi-bot/tests/anke-services.cjs apps/desktop/resources/plugins/local.pi-bot/tests/attachments.cjs apps/desktop/test/smooth-text-throttle.test.mjs`：25/25 通过。
- 加跑 `apps/desktop/resources/plugins/anke.rents/query.test.cjs` 与 `apps/desktop/resources/plugins/anke.rents/routes.test.cjs`：总计 34 项中 29 项通过、5 项失败。失败项需要 480 条演示数据（其中 320 条为整租挂牌），而仓库基线 records.json 明确为空；本次未用未经许可的数据补造结果。
- 补齐租金模块所需的公开项目地址元数据 project-addresses.json，避免缺失文件导致查询失败。
- 保留源码所引用第三方项目的 LICENSE、NOTICE。知识库、历史数据库、受限数据及模型权重另行交付；例如 anke.edu 的公开资料索引没有包含在本次提交中。
- 未运行完整依赖安装、完整应用构建、桌面交互、跨机器恢复、外部 API/MCP 登录与调用验收。此提交不是可直接分发的 EXE 发布。
