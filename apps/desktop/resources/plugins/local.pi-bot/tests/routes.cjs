'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {harness}=require('./route-harness.cjs');
const root=path.resolve(__dirname,'..'),main=fs.readFileSync(path.join(root,'main.js'),'utf8');
const routes=[...new Set([...main.matchAll(/case '(team\.[^']+|microphone\.panel)'/g)].map(m=>m[1]).concat(['team.startup','team.updates','team.appearance']))];
test('every panel route is reachable through the renderer allowlist',()=>{
  const allowed=main.slice(main.indexOf("if(!['team.updates'"),main.indexOf(".includes(args.channel)"));
  assert.deepEqual(routes.filter(route=>route!=='microphone.panel'&&!allowed.includes("'"+route+"'")),[]);
});
test('all literal renderer team calls have a registered handler',()=>{
  function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.name.endsWith('.mjs')?[path.join(dir,e.name)]:[]);}
  const missing=[];for(const file of walk(path.join(root,'renderer')))for(const match of fs.readFileSync(file,'utf8').matchAll(/\b(?:call|invoke|client)\('((?:team\.)[^']+)'/g))if(!routes.includes(match[1]))missing.push({file:path.relative(root,file),route:match[1]});
  assert.deepEqual(missing,[]);
});
test('the renderer allowlist has no unhandled routes',()=>{
  const allowed=main.slice(main.indexOf("if(!['team.updates'"),main.indexOf(".includes(args.channel)"));
  assert.deepEqual([...allowed.matchAll(/'(team\.[^']+)'/g)].map(m=>m[1]).filter(route=>!routes.includes(route)),[]);
});
test('each registered route dispatches or rejects malformed input without unknown-route errors',async ctx=>{
  // Deliberately unavailable collaborators prevent external work and real writes.
  const unavailable=new Proxy(function(){throw Error('Isolated dependency unavailable.');},{get:()=>unavailable});
  const team=new Proxy({storeConflict:false,state:{jobs:[],bots:[],rooms:[]}}, {get:(t,k)=>k in t?t[k]:unavailable});
  const api=harness(team);
  for(const route of routes.filter(r=>r!=='team.updates'))await ctx.test(route,async()=>{
    try{await (route==='microphone.panel'?api.onPanelInvoke(route,{}):api.request(route,{}));}
    catch(error){assert.doesNotMatch(error.message,/Unknown Anke Bot operation|Unknown renderer method|Route did not settle/);}
  });
  assert.throws(()=>api.onRendererCall('request.start',{channel:'team.not.registered'}),/Unknown/);
  assert.throws(()=>api.onRendererCall('invalid.method'),/Unknown/);
  assert.throws(()=>api.onRendererCall('request.read',{id:'expired'}),/expired/);
});
test('store conflicts block service writes and session opening rejects foreign ownership',async()=>{
  const team={storeConflict:true,state:{jobs:[],bots:[],rooms:[]}},api=harness(team);
  await assert.rejects(api.request('team.anke.desk',{action:'create'}),/冲突/);
  team.storeConflict=false;
  await assert.rejects(api.request('team.session.open',{sessionId:'foreign'}),/does not belong/);
});
