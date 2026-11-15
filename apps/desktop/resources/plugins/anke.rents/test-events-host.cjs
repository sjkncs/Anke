const {test}=require('node:test');
const assert=require('node:assert/strict');
const {fork}=require('node:child_process');
const path=require('node:path');
test('production plugin process registers and invokes event tool and shuts down',async()=>{
 const host=path.resolve(__dirname,'../../../electron/main/plugin-host-process.mjs');
 const child=fork(host,[],{stdio:['ignore','ignore','pipe','ipc']});
 let seq=0,settings={},notified=0;
 const calls=new Map(),tools=new Set();
 child.on('exit',(code)=>{for(const p of calls.values())p.reject(Error(`Plugin host exited: ${code}`));calls.clear();});
 child.on('message',async m=>{
  if(m.t==='res'){const p=calls.get(m.id);if(p){calls.delete(m.id);m.ok?p.resolve(m.value):p.reject(Error(JSON.stringify(m.error)));}}
  if(m.t==='call'){
   let value;
   if(m.api==='agent.registerTool')tools.add(m.args[0].name);
   if(m.api==='plugin.getSettings')value=settings;
   if(m.api==='plugin.setSettings')settings={...settings,...m.args[0]};
   if(m.api==='ui.notify')notified++;
   child.send({t:'res',id:m.id,ok:true,value});
  }
 });
 const invoke=(t,extra)=>new Promise((resolve,reject)=>{const id='test'+(++seq);calls.set(id,{resolve,reject});child.send({t,id,...extra});});
 try{
  const manifest=require('./manifest.json');
  await invoke('init',{pluginId:manifest.id,pluginPath:__dirname,main:manifest.main,manifest});
  assert.ok(tools.has('ShenzhenRentEvents'));
  assert.ok(tools.has('FindeskCapabilities'));
  const fd=await invoke('call',{method:'panel.invoke',payload:{channel:'rents.findesk',payload:{query:'money'}}});
  assert.ok(fd.interfaces.length);assert.equal(fd.authenticatedDataVerified,false);
  const plans=await invoke('call',{method:'panel.invoke',payload:{channel:'rents.findesk',payload:{action:'plans'}}});
  assert.ok(plans.plans.length);assert.equal(plans.accountBalance,null);assert.ok(plans.policyVersion);
  const cookbook=await invoke('call',{method:'panel.invoke',payload:{channel:'rents.findesk',payload:{action:'cookbook',query:'macroSeries'}}});
  assert.equal(cookbook.scenarios.length,1);assert.match(cookbook.scenarios[0].code,/YOUR_EDB_CODE/);assert.equal(cookbook.templatesExecuted,false);
  const d=await invoke('call',{method:'panel.invoke',payload:{channel:'rents.events',payload:{query:'APEC'}}});
  assert.ok(d.events.length);assert.ok(notified<=1);
  await invoke('call',{method:'lifecycle.unload',payload:{}});
 }finally{child.kill();}
});
