import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {searchHomes} from './matching.mjs';
import {openStore} from './store.mjs';
import {start} from './server.mjs';
import {createHandler} from './mcp.mjs';

export const applicant={id:'R-A',label:'Synthetic teacher',ruleVersion:'test-only',eligibility:'verified',priority:1,submittedOn:'2026-01-01',allowedTypes:['faculty'],maxCost:6000,maxCommute:45,minBedrooms:1,needsElevator:false,latestMoveIn:'2026-12-31',weights:{commute:50,cost:20,space:10,quality:20},workflow:{events:[]}};
export const unit=(id,score)=>({id,project:'Synthetic '+id,type:'faculty',status:'available',source:'synthetic-test',rent:2000,fees:100,bedrooms:1,elevator:true,availableOn:'2026-01-01',quality:80,commute:{'R-A':10},supply:{provider:'university',reference:'synthetic supply only',verifiedOn:'2026-01-01'},...(score===undefined?{}:{residentRating:{score,count:20,source:'Synthetic survey only',verifiedOn:'2026-01-01'}})});

test('resident opinions remain separate from fit; qualifications and constraints precede ratings',()=>{
 const homes=[unit('NONE'),unit('GOOD',4.8),{...unit('EXPENSIVE',5),rent:9000},{...unit('GOV',5),supply:{...unit('GOV').supply,provider:'government'}}];
 const all=searchHomes(applicant,homes,{sort:'residentRating',provider:'university'}).results;
 assert.deepEqual(all.map(x=>x.unitId),['GOOD','NONE','EXPENSIVE']);
 assert.equal(all[0].score,all[1].score);assert.equal(all[1].residentRating,null);assert.equal(all[2].score,null);
 assert.deepEqual(searchHomes(applicant,homes,{provider:'university',minRating:4.5,minReviewCount:20}).results.map(x=>x.unitId),['GOOD','EXPENSIVE']);
 assert.equal(searchHomes({...applicant,eligibility:'pending'},[unit('GOOD',4.8)]).results[0].state,'needs_verification');
 assert.equal(searchHomes({...applicant,eligibility:'ineligible'},[unit('GOOD',4.8)]).results[0].state,'excluded');
 const future=unit('FUTURE',5);future.residentRating.verifiedOn='2027-01-01';assert.equal(searchHomes(applicant,[future],{asOf:'2026-11-12'}).results[0].residentRating,null);
 for(const patch of [{score:NaN},{score:6},{count:0},{source:''},{verifiedOn:'bad'}])assert.throws(()=>searchHomes(applicant,[{...unit('BAD',4),residentRating:{...unit('BAD',4).residentRating,...patch}}]));
 assert.throws(()=>searchHomes(applicant,homes,{minRating:'4'}));
});

test('HTTP import, filtered recommendation, MCP and reopen preserve sourced review aggregates',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'anke-ratings-'));let store=await openStore(path.join(dir,'db')),service;
 try{
  service=await start({port:0,store});const post=async input=>{const r=await fetch(service.url+'/api',{method:'POST',headers:{Origin:service.url,'X-Anke-Token':service.token},body:JSON.stringify(input)});const value=await r.json();if(!r.ok)throw Error(value.error);return value;};
  await post({action:'save',kind:'application',record:applicant});await post({action:'import_supply',records:[unit('GOOD',4.8),unit('NONE')]});
  const query={action:'search_homes',applicationId:applicant.id,provider:'university',sort:'residentRating',minRating:4.5,minReviewCount:5};
  const result=await post(query);assert.equal(result.results.length,1);assert.equal(result.results[0].residentRating.count,20);
  const handler=createHandler(post);const mcp=await handler({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'talent_housing',arguments:query}});assert.deepEqual(JSON.parse(mcp.content[0].text).results,result.results);
  await service.close();service=null;await store.close();store=await openStore(path.join(dir,'db'));assert.equal((await store.execute(query)).results[0].residentRating.score,4.8);
 }finally{if(service)await service.close();await store.close();await rm(dir,{recursive:true,force:true});}
});
