'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {operation,botOperation}=require('../src/learning-library'),{harness}=require('./route-harness.cjs'),{ensureServices}=require('../src/anke-services');
test('Obsidian discovery, note search, read boundaries and provider switching',async t=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'anke-library-'));t.after(()=>fs.rm(temp,{recursive:true,force:true}));const vault=path.join(temp,'vault');await fs.mkdir(path.join(vault,'.obsidian'),{recursive:true});await fs.writeFile(path.join(vault,'学习.md'),'# Fixture note');await fs.writeFile(path.join(temp,'outside.md'),'private');await fs.writeFile(path.join(vault,'.obsidian','hidden.md'),'hidden');const registry=path.join(temp,'obsidian.json');await fs.writeFile(registry,JSON.stringify({vaults:{one:{path:vault,open:true}}}));
 const team={state:{bots:[{id:'k',ankeServicePreset:'knowledge'},{id:'c',ankeServicePreset:'cloud'}],botConnectors:[{id:'ima',name:'ima',enabled:true,botIds:['k']},{id:'other',name:'other',enabled:true,botIds:['c']}]},save:async(rollback,prepare)=>prepare(),bridge:{list:async(bot,id)=>({bot,id})}};const run=input=>operation(team,{service:'knowledge',...input},{registry});
 assert.equal((await run({action:'status'})).vault.id,'one');assert.equal((await run({action:'search',query:'学习'})).items.length,1);assert.equal((await run({action:'search'})).items.length,1);assert.equal((await run({action:'read',file:'学习.md'})).text,'# Fixture note');
 assert.equal((await run({action:'search',query:'Fixture'})).items.length,0);const content=await run({action:'search',query:'fixture',mode:'content'});assert.equal(content.items.length,1);assert.match(content.items[0].snippet,/Fixture note/);assert.equal(content.items[0].match,'content');await assert.rejects(run({action:'search',mode:'invalid'}));await assert.rejects(run({action:'read',file:'学习.md',vaultId:'stale'}),/资料库已切换/);await assert.rejects(run({action:'search',vaultId:'stale'}),/资料库已切换/);
 await assert.rejects(run({action:'read',file:'../outside.md'}));await assert.rejects(run({action:'read',file:'.obsidian/hidden.md'}));await assert.rejects(run({action:'configure',provider:'ima',connectorId:'other'}));
 await assert.rejects(run({action:'configure',provider:'obsidian',connectorId:'ima'}));await assert.rejects(run({action:'configure',provider:'ima',vaultId:'one'}));await assert.rejects(run({action:'configure',provider:'ima',connectorId:{id:'ima'}}));
 await fs.writeFile(path.join(vault,'large.md'),Buffer.alloc(512001));await assert.rejects(run({action:'read',file:'large.md'}));
 assert.equal((await run({action:'search',query:'fixture',mode:'content'})).skipped,1);
 try{await fs.symlink(path.join(temp,'outside.md'),path.join(vault,'link.md'));await assert.rejects(run({action:'read',file:'link.md'}));}catch(e){if(!['EPERM','EACCES'].includes(e.code))throw e;}
 await run({action:'configure',provider:'ima',connectorId:'ima'});assert.equal((await run({action:'status'})).status,'configured');assert.deepEqual(await run({action:'tools'}),{bot:'k',id:'ima'});await assert.rejects(run({action:'search'}));
 await assert.rejects(botOperation(team,{service:'knowledge',action:'status'},{bot:team.state.bots[1]}));await assert.rejects(botOperation(team,{service:'knowledge',action:'status'},{bot:team.state.bots[0],room:{id:'r'}}));
 assert.equal((await harness(team).request('team.learning.library',{service:'cloud',action:'status'})).config.provider,'google');
 const prior=JSON.stringify(team.state.ankeLearningConnections);team.save=async(rollback,prepare)=>{prepare();rollback();throw Error('disk');};await assert.rejects(run({action:'configure',provider:'obsidian'}));assert.equal(JSON.stringify(team.state.ankeLearningConnections),prior);
});

