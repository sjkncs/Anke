import {test} from 'node:test';import assert from 'node:assert/strict';
import {prepareIntake} from './policy-intake.mjs';
const catalog={documents:[{id:'source',category:'public_rental',status:'collected',textSha256:'frozen',currentValidity:'requires_department_review'}]};
const batch=()=>({schemaVersion:1,provenance:{sourceSystem:'测试夹具非真实12345',exportedOn:'2026-11-14',authorizationReference:'fixture',useScope:'本地测试'},records:[{id:'test',question:'测试来电13800138000',answer:'测试邮箱sample@example.test',category:'public_rental',version:'fixture-v1',effectiveFrom:'2026-01-01',effectiveTo:null,sourceIds:['source'],owner:'维护岗位'}]});
test('intake stays private and staged, redacts common identifiers, pins policy source',()=>{const r=prepareIntake(batch(),catalog);assert.equal(r.status,'staged_not_published');assert.equal(r.records[0].published,false);assert.equal(r.records[0].reviewStatus,'pending');assert.equal(r.internal12345Connection,false);assert.doesNotMatch(JSON.stringify(r),/13800138000|sample@example/);assert.equal(r.records[0].sourceDigests[0].textSha256,'frozen');assert.equal(prepareIntake(batch(),catalog).batchId,r.batchId);});
test('invalid exports fail as an entire batch',()=>{
 for(const mutate of [b=>b.provenance.authorizationReference='',b=>b.records.push({...b.records[0]}),b=>b.records[0].effectiveFrom='2026-02-30',b=>b.records[0].sourceIds=['missing'],b=>b.records[0].category='university',b=>b.records[0].contactName='private',b=>b.records[0].reviewStatus='approved']){const b=batch();mutate(b);assert.throws(()=>prepareIntake(b,catalog));}
});
