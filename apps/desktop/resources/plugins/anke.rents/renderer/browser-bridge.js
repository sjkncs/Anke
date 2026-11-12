// Standalone service adapter. Electron supplies its own permissioned bridge.
if(!window.pluginBridge){
  const serviceToken=document.querySelector('meta[name="anke-service-token"]')?.content;
  window.pluginBridge={on(){return()=>{};},async invoke(channel,payload={}){
    if(channel==='rents.appearance')return {base:'light'};
    if(channel==='rents.module')return 'overview';
    if(channel==='rents.openMap'){
      const url=new URL(payload.url);if(url.protocol!=='https:'||url.hostname!=='map.baidu.com'||url.username||url.password||url.port)throw Error('Invalid map URL');
      window.open(url.href,'_blank','noopener');return {opened:true};
    }
    if(channel==='rents.enableEventNotifications')return {permission:'denied'};
    if(channel==='rents.openEvent'){
      const url=new URL(payload.url);if(url.protocol!=='https:'||!url.hostname.endsWith('.sz.gov.cn')||url.username||url.password||url.port)throw Error('Invalid government URL');
      window.open(url.href,'_blank','noopener');return {opened:true};
    }
    const input=channel==='rents.housing'?payload:channel==='rents.query'?{action:'market_query',filters:payload}:channel==='rents.events'?{action:'market_events',filters:payload}:null;
    if(!input)throw Error('Unsupported channel');
    const response=await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json','X-Anke-Token':serviceToken},body:JSON.stringify(input)});
    const data=await response.json();if(!response.ok)throw Error(data.error);return data;
  }};
}
