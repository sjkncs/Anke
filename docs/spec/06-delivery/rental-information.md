# Rental information expansion

The market ledger exposes ten field groups, supplied addresses, fees and fee
basis, record/lease types, listing IDs and safe text URLs. Missing values remain
unknown. Source counts use the full filtered snapshot, while the ledger remains
limited to the returned first 500 records; the UI explicitly reports this limit.

Events have an independent search input so a market project search cannot hide
all city events. Evidence, original URL, first-seen time and version are available
in expandable row details. Two official Shenzhen housing feeds are registered.
The one-time bounded collection kept failures visible and collected seven new
events; the running page returned 27 current events across six registered sources.
Registration is not proof of complete coverage or ongoing successful collection.

2026-11-13 browser verification: 10 ledger headers; source counts for current
挂牌/整租 filters: 58同城 209, 房天下 911, 贝壳 406, 链家 82. Searching 博林天瑞
in the market filter left the independent event search empty and 27 event rows.
These are listing observations, not verified transactions or unique homes.

Official sources checked: https://zjj.sz.gov.cn/xxgk/tzgg/ and
https://zjj.sz.gov.cn/ztfw/zfbz/fpgc/. The first discovered 17 relevant links;
the second encountered an article fetch failure on the latest bounded pass.
The official market reference query https://zjj.sz.gov.cn/fwzljgcx/vue/main
was discovered but is not integrated as microdata. Do not claim otherwise.

Checks: `node --test rental-controls.test.cjs apps/desktop/resources/plugins/anke.rents/query.test.cjs`
and `py -X utf8 -m unittest test_monitor -q` from event-monitor. No new libraries,
credentials, API charges or remote writes were used. No commits were requested.
