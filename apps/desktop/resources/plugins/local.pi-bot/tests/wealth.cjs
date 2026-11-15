'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {operations,prepare,execute,panelWealth}=require('../src/wealth');
const {harness}=require('./route-harness.cjs');
function fixture(){return {bot:id=>{if(id!=='self')throw Error('Unknown bot');return {id};},state:{bots:[{id:'self'}],botConnectors:[]},vault:{entries:[{botId:'self',name:'FFD_API_KEY'}],value:(id,key)=>{assert.equal(id,'self');assert.equal(key,'FFD_API_KEY');return 'fixture-key';},clean:x=>x}};}
test('all official tools and documented REST contracts are addressable',()=>{
  const c=require('../../anke.rents/data/findesk-capabilities.json'),ops=operations();
  assert.equal(ops.filter(o=>o.transport==='mcp').length,c.tools.length);
  assert.equal(ops.filter(o=>o.transport==='rest').length,c.rest_endpoints.filter(e=>e.parameter_contract).length);
  assert.equal(new Set(ops.map(o=>o.id)).size,ops.length);
  for(const tool of c.tools){assert.ok(ops.find(o=>o.id===tool.name));assert.ok(tool.input_schema);}
  for(const args of [{function:'not-supported'},{function:'history',url:'https://evil.test'}])assert.throws(()=>prepare('ffd_query',args));
  assert.throws(()=>prepare('ffd_virtual_portfolio',{action:'delete',portfolio_id:'x'}),/idempotency/);
  assert.throws(()=>prepare('POST /api/market-microstructure/l2-radar',{symbol:'x',headers:{Authorization:'x'}}),/unsupported/);
  assert.throws(()=>prepare('ffd_portfolio_analytics',{}),/required/);
  assert.throws(()=>prepare('GET /api/mcp/content/library/files/{file_id}',{}),/required|path/);
  assert.ok(prepare('ffd_virtual_portfolio',{action:'list'}));
});
test('REST is host-fixed, Bot-scoped, bounded, cancellable and single-flight',async()=>{
  const team=fixture(),old=global.fetch;let finish,calls=0;
  try{
    global.fetch=(url,opts)=>{calls++;assert.equal(new URL(url).hostname,'ffd.findesk.cn');assert.equal(opts.redirect,'error');assert.equal(opts.headers.Authorization,'Bearer fixture-key');return new Promise((resolve,reject)=>{finish=()=>resolve(new Response('{"data":{"rows":[{"close":1}]}}'));opts.signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true});});};
    const input={operation:'GET /api/v1/entitlement',requestId:'req'};
    const p=execute(team,'self',input);await assert.rejects(execute(team,'self',input),/busy/);finish();assert.equal((await p).data.data.rows[0].close,1);assert.equal(calls,1);
    const cancelled=execute(team,'self',input);assert.equal((await panelWealth(team,{botId:'self',action:'cancel',requestId:'other'})).cancelled,false);await panelWealth(team,{botId:'self',action:'cancel',requestId:'req'});await assert.rejects(cancelled,/cancelled/);
    global.fetch=async()=>new Response('{"success":false,"message":"no data"}');await assert.rejects(execute(team,'self',input),/business error/);
    global.fetch=async()=>new Response('{}',{status:503});await assert.rejects(execute(team,'self',input),/503/);
    global.fetch=async()=>new Response(Buffer.from('%PDF-fixture'),{headers:{'content-type':'application/pdf'}});
    const downloaded=await execute(team,'self',{operation:'GET /api/mcp/content/library/files/{file_id}/download',arguments:{file_id:123}});
    assert.equal(Buffer.from(downloaded.data.file.base64,'base64').toString(),'%PDF-fixture');
  }finally{global.fetch=old;}
});
test('MCP requires explicit Findesk host and Bot grant and keeps provider errors',async()=>{
  const team=fixture(),input={operation:'ffd_virtual_portfolio',arguments:{action:'list'},serverId:'ffd'};
  await assert.rejects(execute(team,'self',input),/authorized/);
  team.state.botConnectors=[{id:'ffd',enabled:true,type:'http',botIds:['self'],url:'https://ffd.findesk.cn/mcp'}];
  team.bridge={call:async(id,args)=>{assert.equal(id,'self');assert.equal(args.name,'ffd_virtual_portfolio');return {content:[]};}};
  assert.ok(await execute(team,'self',input));team.bridge.call=async()=>({isError:true});await assert.rejects(execute(team,'self',input),/tool error/);
});
test('production renderer route exposes catalog but does not query provider',async()=>{
  const api=harness(fixture());const result=await api.request('team.wealth',{action:'catalog',botId:'self'});
  assert.equal(result.scenarios.length,21);assert.ok(result.operations.length>150);assert.equal(result.status.authenticatedDataVerified,false);
  await assert.rejects(api.request('team.wealth',{action:'catalog',botId:'other'}),/Unknown bot/);
});
