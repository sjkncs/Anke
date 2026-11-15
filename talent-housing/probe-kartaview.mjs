import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {request}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright-core');
const api=await request.newContext({timeout:20000});
const results=[];
try{
 for(const query of [{id:'university-area',lat:22.59,lng:113.97,radius:2000},{id:'antuoshan-area',lat:22.565,lng:114.005,radius:2000}]){
  const record={...query,locationMeaning:'Approximate search center; not a measured community coordinate',url:'https://api.openstreetcam.org/1.0/list/nearby-photos/',accessedAt:new Date().toISOString(),state:'pending'};
  try{
   const response=await api.post(record.url,{form:{lat:query.lat,lng:query.lng,radius:query.radius}});
   record.httpStatus=response.status();const raw=await response.text();
   await writeFile('C:/Users/Lenovo/Desktop/安客实景采集_20261112/open-street/kartaview-'+query.id+'-response.txt',raw,'utf8');
   if(!response.ok())throw Error('HTTP '+response.status());
   const data=JSON.parse(raw);record.apiStatus=data.status;
   if(Number(data.status?.apiCode)!==600)throw Error('API did not return success code 600');
   record.state='response_received';record.resultCount=Array.isArray(data.result?.data)?data.result.data.length:null;
  }catch(error){record.state='unavailable';record.error=error.message;}
  results.push(record);console.log(record.id+': '+record.state);
  await writeFile('C:/Users/Lenovo/Desktop/安客实景采集_20261112/open-street/kartaview-check.json',JSON.stringify(results,null,2),'utf8');
 }
}finally{await api.dispose();}
