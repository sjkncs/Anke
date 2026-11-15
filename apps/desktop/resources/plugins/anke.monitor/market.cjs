const ENDPOINT='https://niulai-11507.app.workbuddy.host/api/market?sharecode=QUGCE5XNLV';
let cached,inFlight;
function normalize(data){
 if(data?.ok!==true||!Array.isArray(data.rows)||data.rows.length>20000)throw Error('行情返回格式无效');
 const number=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
 const rows=data.rows.filter(r=>typeof r.c==='string'&&typeof r.n==='string').map(r=>({code:r.c.slice(0,20),name:r.n.slice(0,80),board:String(r.boardZh||r.mk||'').slice(0,30),price:number(r.price),pct:number(r.pct),amount:number(r.amt),volume:number(r.vol),turnover:number(r.turn),pe:number(r.pe),pb:number(r.pb),open:number(r.open),high:number(r.high),low:number(r.low),suspended:r.suspended===true,source:String(r.src||'').slice(0,40)}));
 const originals=new Map(data.rows.map(row=>[row.c,row]));
 for(const row of rows){const raw=originals.get(row.code)||{};Object.assign(row,{previousClose:number(raw.pre),marketCap:number(raw.mcap),floatCap:number(raw.floatCap),volumeRatio:number(raw.vr),industry:typeof raw.ind==='string'?raw.ind.slice(0,80):'',upLimit:number(raw.upLimit),downLimit:number(raw.dnLimit),atUp:typeof raw.atUp==='boolean'?raw.atUp:null,atDown:typeof raw.atDn==='boolean'?raw.atDn:null});}
 return {rows,fetchedAt:String(data.fetchedAt||''),receivedAt:new Date().toISOString(),coverage:data.coverage?{got:number(data.coverage.got),total:number(data.coverage.total),missing:number(data.coverage.missing)}:null,source:'牛来 · '+String(data.src||'').slice(0,60)};
}
async function market(){
 if(cached&&Date.now()-cached.time<30000)return cached.data;
 if(inFlight)return inFlight;
 inFlight=(async()=>{const response=await fetch(ENDPOINT,{signal:AbortSignal.timeout(25000),redirect:'error'});if(!response.ok)throw Error('行情服务返回 '+response.status);const data=normalize(await response.json());cached={time:Date.now(),data};return data;})();
 try{return await inFlight;}finally{inFlight=null;}
}
module.exports={market,normalize};
