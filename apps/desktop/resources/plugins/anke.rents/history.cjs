const fs=require('node:fs'),path=require('node:path');
function history(input={},file=path.join(__dirname,'data/history.sqlite3')){
 const allowed=['dataset','district','query','year','limit','offset'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!allowed.includes(k)))throw Error('Invalid historical query');
 const {dataset,query='',district='',year,limit=50,offset=0}=input;
 if(!['history_sales','reference_202608'].includes(dataset)||typeof query!=='string'||query.length>200||typeof district!=='string'||district.length>20||!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0||offset>200000)throw Error('Invalid historical filters');
 if(year!==undefined&&(!Number.isInteger(year)||year<2023||year>2026))throw Error('Historical sales year must be 2023-2026');
 if(dataset==='reference_202608'&&year!==undefined)throw Error('Reference month is 2026-08');
 const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(file,{readOnly:true});
 try{
  const sales=dataset==='history_sales',conditions=sales?['year BETWEEN 2023 AND 2026']:[],values=[];
  if(district){conditions.push('district = ?');values.push(district);}
  if(query){conditions.push('instr(project, ?) > 0');values.push(query);}
  if(year!==undefined){conditions.push('year = ?');values.push(year);}
  const table=sales?'sales':'reference',where=conditions.length?' WHERE '+conditions.join(' AND '):'';
  const count=db.prepare(`SELECT count(*) AS count FROM ${table}${where}`).get(...values).count;
  const rows=db.prepare(`SELECT * FROM ${table}${where} ORDER BY ${sales?'date DESC, id':'district, project, id'} LIMIT ? OFFSET ?`).all(...values,limit,offset).map(r=>({...r,fields:JSON.parse(r.fields)}));
  const coverageFile=path.join(path.dirname(file),'field-coverage.json');
  const coverage=fs.existsSync(coverageFile)?JSON.parse(fs.readFileSync(coverageFile,'utf8')):null;
  const fieldCoverage=coverage?{scope:'whole_dataset_before_query_filters',...(sales?coverage.sales2023To2026:coverage.communityReference)}:null;
  return {dataset,recordType:sales?'二手房买卖成交':'小区历史参考',priceUnit:sales?'总价万元；单价元/平方米':'小区均价元/平方米，非月租金',referenceMonth:sales?null:'2026-08',count,limit,offset,hasMore:offset+rows.length<count,rows,missingYears:sales?[2025,2026]:[],coordinateCRS:sales?'BD09_source_declared':'WGS84_source_declared_not_verified',fieldCoverage,trainingExecuted:false};
 }finally{db.close();}
}
module.exports={history};
