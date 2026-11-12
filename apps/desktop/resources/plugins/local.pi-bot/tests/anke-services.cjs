'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ensureServices,serviceStatus}=require('../src/anke-services');
test('service roster migration preserves users and survives repeated launches and deletion',()=>{
  const original={id:'mine',name:'邮件中心',instructions:'user instructions',chat:[{text:'keep'}]};
  const state={bots:[original],rooms:[{id:'existing',name:'my room'}]};
  assert.equal(ensureServices(state),true);assert.equal(state.bots.length,17);assert.equal(state.rooms.length,4);
  assert.equal(state.bots[0],original);assert.equal(new Set(state.bots.map(b=>b.name)).size,17);
  for(const room of state.rooms.slice(1)){assert.equal(state.bots.find(b=>b.id===room.adminId).role,'Administrator');assert.ok(room.members.includes(room.adminId));assert.ok(room.members.every(id=>state.bots.some(b=>b.id===id)));}
  state.bots.pop();const before=JSON.stringify(state);assert.equal(ensureServices(state),false);assert.equal(JSON.stringify(state),before);
});
test('catalog exposes every service, required connections and honest readiness',()=>{
  const result=serviceStatus();assert.equal(result.services.length,13);
  for(const item of result.services){assert.equal(item.integrationStatus,'not_connected');assert.ok(item.requires);assert.ok(item.localCapability);assert.equal(serviceStatus(item.id).services.length,1);}
  assert.throws(()=>serviceStatus('unknown'));assert.throws(()=>serviceStatus(null));
});
test('native session tool exposes service readiness and rejects foreign sessions',async()=>{
  const {installTools}=require('../src/tools');const tools=new Map();
  const bot={id:'mine',role:'Worker',sessions:{private:'session'}};
  const team={pi:{agent:{registerTool:async tool=>tools.set(tool.name,tool)}},state:{bots:[bot],rooms:[],jobs:[]},vault:{clean:x=>x,redact:x=>x}};
  await installTools(team);
  const tool=tools.get('anke_service_status');assert.ok(tool);
  const result=await tool.execute({service:'iot'},{sessionId:'session'});
  assert.equal(result.services[0].id,'iot');assert.equal(result.services[0].integrationStatus,'not_connected');
  await assert.rejects(tool.execute({},{sessionId:'foreign'}),/sessions only/);
});
