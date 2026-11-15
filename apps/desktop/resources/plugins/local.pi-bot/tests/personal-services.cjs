const {test}=require('node:test'),assert=require('node:assert/strict');
const {ensureServices}=require('../src/anke-services');
const {validateServiceShortcuts}=require('../src/service-shortcuts');
test('personal workspaces upgrade saved shortcuts once and preserve removals',async()=>{
 const original={id:'mine',name:'知识库',instructions:'custom'};
 const shortcut={kind:'bot',id:'mine',group:'work'};
 const state={ankeServicesVersion:2,bots:[original],rooms:[],prefs:{serviceShortcuts:[shortcut]}};
 assert.equal(ensureServices(state),true);assert.equal(state.bots.length,13);assert.equal(state.bots[0],original);assert.equal(state.prefs.serviceShortcuts[0],shortcut);
 const {serviceShortcuts,SERVICE_GROUPS,serviceArtwork}=await import('../renderer/service-launcher.mjs');
 assert.ok(SERVICE_GROUPS.some(([id,name])=>id==='learning'&&name==='终身学习'));
 const shortcuts=serviceShortcuts(state);assert.equal(shortcuts.filter(x=>x.group==='learning').length,3);assert.equal(shortcuts.filter(x=>x.group==='wellbeing').length,4);assert.equal(shortcuts.filter(x=>x.group==='travel-shopping').length,3);
 assert.deepEqual(validateServiceShortcuts(shortcuts,state),shortcuts);
 const removed=state.bots.find(b=>b.ankeServicePreset==='diet');state.bots=state.bots.filter(b=>b!==removed);state.prefs.serviceShortcuts=shortcuts.filter(s=>s.id!==removed.id);
 const before=JSON.stringify(state);assert.equal(ensureServices(state),false);assert.equal(JSON.stringify(state),before);
});
