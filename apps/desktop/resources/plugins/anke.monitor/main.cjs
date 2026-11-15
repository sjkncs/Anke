const {market}=require('./market.cjs');
const {history}=require('./history.cjs');
const {intraday}=require('./intraday.cjs');
let tab='wealth';
async function onRendererCall(method,args={}){if(method!=='monitor.open')throw Error('Unknown monitor method');tab=args.tab==='housing'?'housing':'wealth';await pi.ui.openPanel({title:'Anke 监测'});return {ok:true};}
async function onLoad(){await pi.commands.register({id:'anke.monitor.open',title:'Anke 监测 · 财富与住房',run:()=>pi.ui.openPanel({title:'Anke 监测'})});}
async function onUnload(){await pi.commands.unregister('anke.monitor.open');}
async function onPanelInvoke(channel,args={}){
 if(channel==='monitor.state')return {tab};
 if(channel==='monitor.market')return market();
 if(channel==='monitor.history')return history(args);
 if(channel==='monitor.intraday')return intraday(args);
 if(channel==='monitor.housing'){
  for(const port of [47831,47834])try{const response=await fetch(`http://127.0.0.1:${port}/housing_monitor/`,{signal:AbortSignal.timeout(2500)});if(response.ok&&(await response.text()).includes('mapCanvas'))return {url:`http://127.0.0.1:${port}/housing_monitor/`};}catch{}
  throw Error('住房监测服务尚未启动');
 }
 throw Error('Unsupported monitor operation');
}
module.exports={onLoad,onUnload,onPanelInvoke,onRendererCall};
