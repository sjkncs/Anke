# Anke Monitor

An Anke-owned plugin with locally rendered market visualization, filtering,
ranking, board summaries, a turnover-ranked heatmap and sixty-second refresh. Data uses the user-supplied
Niulai read-only market endpoint; source timestamps and missing values survive
normalization. No holdings, orders or credentials are sent. Market requests
coalesce and cache for thirty seconds. The remote backend is not copied.

Version 0.2 adds per-symbol daily/weekly/monthly forward-adjusted candlesticks,
actual volume, MA5/10/20, crosshair, wheel/keyboard zoom, drag/keyboard history,
CSV export and local watchlists. Tencent historical data uses two fixed hosts;
Eastmoney is the fallback, including Beijing symbols. Requests validate symbols,
periods, dates, ordered bars and OHLC consistency, cache for sixty seconds and
remain within the panel's thirty-second request deadline. Failed history clears
previous bars; outdated responses cannot replace a newer symbol or period.
Watchlists are stored in this local panel origin, not synced across devices.

Version 0.3 adds MA/EMA/BOLL with a configurable 2–120 bar period, VOL/MACD/KDJ/RSI
subcharts, candle/close-line selection, temporary horizontal/two-point trend
drawings and historical replay (slider, next bar, play/pause). Replay bounds pan,
keyboard and reset, computes indicators on historical prefixes, and exports
only the revealed prefix. New bars require explicit refresh or reopening detail;
background quote refresh no longer erases drawings or interrupts replay. Drawing
state resets on symbol/period/data change. Replay is visualization, not backtesting.
A featured entry opens sz300308 (Zhongji Innolight). Indicator formulas use EMA
seeded at the first close, population-standard-deviation BOLL, doubled MACD
histogram, Chinese recursive RSI smoothing (flat=50), and K/D seeded at 50.

Reference inspected 2026-11-12:
https://niulai-11507.app.workbuddy.host/chart.html?code=sz300308&name=%E4%B8%AD%E9%99%85%E6%97%AD%E5%88%9B
New chart code is independently implemented; no original site source is bundled.

Version 0.4 adds intersecting numeric quote filters (change, turnover amount,
turnover rate and P/E), local price/change alerts and dual-MA backtesting.
Alerts evaluate each accepted quote refresh while the wealth panel is open and
visible; triggered state is persisted and requires explicit rearming. These are
in-panel notifications, not OS/background push. Source timestamps are retained;
stale snapshots are not labelled live. Missing or suspended quotes never trigger.
Alerts do not evaluate while replay is active. Local storage failure is visible.

Backtesting uses the revealed history prefix, previous completed-close MA target
exposure and next-bar open execution, configurable one-way fee/slippage in basis
points, fractional all-in long exposure and mark-to-market ending positions.
It reports return, same-window buy-and-hold price return, drawdown, closed win
rate, equity curve and executions. No lot sizes, T+1, limit fills, tax or dividend
cash-flow accounting is modeled. Nonpositive adjusted prices are rejected.
No order is submitted. Results are historical simulations, not actual execution.

Version 0.5 adds source-dated intraday price/interval-volume charts from a fixed
Tencent minute endpoint (15-second cache, explicit refresh), with previous-close
reference and a time-based horizontal axis preserving lunch and post-close gaps.
The source reports minute observations, not individual trades. Interval volume
and amount are differences of monotonically increasing cumulative fields; malformed
timestamps, reversed counters and nonpositive prices fail. Unsupported symbols
show an error. Late responses cannot repopulate a closed or changed detail.

Five-bar directional training uses the loaded historical series, starts at 60%
with ten-bar minimum context, and reveals the next five closes only after a
prediction. Replay export/backtest remain prefix-limited; today's intraday panel
is hidden during replay/training. Per-round results and accuracy are stored
locally (latest 100 records); unchanged closes are unscored. Manual replay
position changes cancel unanswered training, and symbol/period changes reset it.
This is historical chart practice, not a blind trading experiment: the symbol,
latest quote and previously viewed chart may already be known. Training exit
restores the latest chart; drawings no longer move the replay boundary when panned.

Feature parity remains partial: trade ticks, advanced drawing tools,
background/OS alerts, factor testing and the original
AI debate/advanced screening backends have not been integrated. Housing gains persisted
panel visibility and a publication-date timeline, not global WorldMonitor feeds.

The housing tab loads Anke's local Housing Monitor companion at port 47831
(development preview fallback 47834). Its source lives at `housing_monitor/`
and `talent-housing/`; its WorldMonitor-derived composition retains AGPL-3.0
licensing and provenance in `housing_monitor/NOTICE.md`. It provides Shenzhen
map, supplied building geometry, local news and configured-model analysis.
This is not a copy of WorldMonitor's full global feed service.

Open the command `anke.monitor.open` in Anke. Both panel and data handlers
are plugin-owned. `ui.panel` and `renderer.extension` permissions are requested;
the renderer listens only for Anke's wealth/housing launcher events and relays
them to its own declared `monitor.open` method. No host-core changes are needed.

Niulai endpoint inspected 2026-11-12: 5704 returned rows, reported total 5705,
one missing; this observation is not a guarantee of future coverage. No backend
source or redistribution license was provided by its share page; its source
has not been copied. The UI here is original Anke code.

Validation: `node --test market.test.cjs history.test.cjs indicators.test.mjs market-tools.test.mjs intraday.test.cjs training.test.mjs ui.test.cjs`, `node --check renderer/app.mjs`.
The browser test uses explicitly synthetic fixtures; live endpoint checks are separate.

### Stock detail and launcher integration

Anke's Wealth Board opens this visual monitor; the separate More Data action
retains Findesk's capability queries. Selecting a stock opens a scrollable detail
overlay with quotation, valuation, upstream price limits, and interactive charts.
Missing valuation and limit fields remain blank dashes; limits are never inferred.
Escape or Close returns to the market without changing its filters or scroll.
