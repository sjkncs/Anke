import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {recommend,simulate,progress} from './core.mjs';
import {openStore} from './store.mjs';
import {start} from './server.mjs';
import {createHandler} from './mcp.mjs';
const app=(id='A',priority=1)=>({id,label:`Fixture ${id}`,ruleVersion:'fixture-not-policy',eligibility:'verified',priority,submittedOn:'2026-01-01',allowedTypes:['fixture'],maxCost:5000,maxCommute:40,minBedrooms:2,needsElevator:true,latestMoveIn:'2026-12-01',weights:{commute:40,cost:30,space:20,quality:10},workflow:{events:[{stage:'review',on:'2026-02-01'}]}});
const unit=(id='U')=>({id,project:'Synthetic test unit',type:'fixture',status:'available',source:'synthetic-test-only',rent:2000,fees:100,bedrooms:2,elevator:true,availableOn:'2026-11-01',quality:80,commute:{A:10,B:15}});
test('unknown requirements are not scored or allocated; hard limits exclude units',()=>{
  const a=app();let r=recommend(a,[{...unit(),fees:null}]).results[0];assert.equal(r.score,null);assert.equal(r.state,'needs_verification');
  for(const change of [{rent:6000},{bedrooms:1},{elevator:false},{commute:{A:60}},{availableOn:'2027-01-01'},{status:'repair'}])assert.equal(recommend(a,[{...unit(),...change}]).results[0].state,'excluded');
  assert.equal(simulate([a],[{...unit(),fees:null}]).assignments[0].unitId,null);
});
test('priority outranks match score and units cannot be allocated twice',()=>{
  const result=simulate([app('B',2),app('A',1)],[unit()]);assert.equal(result.assignments[0].applicationId,'A');assert.equal(result.assignments[0].unitId,'U');assert.equal(result.assignments[1].unitId,null);
  assert.equal(simulate([{...app(),eligibility:'pending'}],[unit()]).assignments[0].reason,'eligibility_not_verified');
  assert.throws(()=>simulate([app(),app()],[unit()]));
});
test('workflow elapsed time and invalid dates are checked',()=>{
  assert.equal(progress(app(),'2026-02-11').stageElapsedDays,10);
  assert.equal(progress(app(),'2026-02-11').totalElapsedDays,41);
  assert.throws(()=>progress(app(),'2026-02-30'));
  assert.throws(()=>progress(app(),'2025-12-31'));
  assert.throws(()=>recommend({...app(),weights:{commute:NaN}},[unit()]));
});
test('user path persists records, edits needs, recommends, simulates and queries through MCP',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'anke-talent-'));const database=path.join(dir,'new-parent','db');let store=await openStore(database);let service;
  try{
    service=await start({port:0,store});
    const post=async data=>{const r=await fetch(service.url+'/api',{method:'POST',headers:{Origin:service.url,'X-Anke-Token':service.token,'Content-Type':'application/json'},body:JSON.stringify(data)});const body=await r.json();if(!r.ok)throw Error(body.error);return body;};
    const html=await (await fetch(service.url)).text();assert.ok(html.includes('配租模拟'));assert.ok(!html.includes('__TOKEN__'));
    const located=await post({action:'residential_locate',input:{project:'定位路由测试住宅',district:'南山',address:'测试地址',location:{longitude:114,latitude:22.6,crs:'GCJ02'}}});
    assert.equal(located.selected,'supplied');assert.equal(located.results[0].address,'测试地址');
    await assert.rejects(()=>post({action:'residential_street',input:{project:'定位路由测试住宅',location:{longitude:114,latitude:22.6,crs:'GCJ02'}}}),/街景位置/);
    const saved=await post({action:'save',kind:'application',record:app()});assert.equal(saved.revision,1);
    await post({action:'save',kind:'unit',record:unit()});
    assert.equal((await post({action:'recommend',applicationId:'A'})).results[0].state,'matched');
    await assert.rejects(()=>post({action:'save',kind:'application',record:app()}),/Revision conflict/);
    const updated=await post({action:'save',kind:'application',record:{...saved,maxCommute:5}});
    assert.equal((await post({action:'recommend',applicationId:'A'})).results[0].state,'excluded');
    await post({action:'save',kind:'application',record:{...updated,maxCommute:40}});
    const handle=createHandler(input=>post(input));
    const tools=await handle({jsonrpc:'2.0',id:1,method:'tools/list'});assert.equal(tools.tools[0].name,'talent_housing');
    const catalog=await handle({jsonrpc:'2.0',id:5,method:'tools/call',params:{name:'talent_housing',arguments:{action:'preference_catalog'}}});
    const evidence=JSON.parse(catalog.content[0].text);assert.equal(evidence.dimensions.length,16);
    for(const d of evidence.dimensions){assert.equal(d.personalWeight,null);for(const id of d.sourceIds)assert.ok(evidence.sources.some(s=>s.id===id));}
    assert.equal(evidence.sources.find(s=>s.id==='S8').applicationClosedOn,'2026-08-31');
    const survey=await handle({jsonrpc:'2.0',id:6,method:'tools/call',params:{name:'talent_housing',arguments:{action:'survey_template'}}});
    const questionnaire=JSON.parse(survey.content[0].text);assert.equal(questionnaire.sections.length,5);assert.equal(questionnaire.sections.reduce((n,s)=>n+s.items.length,0),20);assert.equal(questionnaire.choiceTasks.length,3);
    await assert.rejects(()=>handle({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'talent_housing',arguments:{action:'save',kind:'application',record:app()}}}),/Read-only/);
    await assert.rejects(()=>handle({jsonrpc:'2.0',id:4,method:'tools/call',params:{name:'talent_housing',arguments:{action:'simulate',record:app()}}}),/Read-only/);
    const result=await handle({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'talent_housing',arguments:{action:'simulate'}}});
    assert.equal(JSON.parse(result.content[0].text).assignments[0].unitId,'U');
    assert.equal((await fetch(service.url+'/api',{method:'POST',body:'{}'})).status,403);
    const wrongOrigin=await fetch(service.url+'/api',{method:'POST',headers:{Origin:'https://example.com','X-Anke-Token':service.token},body:'{}'});assert.equal(wrongOrigin.status,403);
    await service.close();service=null;await store.close();store=await openStore(database);
    assert.equal((await store.all('application'))[0].revision,3);
    assert.equal((await store.execute({action:'simulate'})).assignments[0].unitId,'U');
    assert.equal(Number((await store.db.query('SELECT count(*) AS n FROM talent_audit')).rows[0].n),4);
  }finally{if(service)await service.close();await store.close();await rm(dir,{recursive:true,force:true});}
});
