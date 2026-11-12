const fs = require('node:fs');
const path = require('node:path');
const districts = ['南山','福田','罗湖','盐田','宝安','龙华','龙岗','坪山','光明','大鹏新区'];
function median(values) {
  values=values.filter(Number.isFinite);
  if (!values.length) return null;
  const sorted = [...values].sort((a,b)=>a-b), mid = Math.floor(sorted.length/2);
  return sorted.length%2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
}
function query(input = {}, snapshot) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Invalid filters');
  const allowed = ['dataset','district','recordType','lease','query'];
  if(Object.keys(input).some(k=>!allowed.includes(k)))throw Error('Unknown filter');
  if(input.dataset && !['imported','demo'].includes(input.dataset))throw Error('Invalid dataset');
  if(input.recordType && !['挂牌','成交'].includes(input.recordType))throw Error('Invalid record type');
  if(input.lease && !['整租','合租'].includes(input.lease))throw Error('Invalid lease');
  if(input.district && !districts.includes(input.district))throw Error('Invalid district');
  if(input.query !== undefined && (typeof input.query!=='string'||input.query.length>200))throw Error('Invalid search');
  const data = snapshot || JSON.parse(fs.readFileSync(path.join(__dirname,'data/records.json'),'utf8'));
  const dataset = input.dataset || 'imported';
  const rows = data.records.filter(r=>r.dataset===dataset && (!input.district||r.district===input.district)
    && (!input.recordType||r.record_type===input.recordType) && (!input.lease||r.lease===input.lease)
    && (!input.query||`${r.project} ${r.address}`.includes(input.query)));
  const summarize = group => [...new Set(rows.map(r=>r[group]))].sort().map(name=>{
    const groupRows=rows.filter(r=>r[group]===name);
    return {name,count:groupRows.length,unitRentMedian:median(groupRows.map(unitRent))};
  });
  const strata = [...new Set(rows.map(r=>`${r.record_type}/${r.lease}`))].sort().map(name=>{
    const selected=rows.filter(r=>`${r.record_type}/${r.lease}`===name);
    return {name,count:selected.length,unitRentMedian:median(selected.map(unitRent))};
  });
  const homogeneous = strata.length<=1;
  return {city:'深圳',dataset,label:dataset==='demo'?'演示数据':'导入数据',updatedAt:data.updatedAt,
    count:rows.length,projectCount:new Set(rows.map(r=>r.project)).size,coveredDistricts:new Set(rows.filter(r=>districts.includes(r.district)).map(r=>r.district)).size,
    dateStart:rows.length?rows.map(r=>r.date).sort()[0]:null,dateEnd:rows.length?rows.map(r=>r.date).sort().at(-1):null,
    unit:'元/平方米/月',unitRentMedian:homogeneous?median(rows.map(unitRent)):null,
    strata,districts:homogeneous?summarize('district'):[],projects:homogeneous?summarize('project'):[],
    rows:rows.slice(0,500),rowsTruncated:rows.length>500};
}
function unitRent(row){return Number.isFinite(row.rent)&&row.rent>0&&Number.isFinite(row.area)&&row.area>0?row.rent/row.area:null;}
module.exports = {query,median,districts};
