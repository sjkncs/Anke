import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {searchHomes} from './matching.mjs';
import {openStore} from './store.mjs';
import {start} from './server.mjs';

export const application=()=>({id:'A',label:'测试家庭',ruleVersion:'test-only',eligibility:'verified',priority:1,submittedOn:'2026-01-01',allowedTypes:['高校住房'],maxCost:6000,maxCommute:45,minBedrooms:2,needsElevator:true,latestMoveIn:'2026-12-31',weights:{commute:40,cost:20,space:20,quality:20},workflow:{events:[]},profile:{needsFurnished:true,maxSetupCost:5000,longTermShare:0.4,longTermWeights:{education:60,stability:40}}});
export const supply=()=>({id:'U',project:'测试房源 · 非实际供应',type:'高校住房',status:'available',source:'synthetic-test-fixture',rent:2500,fees:200,bedrooms:2,elevator:true,availableOn:'2026-11-01',quality:80,commute:{A:15},supply:{provider:'university',reference:'synthetic-test-fixture',verifiedOn:'2026-11-01'},furnished:true,setupCost:1000,location:{longitude:114.05,latitude:22.65,crs:'BD09'},factors:{education:{score:80,source:'synthetic evidence',verifiedOn:'2026-11-01',status:'current'},stability:{score:90,source:'synthetic lease evidence',verifiedOn:'2026-11-01',status:'current'}}});
test('retrieval stays inside documented supply; plans and unknown facts do not improve ranking',()=>{
  const a=application(),u=supply(),market={...u,id:'MARKET',supply:undefined};
  assert.deepEqual(searchHomes(a,[u,market],{asOf:'2026-11-12'}).results.map(x=>x.unitId),['U']);
  assert.equal(searchHomes(a,[u],{query:'不存在',asOf:'2026-11-12'}).results.length,0);
  assert.equal(searchHomes(a,[{...u,furnished:false}]).results[0].state,'excluded');
  assert.equal(searchHomes(a,[{...u,setupCost:null}]).results[0].state,'needs_verification');
  const planned=structuredClone(u);planned.factors.education.status='planned';planned.factors.education.score=100;
  const r=searchHomes(a,[planned]).results[0];assert.equal(r.score,null);assert.equal(r.longTerm,null);assert.equal(r.future.length,1);
  assert.equal(searchHomes(a,[u],{asOf:'2026-11-12'}).results[0].longTerm,84);
  assert.throws(()=>searchHomes({...a,profile:{longTermShare:NaN}},[u]));
});
test('real service path imports atomically, matches, gates assistant reviews and preserves a complete order across reopen',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'anke-housing-flow-'));let store=await openStore(path.join(dir,'db')),service;
  try{
    service=await start({port:0,store});const post=async data=>{const r=await fetch(service.url+'/api',{method:'POST',headers:{Origin:service.url,'X-Anke-Token':service.token,'Content-Type':'application/json'},body:JSON.stringify(data)});const v=await r.json();if(!r.ok)throw Error(v.error);return v;};
    assert.equal((await (await fetch(service.url+'/health')).json()).version,2);
    assert.match(await (await fetch(service.url+'/workspace/')).text(),/住小智/);
    assert.equal((await fetch(service.url+'/workspace/housing-ui.js')).status,200);
    assert.equal((await fetch(service.url+'/workspace/..%2Fstore.mjs')).status,404);
    await post({action:'save',kind:'application',record:application()});
    await assert.rejects(()=>post({action:'import_supply',records:[supply(),{...supply(),id:'bad',supply:undefined}]}),/provenance/);
    assert.equal((await store.all('unit')).length,0);
    await post({action:'import_supply',records:[supply()]});
    assert.equal((await post({action:'search_homes',applicationId:'A'})).results[0].state,'matched');
    const old=await store.all('unit');await assert.rejects(()=>post({action:'import_supply',records:[{...supply(),id:'V'},supply()]}),/Revision conflict/);assert.deepEqual(await store.all('unit'),old);
    let o=await post({action:'create_order',order:{id:'ORDER-A',applicationId:'A',subject:'测试住房申请',actor:'住小智',on:'2026-11-12',transcript:'测试转写',transcriptSource:'test-fixture'}});
    const advance=async extra=>{o=await post({action:'advance_order',id:o.id,revision:o.revision,on:'2026-11-12',actor:'测试经办人',...extra});};
    await assert.rejects(()=>advance({materials:[{name:'缺件',status:'missing'}]}),/incomplete/);
    await advance({execution:'assistant',materials:[{name:'测试材料',status:'received'}]});await advance({execution:'assistant'});
    await assert.rejects(()=>advance({execution:'assistant',decision:'verified',receipt:'test-only'}),/Operator/);
    await advance({execution:'operator',decision:'verified',receipt:'test-review-reference'});await advance({execution:'assistant'});
    await assert.rejects(()=>advance({execution:'assistant',unitId:'U'}),/Operator/);
    await advance({execution:'operator',unitId:'U'});await advance({execution:'assistant'});
    await assert.rejects(()=>advance({execution:'operator'}),/contract reference/);
    await advance({execution:'operator',receipt:'test-contract-reference'});await advance({execution:'operator',receipt:'test-handover-reference'});
    assert.equal(o.stage,'completed');assert.equal(o.events.length,9);assert.equal(o.mode,'local');
    await assert.rejects(()=>post({action:'advance_order',id:o.id,revision:1,on:'2026-11-12',actor:'测试'}),/Revision conflict/);
    assert.equal((await store.all('unit'))[0].status,'available');
    await service.close();service=null;await store.close();store=await openStore(path.join(dir,'db'));
    assert.equal((await store.execute({action:'workspace'})).orders[0].stage,'completed');
  }finally{if(service)await service.close();await store.close();await rm(dir,{recursive:true,force:true});}
});
