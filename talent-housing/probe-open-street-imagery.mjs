import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {request}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright-core');
const root='C:/Users/Lenovo/Desktop/安客实景采集_20261112/open-street/';
await mkdir(root,{recursive:true});
const api=await request.newContext({timeout:25000});
const queries=[
 {id:'nanshan-university-area',bbox:[113.94,22.56,114.03,22.64],note:'Broad search region, not a confirmed community boundary'},
 {id:'antuoshan-area',bbox:[113.97,22.54,114.04,22.59],note:'Broad search region, not a confirmed community boundary'},
 {id:'shenzhen-broad',bbox:[113.75,22.4,114.65,22.9],note:'Broad Shenzhen region; returned images must be independently located'}
];
const results=[];
try{
 for(const query of queries){
  const url='https://api.panoramax.xyz/api/search?bbox='+query.bbox.join(',')+'&limit=20';
  const record={...query,url,accessedAt:new Date().toISOString(),state:'pending',coordinateSystem:'WGS84',imagesDownloaded:0};
  try{
   const response=await api.get(url);record.status=response.status();
   if(!response.ok())throw Error('HTTP '+response.status());
   const data=await response.json();
   // This endpoint omits type for empty results; retain raw evidence.
   if((data.type&&data.type!=='FeatureCollection')||!Array.isArray(data.features))throw Error('Unexpected STAC response');
   await writeFile(root+query.id+'.geojson',JSON.stringify(data,null,2),'utf8');
   record.returned=data.features.length;record.state=data.features.length?'candidates_found':'no_results';
   record.candidates=data.features.map(f=>({id:f.id,collection:f.collection,geometry:f.geometry,datetime:f.properties?.datetime,license:f.properties?.license||null,assets:f.assets,links:f.links}));
   record.hasMore=data.links?.some(l=>l.rel==='next')||false;
  }catch(error){record.state='failed';record.error=error.message;}
  results.push(record);await writeFile(root+'coverage-check.json',JSON.stringify(results,null,2),'utf8');
  console.log(query.id+': '+record.state+' '+(record.returned??''));
 }
}finally{await api.dispose();}
