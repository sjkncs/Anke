const {median}=require('./query.cjs');
function unit(row){return Number.isFinite(row.rent)&&row.rent>0&&Number.isFinite(row.area)&&row.area>0?row.rent/row.area:null;}
function rentChange(rows){
 const valid=rows.filter(r=>unit(r)!=null&&/^\d{4}-\d{2}-\d{2}$/.test(r.date||'')&&Number.isFinite(+new Date(r.date))&&new Date(r.date).toISOString().slice(0,10)===r.date);
 if(new Set(valid.map(r=>JSON.stringify([r.record_type,r.lease,r.source||'']))).size!==1)return null;
 const dates=[...new Set(valid.map(r=>r.date))].sort();if(dates.length<2)return null;
 const previousDate=dates.at(-2),date=dates.at(-1),before=valid.filter(r=>r.date===previousDate),after=valid.filter(r=>r.date===date),previous=median(before.map(unit)),current=median(after.map(unit));
 return {date,previousDate,previous,current,amount:current-previous,percent:(current-previous)/previous*100,previousCount:before.length,count:after.length,basis:'同来源同口径最近两期样本中位数'};
}
function series(rows,period){const groups=new Map();for(const row of rows){if(unit(row)==null||!/^\d{4}-\d{2}-\d{2}$/.test(row.date||''))continue;const date=new Date(row.date);if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==row.date)continue;const key=period==='quarter'?row.date.slice(0,4)+'-Q'+(Math.floor(date.getUTCMonth()/3)+1):row.date.slice(0,7);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(unit(row));}return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([date,values])=>({date,value:median(values),count:values.length}));}
function visualData(rows,homogeneous){if(!homogeneous)return {projects:[],months:[],quarters:[],scatter:[]};const groups=new Map();for(const row of rows){const key=JSON.stringify([row.district,row.project]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}const valid=rows.filter(r=>unit(r)!=null);
 return {months:series(rows,'month'),quarters:series(rows,'quarter'),projects:[...groups].map(([key,selected])=>{const [district,name]=JSON.parse(key);return {key,district,name,count:selected.length,unitRentMedian:median(selected.map(unit)),change:rentChange(selected),months:series(selected,'month'),quarters:series(selected,'quarter'),rows:selected.slice(0,100),truncated:selected.length>100};}),scatter:valid.slice(0,2000).map(r=>({project:r.project,district:r.district,area:r.area,rent:r.rent,unitRent:unit(r),date:r.date})),scatterTruncated:valid.length>2000};
}
module.exports={visualData,series,rentChange};
