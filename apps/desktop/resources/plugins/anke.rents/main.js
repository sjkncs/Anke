const {query} = require('./query.cjs');
const {knowledge} = require('./knowledge.cjs');
const {environment} = require('./environment.cjs');
const {events,createDelivery}=require('./events.cjs');
const manifest = require('./manifest.json');
const {housing}=require('./housing.cjs');
let activeModule='overview';
let eventTimer;
async function onLoad() {
  await pi.commands.register({id:'anke.rents.open',title:'深圳全市租金',keywords:['深圳','租金','anke'],
    run:async()=>pi.ui.openPanel({title:'深圳租金'})});
  const tool = manifest.contributes.agentTools[0];
  await pi.agent.registerTool({...tool, execute:async args=>query(args)});
  const knowledgeTool = manifest.contributes.agentTools[1];
  await pi.agent.registerTool({...knowledgeTool, execute:async args=>knowledge(args)});
  const environmentTool=manifest.contributes.agentTools[2];
  await pi.agent.registerTool({...environmentTool, execute:async args=>environment(args)});
  await pi.agent.registerTool({...manifest.contributes.agentTools[3],execute:async args=>events(args)});
  for(const tool of manifest.contributes.agentTools.slice(4))await pi.agent.registerTool({...tool,execute:async args=>housing(args,'agent')});
  const deliver=createDelivery(pi);
  eventTimer=setInterval(()=>deliver().catch(error=>console.error('Event notification failed:',error.message)),30000);
  eventTimer.unref?.();
  deliver().catch(error=>console.error('Event notification failed:',error.message));
  for(const id of ['overview','ledger','projects','scenario','map'])await pi.commands.register({id:`anke.rents.${id}`,title:manifest.contributes.commands.find(c=>c.id===`anke.rents.${id}`).title,run:async()=>{activeModule=id;return pi.ui.openPanel({title:'深圳租金'});}});
}
async function onUnload() {
  for(const tool of manifest.contributes.agentTools.slice(4))await pi.agent.unregisterTool(tool.name);
  clearInterval(eventTimer);
  await pi.agent.unregisterTool('ShenzhenRentEvents');
  await pi.commands.unregister('anke.rents.open');
  await pi.agent.unregisterTool('ShenzhenRents');
  await pi.agent.unregisterTool('ShenzhenRentKnowledge');
  await pi.agent.unregisterTool('ResidentialEnvironment');
  for(const id of ['overview','ledger','projects','scenario','map'])await pi.commands.unregister(`anke.rents.${id}`);
}
async function onPanelInvoke(channel, payload) {
  if(channel==='rents.housing')return housing(payload);
  if(channel==='rents.events')return events(payload);
  if(channel==='rents.enableEventNotifications') {
    const permission=await pi.ui.requestNotificationPermission();
    await pi.plugin.setSettings({eventSystemNotifications:permission==='granted'});
    return {permission};
  }
  if(channel==='rents.openEvent') {
    const url=new URL(payload?.url);
    if(url.protocol!=='https:'||!url.hostname.endsWith('.sz.gov.cn')||url.username||url.password||url.port)throw Error('Invalid government URL');
    return pi.shell.openExternal(url.href);
  }
  if(channel === 'rents.appearance')return pi.app.getAppearance();
  if(channel === 'rents.module')return activeModule;
  if(channel === 'rents.knowledge')return knowledge(payload);
  if(channel === 'rents.environment')return environment(payload);
  if(channel === 'rents.openMap') {
    const url = new URL(payload?.url);
    if(url.protocol !== 'https:' || url.hostname !== 'map.baidu.com' || url.username || url.password || url.port)throw Error('Invalid map URL');
    return pi.shell.openExternal(url.href);
  }
  if(channel !== 'rents.query')throw Error('Unsupported rental operation');
  return query(payload);
}
module.exports = {onLoad,onUnload,onPanelInvoke};
