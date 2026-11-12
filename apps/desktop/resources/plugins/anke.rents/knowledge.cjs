const fs=require('node:fs');
const path=require('node:path');
const allowed=new Set(['action','grain','level','year','quarter','district','community','lease','recordType','query','limit']);
function knowledge(input={}, supplied) {
  if(!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).some(k=>!allowed.has(k)))throw Error('Invalid knowledge request');
  const {action='coverage',grain='quarter',level='district',year,quarter,district,community,lease,recordType='挂牌',query='',limit=20}=input;
  if(!['coverage','statistics','search','sync_status'].includes(action)||!['year','quarter'].includes(grain)||!['city','district','community'].includes(level))throw Error('Invalid operation');
  if(year!==undefined&&(!Number.isInteger(year)||year<2016||year>2026))throw Error('Invalid year');
  if(quarter!==undefined&&(!Number.isInteger(quarter)||quarter<1||quarter>4))throw Error('Invalid quarter');
  if(!['挂牌','成交'].includes(recordType)||(lease!==undefined&&!['整租','合租','未知'].includes(lease)))throw Error('Invalid rental stratum');
  for(const value of [district,community])if(value!==undefined&&(typeof value!=='string'||!value.trim()||value.length>100))throw Error('Invalid geography');
  if(typeof query!=='string'||query.length>200||!Number.isInteger(limit)||limit<1||limit>100)throw Error('Invalid search');
  if(action==='sync_status') {
    const statusFile=path.join(__dirname,'data/sync-status.json');
    if(!fs.existsSync(statusFile))return {status:'not_configured',message:'平台同步尚未核验'};
    const state=JSON.parse(fs.readFileSync(statusFile,'utf8'));
    return {...state,streaming:false,message:'按来源查看成功时间；暂停或检查时间不表示租金已更新。'};
  }
  const file=path.join(__dirname,'data/knowledge.json');
  if(!supplied&&!fs.existsSync(file))return {status:'not_loaded',message:'租金知识库尚未导入'};
  const data=supplied||JSON.parse(fs.readFileSync(file,'utf8'));
  if(data.schemaVersion!==1)throw Error('Unsupported knowledge snapshot');
  const base={city:data.city,generatedAt:data.generatedAt,unit:data.unit,metricBasis:data.metricBasis,counts:data.counts};
  if(action==='coverage') {
    const periods=[];
    for(let y=2016;y<=2026;y++)for(let q=1;q<=4;q++) {
      const period=`${y}-${String(q*3-2).padStart(2,'0')}-01`;
      const rows=data.stats.filter(s=>s.grain==='quarter'&&s.level==='city'&&s.period_start===period);
      periods.push({year:y,quarter:q,observations:rows.reduce((n,s)=>n+s.observations,0),status:rows.length?'observed_dates_only':'no_observations'});
    }
    return {...base,historicalRange:data.historicalRange,currentYear:data.currentYear,periods,sources:data.sources};
  }
  let rows=data.stats.filter(s=>s.grain===grain&&s.level===level&&s.record_type===recordType&&(!lease||s.lease===lease)&&
    (!year||Number(s.period_start.slice(0,4))===year)&&(!quarter||Math.floor((Number(s.period_start.slice(5,7))-1)/3)+1===quarter)&&
    (!district||s.geography===district||s.geography.startsWith(`${district}:`))&&(!community||s.geography.endsWith(`:${community}`)));
  if(action==='search') {
    const text=query.trim().toLowerCase();
    if(!text)throw Error('Search text is required');
    const tokens=[...new Set(text.match(/[a-z0-9]+|[\u4e00-\u9fff]{1,}/g)||[])].flatMap(t=>/[\u4e00-\u9fff]/.test(t)&&t.length>2?Array.from({length:t.length-1},(_,i)=>t.slice(i,i+2)):[t]);
    const selectedIds=new Set(rows.map(s=>`derived:${s.grain}:${s.level}:${s.period_start}:${s.geography}:${s.record_type}:${s.lease}`));
    const docs=data.documents.filter(d=>!d.id.startsWith('derived:')||selectedIds.has(d.id)).map(d=>({...d,score:tokens.reduce((n,t)=>n+(d.title+' '+d.body).toLowerCase().includes(t),0)}))
      .filter(d=>d.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
    return {...base,retrieval:'Chinese bigram lexical retrieval',results:docs.slice(0,limit),total:docs.length,
      citations:data.citations.filter(c=>docs.slice(0,limit).some(d=>d.source_id===c.source_id&&
        (!d.metadata?.record_type||d.metadata.record_type===c.record_type)&&(!d.metadata?.lease||d.metadata.lease===c.lease)&&
        (!d.metadata?.first_observed||c.observed_on>=d.metadata.first_observed&&c.observed_on<=d.metadata.last_observed)&&
        (!d.metadata?.geography||d.metadata.geography==='深圳市'||d.metadata.geography===c.district||d.metadata.geography===`${c.district}:${c.community}`))).slice(0,20)};
  }
  const result=rows.slice(0,limit);
  return {...base,results:result,total:rows.length,truncated:rows.length>limit,
    citations:data.citations.filter(c=>result.some(s=>s.source_ids.includes(c.source_id)&&c.record_type===s.record_type&&c.lease===s.lease&&c.observed_on>=s.first_observed&&c.observed_on<=s.last_observed&&
      (level==='city'||s.geography===c.district||s.geography===`${c.district}:${c.community}`))).slice(0,20),
    status:rows.length?'observed_dates_only':'no_observations'};
}
module.exports={knowledge};
