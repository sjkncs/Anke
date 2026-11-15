const cache=new Map();
function request(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid residential search');
 const project=typeof input.project==='string'?input.project.trim():'';
 if(!project||project.length>200)throw Error('请填写住宅名称');
 for(const k of ['district','address'])if(input[k]!=null&&(typeof input[k]!=='string'||input[k].length>300))throw Error('Invalid residential address');
 return {project,district:input.district||'',address:input.address||''};
}
function marker(project,address,location){
 const {longitude,latitude,crs}=location||{};
 if(!Number.isFinite(longitude)||!Number.isFinite(latitude)||!['BD09','BD09MC','GCJ02','WGS84'].includes(crs))throw Error('Invalid residential coordinates');
 if(crs!=='BD09MC'&&(longitude<113||longitude>115||latitude<22||latitude>24))throw Error('住宅坐标不在深圳');
 if(crs==='BD09MC'&&(longitude<12500000||longitude>12900000||latitude<2400000||latitude>2800000))throw Error('Invalid Shenzhen map coordinates');
 const u=new URL('https://api.map.baidu.com/marker');u.search=new URLSearchParams({location:latitude+','+longitude,title:project,content:address||project,output:'html',coord_type:({BD09:'bd09ll',BD09MC:'bd09mc',GCJ02:'gcj02',WGS84:'wgs84'})[crs],zoom:'19',src:'webapp.anke.housing'});return u.href;
}
function normalize(payload,input){
 const rows=Array.isArray(payload?.content)?payload.content:payload?.content?[payload.content]:[];
 return rows.slice(0,10).flatMap(p=>{
  const admin=p.admin_info||{};if(admin.city_name!=='深圳市'||(input.district&&!admin.area_name?.startsWith(input.district.replace(/区$/,''))))return [];
  const geo=typeof p.geo==='string'?p.geo.split('|')[1]?.split(';')[0]?.split(',').map(Number):[];
  if(!/^[a-f0-9]{24}$/i.test(p.uid||'')||typeof p.name!=='string'||p.name.length>200||geo?.length!==2||!geo.every(Number.isFinite))return [];
  const name=p.name.replace(/\s/g,''),target=input.project.replace(/\s/g,'');if(!name.includes(target)&&!target.includes(name))return [];
  const location={longitude:geo[0],latitude:geo[1],crs:'BD09MC'},address=typeof p.addr==='string'?p.addr:'';
  try{marker(p.name,address,location);const url=new URL('https://map.baidu.com/');url.pathname='/poi/'+encodeURIComponent(p.name)+'/'+p.uid+'/@'+location.longitude+','+location.latitude+',19z';return [{id:p.uid,project:p.name,address,district:admin.area_name,location,mapUrl:url.href,exact:name===target,source:'百度地图地点检索'}];}catch{return [];}
 }).sort((a,b)=>Number(b.exact)-Number(a.exact));
}
async function json(url){const r=await fetch(url,{signal:AbortSignal.timeout(8000),redirect:'error'});if(!r.ok)throw Error('住宅检索暂不可用');const body=await r.text();if(body.length>2500000)throw Error('Residential response too large');return JSON.parse(body);}
async function locate(input){
 const args=request(input);
 if(input.location){const mapUrl=marker(args.project,args.address,input.location);return {results:[{...args,id:'supplied',location:input.location,mapUrl,exact:true,source:'房源坐标'}],selected:'supplied'};}
 const key=JSON.stringify(args),old=cache.get(key);if(old&&Date.now()-old.time<300000)return old.value;
 const u=new URL('https://map.baidu.com/');u.search=new URLSearchParams({qt:'s',wd:['深圳',args.district,args.project,args.address].filter(Boolean).join(' '),c:'340',rn:'10',output:'json'});
 const results=normalize(await json(u),args),exact=results.filter(r=>r.exact),value={results,selected:exact.length===1?exact[0].id:results.length===1?results[0].id:null};
 if(cache.size>=80)cache.delete(cache.keys().next().value);cache.set(key,{time:Date.now(),value});return value;
}
async function street(input){
 const args=request(input),location=input.location;marker(args.project,args.address,location);
 if(location.crs!=='BD09MC')throw Error('请先检索该住宅的街景位置');
 const u=new URL('https://mapsv0.bdimg.com/');u.search=new URLSearchParams({qt:'qsdata',x:String(location.longitude),y:String(location.latitude),mode:'day'});
 const d=await json(u),p=d.content;
 if(d.result?.error!==0||!p||!/^\w{10,100}$/.test(p.id||''))throw Error('该住宅附近暂无可用街景');
 const x=Number(p.x)/100,y=Number(p.y)/100;if(!Number.isFinite(x)||!Number.isFinite(y)||Math.hypot(x-location.longitude,y-location.latitude)>500)throw Error('住宅附近 500 米内暂无街景');
 const url=new URL('https://map.baidu.com/');url.hash=new URLSearchParams({panoid:p.id,pid:p.id,panotype:'street',heading:'0',pitch:'0',l:'19',tn:'B_NORMAL_MAP',sc:'0',newmap:'1',shareurl:'1'}).toString();
 return {url:url.href,project:args.project,road:typeof p.RoadName==='string'?p.RoadName:'',source:'百度地图全景'};
}
function validateMapUrl(raw){const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port||!['map.baidu.com','api.map.baidu.com'].includes(u.hostname))throw Error('Invalid map URL');if(u.hostname==='api.map.baidu.com'&&(u.pathname!=='/marker'||!u.searchParams.has('location')||!u.searchParams.has('title')))throw Error('Invalid residential marker');return u.href;}
module.exports={locate,street,marker,normalize,validateMapUrl};
