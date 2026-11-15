import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchHomes} from './matching.mjs';
import {createHandler} from './mcp.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {openStore} from './store.mjs';
import {start} from './server.mjs';

const applicant={id:'A',label:'Synthetic household',ruleVersion:'test-only',eligibility:'verified',priority:1,submittedOn:'2026-01-01',allowedTypes:['faculty'],maxCost:6000,maxCommute:45,minBedrooms:1,needsElevator:false,latestMoveIn:'2026-12-31',weights:{commute:70,cost:10,space:10,quality:10},workflow:{events:[]}};
const home=(id,rent,commute)=>({id,project:'Synthetic '+id,type:'faculty',status:'available',source:'synthetic fixture',rent,fees:100,bedrooms:2,elevator:true,availableOn:'2026-01-01',quality:80,commute:{A:commute},setupCost:500,furnished:true,supply:{provider:'university',reference:'synthetic fixture',verifiedOn:'2026-01-01'}});
test('actual trade-offs survive legacy scoring; dominated alternatives do not crowd them out',()=>{
 const homes=[home('NEAR',4000,10),home('CHEAP',2000,30),home('WORSE',4500,35)];
 const before=structuredClone({applicant,homes});
 const result=searchHomes(applicant,homes),d=result.decisionContext;
 assert.deepEqual(d.alternatives,['CHEAP','NEAR']);
 assert.deepEqual(d.contrasts.map(x=>x.field),['monthlyCost','commuteMinutes']);
 assert.equal(result.results[0].unitId,'NEAR');
 assert.equal(d.candidates[0].unitId,'CHEAP');
 assert.equal(d.policy.allocationChanged,false);
 assert.deepEqual({applicant,homes},before);
});
test('missing facts, empty supply and qualification conflicts remain explicit',()=>{
 const missing={...home('UNKNOWN',3000,20),setupCost:null};
 const d=searchHomes(applicant,[home('KNOWN',2000,10),missing,home('COST',9000,10)]).decisionContext;
 assert.ok(d.alternatives.includes('UNKNOWN'));
 assert.ok(d.conflicts.find(x=>x.unitId==='COST').constraints.includes('cost_limit'));
 assert.deepEqual(searchHomes(applicant,[]).decisionContext.candidates,[]);
 const pending=searchHomes({...applicant,eligibility:'pending'},[home('P',2000,10)]).decisionContext;
 assert.equal(pending.alternatives.length,0);
 assert.ok(pending.unresolved[0].fields.includes('eligibility'));
});
test('existing MCP search delivers deliberation context through its real tool contract',async()=>{
 const handle=createHandler(async input=>searchHomes(applicant,[home('U',2000,10)],input));
 const reply=await handle({jsonrpc:'2.0',method:'tools/call',params:{name:'talent_housing',arguments:{action:'search_homes',applicationId:'A'}}});
 assert.equal(JSON.parse(reply.content[0].text).decisionContext.version,'housing-deliberation-v1');
});
test('HTTP search returns context without modifying saved preferences or supply',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'anke-deliberation-'));
 let store,service;
 try{
  store=await openStore(path.join(dir,'db'));
  await store.save('application',applicant);await store.save('unit',home('HTTP',2000,10));
  const before=await store.execute({action:'workspace'});
  service=await start({port:0,store});
  const response=await fetch(service.url+'/api',{method:'POST',headers:{Origin:service.url,'Content-Type':'application/json','X-Anke-Token':service.token},body:JSON.stringify({action:'search_homes',applicationId:'A'})});
  assert.equal(response.status,200);
  assert.equal((await response.json()).decisionContext.candidates[0].unitId,'HTTP');
  assert.deepEqual(await store.execute({action:'workspace'}),before);
  assert.ok((await (await fetch(service.url+'/health')).json()).capabilities.includes('housing-deliberation-v1'));
 }finally{if(service)await service.close();if(store)await store.close();await rm(dir,{recursive:true,force:true});}
});
