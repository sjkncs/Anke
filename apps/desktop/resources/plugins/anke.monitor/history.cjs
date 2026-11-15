const cache = new Map(), pending = new Map();
function validateRequest(args = {}) {
  if (!/^(sh|sz|bj)\d{6}$/.test(args.code || '') || !['day','week','month'].includes(args.period || 'day')) throw Error('请选择有效的证券与周期');
  return {code: args.code, period: args.period || 'day'};
}
function normalizeBars(rows) {
  if (!Array.isArray(rows) || rows.length > 1000) throw Error('历史行情格式无效');
  let previous = '';
  return rows.map(row => {
    const [date, ...values] = row;
    const [open, close, high, low, volume] = values.slice(0,5).map(v => v === '' || v == null ? NaN : Number(v));
    // Additive forward adjustment may produce negative historical prices.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date || date <= previous || ![open,close,high,low,volume].every(Number.isFinite) || low > Math.min(open,close) || high < Math.max(open,close) || volume < 0) throw Error('历史行情存在无效数据');
    previous = date;
    return {date,open,close,high,low,volume};
  });
}
async function json(url, timeout = 8000) {
  const r = await fetch(url, {signal: AbortSignal.timeout(timeout), redirect:'error'});
  if (!r.ok) throw Error('历史行情服务返回 '+r.status);
  return r.json();
}
async function history(args) {
  const {code,period} = validateRequest(args), key = code+':'+period;
  const old = cache.get(key);
  if (old && Date.now()-old.time < 60000) return old.value;
  if (pending.has(key)) return pending.get(key);
  const request = (async () => {
    let bars, source;
    if (!code.startsWith('bj')) for(const host of ['web.ifzq.gtimg.cn','ifzq.gtimg.cn']) {
      try {
        const data = await json('https://'+host+'/appstock/app/fqkline/get?param='+code+','+period+',,,320,qfq',6000);
        // Unadjusted fallback is not labelled as forward adjusted.
        bars = normalizeBars(data.data?.[code]?.['qfq'+period]); source = '腾讯行情';
        if (!bars.length) throw Error('暂无历史行情');
        break;
      } catch { bars = null; }
    }
    if (!bars) {
      const secid = (code.startsWith('sh')?'1.':'0.')+code.slice(2);
      const query = new URLSearchParams({secid,klt:({day:'101',week:'102',month:'103'})[period],fqt:'1',end:'20500101',lmt:'320',fields1:'f1,f2,f3,f4,f5,f6',fields2:'f51,f52,f53,f54,f55,f56'});
      const data = await json('https://push2his.eastmoney.com/api/qt/stock/kline/get?'+query);
      bars = normalizeBars(data.data?.klines?.map(row=>row.split(','))); source = '东方财富';
    }
    if (!bars.length) throw Error('该证券暂无可用历史行情');
    const value = {code,period,bars,source,adjustment:'qfq',volumeUnit:'手',lastDate:bars.at(-1).date,receivedAt:new Date().toISOString()};
    if (cache.size >= 40) cache.delete(cache.keys().next().value);
    cache.set(key,{time:Date.now(),value}); return value;
  })();
  pending.set(key,request);
  try { return await request; } finally { pending.delete(key); }
}
module.exports = {history,normalizeBars,validateRequest};