test('content retrieval covers notes beyond the former 200 note limit',async t=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'anke-search-'));t.after(()=>fs.rm(temp,{recursive:true,force:true}));await fs.mkdir(path.join(temp,'vault','.obsidian'),{recursive:true});await Promise.all(Array.from({length:205},(_,i)=>fs.writeFile(path.join(temp,'vault',String(i).padStart(3,'0')+'.md'),'keyword')));const registry=path.join(temp,'obsidian.json');await fs.writeFile(registry,JSON.stringify({vaults:{v:{path:path.join(temp,'vault')}}}));const data=await operation({state:{bots:[]}},{service:'knowledge',action:'search',query:'keyword',mode:'content'},{registry});assert.equal(data.notesRead,205);assert.equal(data.truncated,false);assert.equal(data.totalMatches,205);assert.equal(data.items.length,50);assert.equal(data.nextOffset,50);
});
test('content retrieval covers bytes beyond the former 16 MB limit',async t=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'anke-bytes-'));t.after(()=>fs.rm(temp,{recursive:true,force:true}));const vault=path.join(temp,'vault');await fs.mkdir(path.join(vault,'.obsidian'),{recursive:true});const body='keyword'+'.'.repeat(511993);await Promise.all(Array.from({length:35},(_,i)=>fs.writeFile(path.join(vault,String(i).padStart(3,'0')+'.md'),body)));await fs.writeFile(path.join(vault,'zzz-keyword.md'),'small');const registry=path.join(temp,'obsidian.json');await fs.writeFile(registry,JSON.stringify({vaults:{v:{path:vault}}}));const result=await operation({state:{bots:[]}},{service:'knowledge',action:'search',query:'keyword',mode:'content'},{registry});assert.equal(result.truncated,false);assert.equal(result.items.length,36);assert.equal(result.items.at(-1).name,'zzz-keyword');assert.equal(result.skipped,0);
});

test('search finds entries after 5000 and supports later result pages',async t=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'anke-full-vault-'));t.after(()=>fs.rm(temp,{recursive:true,force:true}));
 const vault=path.join(temp,'vault');await fs.mkdir(path.join(vault,'.obsidian'),{recursive:true});
 for(let start=0;start<5010;start+=100)await Promise.all(Array.from({length:Math.min(100,5010-start)},(_,i)=>fs.writeFile(path.join(vault,String(start+i).padStart(5,'0')+'.md'),'body')));
 await fs.writeFile(path.join(vault,'zz-target.md'),'needle-after-limit');
 const registry=path.join(temp,'obsidian.json');await fs.writeFile(registry,JSON.stringify({vaults:{v:{path:vault}}}));const run=input=>operation({state:{bots:[]}},{service:'knowledge',action:'search',...input},{registry});
 const title=await run({query:'zz-target'});assert.equal(title.items.length,1);assert.equal(title.complete,true);assert.ok(title.scanned>5000);
 const content=await run({query:'needle-after-limit',mode:'content'});assert.equal(content.items.length,1);assert.equal(content.notesRead,5011);assert.equal(content.complete,true);
 const page=await run({offset:5000});assert.equal(page.items.length,11);assert.equal(page.totalMatches,5011);assert.equal(page.nextOffset,null);
});

test('v1 migration inserts cloud after knowledge, preserves user settings and removed services',()=>{
 const state={ankeServicesVersion:2,ankePersonalServicesVersion:1,bots:[{id:'k',name:'My notes',ankeServicePreset:'knowledge',instructions:'custom'}],rooms:[],prefs:{serviceShortcuts:[{kind:'bot',id:'k',group:'learning'}]}};ensureServices(state);assert.deepEqual(state.prefs.serviceShortcuts.map(s=>state.bots.find(b=>b.id===s.id).ankeServicePreset),['knowledge','cloud']);assert.equal(state.bots[0].name,'My notes');assert.ok(state.bots[0].instructions.startsWith('custom'));assert.equal(state.bots.length,2);state.prefs.serviceShortcuts.pop();assert.equal(ensureServices(state),false);assert.equal(state.prefs.serviceShortcuts.length,1);
});
