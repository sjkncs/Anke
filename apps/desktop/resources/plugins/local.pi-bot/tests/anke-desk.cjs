'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {Team}=require('../src/team');
const {installTools}=require('../src/tools');
const {validateDesk,deskDashboard}=require('../src/anke-desk');
const {EventEmitter}=require('node:events');
async function fixture(ctx){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'anke-desk-'));
  const team=new Team({});team.data=dir;team.file=path.join(dir,'team.json');team.queueCheckpoint=()=>{};
  const bot={id:'admin',name:'Anke',role:'Administrator',modelKey:'',sessions:{private:'s1'}};
  team.state.bots=[bot,{id:'private',name:'Private',role:'Worker',modelKey:'',private:true,workDir:path.join(dir,'private'),sessions:{private:'s2'}}];
  team.state.rooms=[];team.state.views=[];team.vault={clean:x=>x,redact:x=>x,cleanState:x=>structuredClone(x)};
  const tools=new Map();team.pi={agent:{registerTool:async tool=>tools.set(tool.name,tool)}};await installTools(team);
  ctx.after(async()=>{await team.writes;await fs.rm(dir,{recursive:true,force:true});});
  const call=(args,sessionId='s1')=>tools.get('anke_service_desk').execute(args,{sessionId});
  return {team,call,tools,dir};
}
const request={action:'create',service:'repair',requestId:'repair-1',title:'空调报修',source:'用户提供的故障照片',dueAt:'2026-11-10T12:00:00+08:00',location:'A栋101'};
test('native user flow creates, retries, progresses and displays sourced service records',async ctx=>{
  const {team,call,tools}=await fixture(ctx);
  const first=await call(request);assert.equal(first.record.externalStatus,'not_submitted');
  assert.equal((await call(request)).duplicate,true);
  await assert.rejects(call({...request,title:'different'}),/different content/);
  await call({action:'update',id:first.record.id,status:'in_progress',note:'已整理报修材料，尚未提交物业'});
  const result=await tools.get('anke_service_dashboard').execute({},{sessionId:'s1'});assert.equal(JSON.parse(result).status,'displayed');
  assert.equal(team.state.views.length,1);assert.equal(team.state.views[0].title,'安客服务台');
  assert.equal((await call({action:'list'})).items[0].status,'in_progress');
  await assert.rejects(call({action:'update',id:first.record.id,status:'closed',note:'skip'}),/transition/);
  await call({action:'update',id:first.record.id,status:'resolved',note:'用户提供维修结果'});
  await call({action:'update',id:first.record.id,status:'closed',note:'用户核验完成'});
  const saved=JSON.parse(await fs.readFile(team.file,'utf8'));validateDesk(saved);assert.equal(saved.ankeDesk.items[0].history.length,4);
  assert.equal(deskDashboard(team,{bot:team.state.bots[0]}).active,0);
});
test('private and group scopes cannot read or modify each other',async ctx=>{
  const {team,call}=await fixture(ctx);const record=(await call(request,'s2')).record;
  assert.equal((await call({action:'list'})).items.length,0);
  await assert.rejects(call({action:'update',id:record.id,status:'in_progress',note:'x'}),/not found/);
  team.state.rooms.push({id:'r',members:['admin'],adminId:'admin',workEpoch:0});team.state.bots[0].sessions.r='group-session';
  assert.equal((await call({action:'list'},'group-session')).items.length,0);
});
test('concurrent writes survive, disk failure rolls back and billing requires a receipt',async ctx=>{
  const {team,call}=await fixture(ctx);
  await Promise.all([call(request),call({...request,requestId:'bill-1',service:'billing',title:'物业费'})]);
  assert.equal(team.state.ankeDesk.items.length,2);
  const bill=team.state.ankeDesk.items.find(i=>i.service==='billing');
  await call({action:'update',id:bill.id,status:'in_progress',note:'核对账单'});
  await assert.rejects(call({action:'update',id:bill.id,status:'resolved',note:'paid'}),/receipt/);
  assert.equal(team.state.ankeDesk.items.find(i=>i.id===bill.id).status,'in_progress');
  const before=JSON.stringify(team.state.ankeDesk);team.store={write:async()=>{throw Error('DISK_FAILURE');}};
  await assert.rejects(call({...request,requestId:'failed'}),/DISK_FAILURE/);assert.equal(JSON.stringify(team.state.ankeDesk),before);
});
test('device records expose stale data and reject older or future observations',async ctx=>{
  const {team,call}=await fixture(ctx);
  const device={action:'device',deviceKey:'meter-1',title:'电表',source:'用户抄录',location:'A栋101',observedAt:'2026-11-10T10:00:00+08:00',reportedStatus:'offline'};
  await call(device);assert.equal(deskDashboard(team,{bot:team.state.bots[0]},Date.parse('2026-11-10T10:20:00+08:00')).devices[0].freshness,'stale');
  await assert.rejects(call({...device,observedAt:'2026-11-09T10:00:00+08:00'}),/Older/);
  await assert.rejects(call({...device,observedAt:'2099-11-10T10:00:00+08:00'}),/future/);
});
test('actual Team restart preserves ledger without creating service activity',async ctx=>{
  const {team,call,dir}=await fixture(ctx);await call(request);
  const pi={__testHost:true,plugin:{getDataPath:async()=>dir},events:new EventEmitter(),models:{list:async()=>[]},desktop:{listOperations:async()=>[]}};
  const loaded=new Team(pi,{pollMs:60000,memoryReview:false});
  try{await loaded.load();assert.equal(loaded.state.ankeDesk.items.length,1);assert.equal(loaded.state.ankeDesk.items[0].title,'空调报修');assert.equal(loaded.state.jobs.length,0);}finally{await loaded.close();}
});
