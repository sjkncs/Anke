const cache=new Map(),pending=new Map();
function normalizeIntraday(payload,code){
 const raw=payload?.data?.[code],date=raw?.data?.date,rows=raw?.data?.data;
 if(payload?.code!==0||!/^\d{8}$/.test(date||'')||!Array.isArray(rows)||!rows.length||rows.length>600)throw Error('分时行情格式无效');
 const day=`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6)}`;
 if(!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day)throw Error('分时交易日期无效');
 let previous='',volume=0,amount=0;
 const points=rows.map(row=>{
  if(typeof row!=='string')throw Error('分时记录无效');
  const fields=row.trim().split(/\s+/),[time]=fields,[price,cumulativeVolume,cumulativeAmount]=fields.slice(1).map(Number);
  if(fields.length!==4||!/^\d{4}$/.test(time)||Number(time.slice(0,2))>23||Number(time.slice(2))>59||time<=previous||![price,cumulativeVolume,cumulativeAmount].every(Number.isFinite)||price<=0||cumulativeVolume<volume||cumulativeAmount<amount)throw Error('分时记录无效');
  const point={time:time.slice(0,2)+':'+time.slice(2),price,volume:cumulativeVolume-volume,cumulativeVolume,amount:cumulativeAmount-amount,cumulativeAmount};
  previous=time;volume=cumulativeVolume;amount=cumulativeAmount;return point;
 });
 const close=Number(raw.qt?.[code]?.[4]);
 return {code,date:day,points,previousClose:Number.isFinite(close)&&close>0?close:null,source:'腾讯行情',volumeUnit:'手',receivedAt:new Date().toISOString()};
}
async function intraday({code}={}){
 if(!/^(sh|sz|bj)\d{6}$/.test(code||''))throw Error('请选择有效的证券');
 const old=cache.get(code);if(old&&Date.now()-old.time<15000)return old.value;
 if(pending.has(code))return pending.get(code);
 const request=(async()=>{const response=await fetch('https://web.ifzq.gtimg.cn/appstock/app/minute/query?code='+code,{signal:AbortSignal.timeout(8000),redirect:'error'});if(!response.ok)throw Error('分时行情服务返回 '+response.status);const value=normalizeIntraday(await response.json(),code);if(cache.size>=40)cache.delete(cache.keys().next().value);cache.set(code,{time:Date.now(),value});return value;})();
 pending.set(code,request);try{return await request;}finally{pending.delete(code);}
}
module.exports={intraday,normalizeIntraday};
