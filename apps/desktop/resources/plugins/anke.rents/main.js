const {query} = require('./query.cjs');
const {knowledge} = require('./knowledge.cjs');
const {environment} = require('./environment.cjs');
const {events,createDelivery,validateEventUrl}=require('./events.cjs');
const manifest = require('./manifest.json');
const {housing}=require('./housing.cjs');
const {findesk}=require('./findesk.cjs');
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
  for(const tool of manifest.contributes.agentTools.slice(4))await pi.agent.registerTool({...tool,execute:async args=>tool.name==='FindeskCapabilities'?findesk(args):housing(args,'agent')});
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
  if(channel==='rents.findesk')return findesk(payload);
  if(channel==='rents.locate')return require('./map.cjs').locate(payload);
  if(channel==='rents.saveAddress')return require('./geography.cjs').save(payload);
  if(channel==='rents.street')return require('./map.cjs').street(payload);
  if(channel==='rents.analyze')return require('./analysis.cjs').analyze(pi,payload);
  if(channel==='rents.openMonitor')return pi.shell.openExternal('http://127.0.0.1:47831/housing_monitor/');
  if(channel==='rents.housing')return housing(payload);
  if(channel==='rents.events')return events(payload);
  if(channel==='rents.enableEventNotifications') {
    const permission=await pi.ui.requestNotificationPermission();
    await pi.plugin.setSettings({eventSystemNotifications:permission==='granted'});
    return {permission};
  }
  if(channel==='rents.openEvent') {
    return pi.shell.openExternal(validateEventUrl(payload?.url));
  }
  if(channel === 'rents.appearance')return pi.app.getAppearance();
  if(channel === 'rents.module')return activeModule;
  if(channel === 'rents.knowledge')return knowledge(payload);
  if(channel === 'rents.environment')return environment(payload);
  if(channel === 'rents.openMap') {
    return pi.shell.openExternal(require('./map.cjs').validateMapUrl(payload?.url));
  }
  if(channel !== 'rents.query')throw Error('Unsupported rental operation');
  return query(payload);
}
module.exports = {onLoad,onUnload,onPanelInvoke};
