'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {requestFor,queryFindesk}=require('../src/findesk');
test('native tool registration rejects foreign sessions and exposes local readiness',async()=>{
  const registered=new Map();const team={state:{bots:[{id:'self',sessions:{private:'session'}}],jobs:[],rooms:[]},pi:{agent:{registerTool:async tool=>registered.set(tool.name,tool),unregisterTool:async name=>registered.delete(name)}},vault:{entries:[],redact:value=>value,clean:value=>value}};
  const installation=await require('../src/tools').installTools(team);
  const tool=registered.get('anke_findesk');assert.ok(tool);
  const wealth=registered.get('anke_wealth');assert.ok(wealth);
  await assert.rejects(wealth.execute({action:'catalog'},{sessionId:'foreign'}),/sessions only/);
  assert.ok((await wealth.execute({action:'catalog'},{sessionId:'session'})).length>150);
  await assert.rejects(tool.execute({action:'status'},{sessionId:'foreign'}),/sessions only/);
  assert.equal((await tool.execute({action:'status'},{sessionId:'session'})).credentialConfigured,false);
  await installation.close();assert.equal(registered.size,0);
});
test('official cookbook routes and bounded query fields',()=>{
  assert.equal(requestFor({action:'status'}),null);
  assert.equal(requestFor({action:'entitlement'}),'https://ffd.findesk.cn/api/v1/entitlement');
  const url=new URL(requestFor({action:'news',query:'  深圳住房  '}));
  assert.equal(url.pathname,'/api/mcp/content/news/search');
  assert.equal(url.searchParams.get('q'),'深圳住房');
  assert.equal(url.searchParams.get('days'),'7');assert.equal(url.searchParams.get('limit'),'10');
  assert.equal(new URL(requestFor({action:'research',query:'住房'})).pathname,'/api/mcp/content/library/search');
  for(const args of [{action:'run'},{action:'news',query:''},{action:'news',query:'a'.repeat(201)},{action:'status',query:'a'},{action:'news',query:'x',url:'https://evil.test'}])assert.throws(()=>requestFor(args));
});
test('Bot-scoped authorization, HTTP errors, cancellation and no replay',async()=>{
  const original=global.fetch;let calls=0;
  const owner={bot:{id:'self'}},team={vault:{entries:[{botId:'other',name:'FFD_API_KEY'}],value(id,name){assert.equal(id,'self');assert.equal(name,'FFD_API_KEY');if(!this.entries.some(e=>e.botId===id&&e.name===name))throw Error('Missing credential');return 'fixture-key';},clean:value=>value}};
  try{
    global.fetch=async(url,options)=>{calls++;assert.equal(options.headers.Authorization,'Bearer fixture-key');assert.equal(options.redirect,'error');return new Response(JSON.stringify({schema_version:'2.0',pools:[]}));};
    assert.equal((await queryFindesk(team,{action:'status'},owner)).credentialConfigured,false);
    await assert.rejects(queryFindesk(team,{action:'entitlement'},owner),/Missing credential/);assert.equal(calls,0);
    team.vault.entries.push({botId:'self',name:'FFD_API_KEY'});
    assert.deepEqual((await queryFindesk(team,{action:'entitlement'},owner)).data.pools,[]);assert.equal(calls,1);
    const controller=new AbortController();controller.abort();await assert.rejects(queryFindesk(team,{action:'news',query:'住房'},owner,controller.signal),/cancelled/);assert.equal(calls,1);
    global.fetch=async()=>{calls++;return new Response('{}',{status:503});};
    await assert.rejects(queryFindesk(team,{action:'research',query:'住房'},owner),/503/);assert.equal(calls,2);
    global.fetch=async()=>new Response('invalid');await assert.rejects(queryFindesk(team,{action:'entitlement'},owner),/JSON/);
  }finally{global.fetch=original;}
});
