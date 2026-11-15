const fs=require('node:fs');
const path=require('node:path');
const file=path.join(__dirname,'data/events.json');
function events(input={}) {
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['query','district','includeExpired'].includes(k)))throw Error('Invalid event query');
  const {query='',district='',includeExpired=false}=input;
  if(typeof query!=='string'||query.length>200||typeof district!=='string'||district.length>30||typeof includeExpired!=='boolean')throw Error('Invalid event filter');
  if(!fs.existsSync(file))return {schemaVersion:1,events:[],sources:[],status:'not_loaded'};
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  if(data.schemaVersion!==1||!Array.isArray(data.events))throw Error('Unsupported event snapshot');
  return {...data,events:data.events.filter(e=>(includeExpired||e.status!=='expired')&&(!district||e.districts.includes(district.replace(/区$/,'')))&&(!query||[e.title,e.body,...e.places].join(' ').includes(query)))};
}
// Delivery state uses plugin-private settings and is independent of source collection.
function createDelivery(pi) {
  let busy=false;
  return async()=>{
    if(busy)return; busy=true;
    try{
      const data=events();
      if(data.status==='not_loaded')return;
      const settings=await pi.plugin.getSettings();
      const seen=settings.eventDelivery||{};
      const pending=data.events.filter(e=>seen[e.id]!==e.version);
      if(!pending.length)return;
      const title=`深圳租金动态 · ${pending.length}项新增或更新`;
      const body=pending.slice(0,3).map(e=>e.title).join('\n');
      try{await pi.ui.notify({title,body});}
      catch(error){
        if(error?.code!=='PERMISSION_DENIED')throw error;
        await pi.ui.showToast(`${title}\n${body}`,'info');
      }
      let native={shown:false,permission:'unknown'};
      if(settings.eventSystemNotifications===true)native=await pi.ui.showNativeNotification({title,body});
      for(const e of pending)seen[e.id]=e.version;
      await pi.plugin.setSettings({eventDelivery:seen,eventLastDelivery:{at:new Date().toISOString(),count:pending.length,native}});
    }finally{busy=false;}
  };
}
function validateEventUrl(value,snapshot=events({includeExpired:true})) {
  const url=new URL(value);
  const allowed=url.hostname.endsWith('.sz.gov.cn')||['view.inews.qq.com','news.qq.com','new.qq.com'].includes(url.hostname);
  if(url.protocol!=='https:'||!allowed||url.username||url.password||url.port||!snapshot.events.some(e=>e.url===url.href))throw Error('Invalid event URL');
  return url.href;
}
module.exports={events,createDelivery,validateEventUrl};
