// Standalone service adapter. Electron supplies its own permissioned bridge.
if(!window.pluginBridge){
  let serviceToken=document.querySelector('meta[name="anke-service-token"]')?.content;
  let renewal;
  async function send(input,retry=true){
    const response=await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json','X-Anke-Token':serviceToken},body:JSON.stringify(input)});
    const data=await response.json();
    if(response.status===403&&data.error==='Invalid origin or token'&&retry){
      renewal??=(async()=>{
        const page=await fetch('/workspace/',{cache:'no-store',credentials:'same-origin',redirect:'error'});
        if(!page.ok)throw Error('连接已失效，请刷新页面');
        const token=new DOMParser().parseFromString(await page.text(),'text/html').querySelector('meta[name="anke-service-token"]')?.content;
        if(!token)throw Error('连接已失效，请刷新页面');
        serviceToken=token;
      })().finally(()=>{renewal=null;});
      await renewal;
      return send(input,false);
    }
    if(!response.ok)throw Error(data.error==='Invalid origin or token'?'连接已失效，请刷新页面':data.error);
    return data;
  }
  window.pluginBridge={on(){return()=>{};},async invoke(channel,payload={}){
    if(channel==='rents.appearance')return {base:'light'};
    if(channel==='rents.module')return 'overview';
    if(channel==='rents.openMonitor'){window.open('/housing_monitor/','_blank','noopener');return {opened:true};}
    if(channel==='rents.openMap'){
      const url=new URL(payload.url);if(url.protocol!=='https:'||!['map.baidu.com','api.map.baidu.com'].includes(url.hostname)||url.username||url.password||url.port||(url.hostname==='api.map.baidu.com'&&(url.pathname!=='/marker'||!url.searchParams.has('location')||!url.searchParams.has('title'))))throw Error('Invalid map URL');
      window.open(url.href,'_blank','noopener');return {opened:true};
    }
    if(channel==='rents.enableEventNotifications')return {permission:'denied'};
    if(channel==='rents.openEvent'){
      const url=new URL(payload.url),allowed=url.hostname.endsWith('.sz.gov.cn')||['view.inews.qq.com','news.qq.com','new.qq.com'].includes(url.hostname);
      if(url.protocol!=='https:'||!allowed||url.username||url.password||url.port)throw Error('Invalid event URL');
      const popup=window.open('about:blank','_blank');if(popup)popup.opener=null;
      try{const snapshot=await window.pluginBridge.invoke('rents.events',{includeExpired:true});if(!snapshot.events.some(e=>e.url===url.href))throw Error('Unknown event URL');if(!popup)throw Error('Popup blocked');popup.location.replace(url.href);return {opened:true};}catch(error){popup?.close();throw error;}
    }
    const input=channel==='rents.locate'?{action:'residential_locate',input:payload}:channel==='rents.street'?{action:'residential_street',input:payload}:channel==='rents.housing'?payload:channel==='rents.query'?{action:'market_query',filters:payload}:channel==='rents.events'?{action:'market_events',filters:payload}:null;
    if(channel==='rents.saveAddress')return sendAddress(payload);
    if(!input)throw Error('Unsupported channel');
    return send(input);
  }};
  async function sendAddress(input){return send({action:'market_address_save',input});}
}
