'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {Team}=require('../src/team'),{Vault}=require('../src/vault'),{Handoffs}=require('../src/handoffs'),{installTools}=require('../src/tools');
async function fixture(ctx){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'anke-color-')),tools=new Map();
 const t=new Team({__testHost:true,agent:{registerTool:async tool=>tools.set(tool.name,tool)}});
 t.data=dir;t.file=path.join(dir,'team.json');t.queueCheckpoint=()=>{};t.mentions=await import('../src/upstream/mentions.mjs');
 t.state={version:1,bots:[{id:'admin',name:'Anke Bot',role:'Administrator',sessions:{private:'sa'},modelKey:''},{id:'worker',name:'通勤与居住',role:'Worker',instructions:'Preserve duties',modelKey:'configured/model',sessions:{private:'sw'},color:'#999999'}],rooms:[],jobs:[],questions:[],archives:[],schedules:[],prefs:{}};
 t.vault=new Vault({state:t.state,backups:{root:dir},bot:id=>t.bot(id),save:()=>t.save()});t.handoffs=new Handoffs(t);
 await installTools(t);ctx.after(async()=>{await t.writes;await fs.rm(dir,{recursive:true,force:true});});
 return {t,call:(args,sessionId='sa')=>tools.get('update_bot').execute(args,{sessionId}),read:async()=>JSON.parse(await fs.readFile(t.file,'utf8')).bots.find(b=>b.id==='worker')};
}
test('color-only persisted update preserves name, model, instructions and sessions',async ctx=>{
 const {t,read}=await fixture(ctx);await t.upsertBot({id:'worker',color:'#22C55E'});
 const bot=await read();assert.equal(bot.color,'#22C55E');assert.equal(bot.name,'通勤与居住');assert.equal(bot.modelKey,'configured/model');assert.equal(bot.instructions,'Preserve duties');assert.equal(bot.sessions.private,'sw');
});
test('registered tool ignores empty optional rename when updating color and returns stored receipt',async ctx=>{
 const {call,read}=await fixture(ctx);const receipt=JSON.parse(await call({bot:'通勤与居住',name:'',color:'#22C55E'}));
 assert.equal(receipt.name,'通勤与居住');assert.equal(receipt.color,'#22C55E');assert.equal((await read()).color,receipt.color);assert.equal(receipt.updated,true);
});
test('worker can recolor itself; explicit empty rename through settings remains invalid',async ctx=>{
 const {t,call,read}=await fixture(ctx);await call({color:'#22C55E'},'sw');await assert.rejects(t.patchSettings('bot',{id:'worker',patch:{name:''}}),/needs a name/);assert.equal((await read()).name,'通勤与居住');
});
test('failed persistence returns an error and restores the previous color',async ctx=>{
 const {t,call,read}=await fixture(ctx);await t.save();
 t.store={write:async()=>{throw Error('DISK_FAILURE');}};
 await assert.rejects(call({bot:'通勤与居住',color:'#22C55E'}),/DISK_FAILURE/);
 assert.equal(t.bot('worker').color,'#999999');assert.equal((await read()).color,'#999999');
});
test('queued partial updates retain the newest name and unrelated settings',async ctx=>{
 const {t,read}=await fixture(ctx);
 await Promise.all([t.upsertBot({id:'worker',name:'居住与通勤'}),t.upsertBot({id:'worker',color:'#22C55E'})]);
 const bot=await read();assert.equal(bot.name,'居住与通勤');assert.equal(bot.color,'#22C55E');assert.equal(bot.sessions.private,'sw');
});
