'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ensureServices,serviceStatus}=require('../src/anke-services');
test('service roster migration preserves users and survives repeated launches and deletion',()=>{
  const original={id:'mine',name:'邮件中心',instructions:'user instructions',chat:[{text:'keep'}]};
  const state={bots:[original],rooms:[{id:'existing',name:'my room'}]};
  assert.equal(ensureServices(state),true);assert.equal(state.bots.length,31);assert.equal(state.rooms.length,4);
  assert.equal(state.bots[0],original);assert.equal(new Set(state.bots.map(b=>b.name)).size,31);
  for(const room of state.rooms.slice(1)){assert.equal(state.bots.find(b=>b.id===room.adminId).role,'Administrator');assert.ok(room.members.includes(room.adminId));assert.ok(room.members.every(id=>state.bots.some(b=>b.id===id)));}
  state.bots.pop();const before=JSON.stringify(state);assert.equal(ensureServices(state),false);assert.equal(JSON.stringify(state),before);
});
test('catalog exposes every service, required connections and honest readiness',()=>{
  const result=serviceStatus();assert.equal(result.services.length,27);
  for(const item of result.services){assert.equal(item.integrationStatus,'not_connected');assert.ok(item.requires);assert.ok(item.localCapability);assert.equal(serviceStatus(item.id).services.length,1);}
  assert.throws(()=>serviceStatus('unknown'));assert.throws(()=>serviceStatus(null));
});
test('existing roster adds wealth and career once and preserves user changes',()=>{
  const state={bots:[],rooms:[]};ensureServices(state);
  const added=state.bots.filter(b=>['wealth','career'].includes(b.ankeServicePreset));
  state.bots=state.bots.filter(b=>!added.includes(b));
  for(const room of state.rooms)room.members=room.members.filter(id=>!added.some(b=>b.id===id));
  state.ankeServicesVersion=1;state.bots[0].instructions='custom';const first=state.bots[0];
  assert.equal(ensureServices(state),true);assert.equal(state.bots[0],first);assert.equal(first.instructions,'custom');
  for(const key of ['wealth','career']){const bot=state.bots.find(b=>b.ankeServicePreset===key);assert.ok(bot);assert.equal(state.rooms.filter(r=>r.members.includes(bot.id)).length,1);}
  const before=JSON.stringify(state);assert.equal(ensureServices(state),false);assert.equal(JSON.stringify(state),before);
});
test('food readiness reflects scoped configured MCP without claiming connectivity',()=>{
  const state={bots:[{id:'food',ankeServicePreset:'food'},{id:'other',ankeServicePreset:'education'}],botConnectors:[{id:'luckin',name:'瑞幸咖啡',enabled:true,botIds:['food']}]};
  assert.equal(serviceStatus('food',state).services[0].integrationStatus,'configured');
  assert.equal(serviceStatus('education',state).services[0].integrationStatus,'not_connected');
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
