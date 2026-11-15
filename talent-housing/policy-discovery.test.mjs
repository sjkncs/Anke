import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildPolicyIndex,retrieve} from './policy.mjs';
const raw=JSON.parse(await readFile(new URL('./policy-data/sources.json',import.meta.url),'utf8'));
test('discovered FAQs preserve short enumeration items and original sources',()=>{
 const d=raw.documents.find(d=>d.id==='official-faq-11711555');assert.match(d.text,/（一）全部家庭成员户籍均迁出本市/);assert.match(d.text,/（二）因购买/);assert.match(d.text,/（三）正在本市享受其他住房保障/);
 assert.ok(raw.documents.filter(d=>d.status==='collected').length>=20);buildPolicyIndex(raw);
});
test('old FAQ rules require an explicit historical query',()=>{
 const index=buildPolicyIndex(raw),input={action:'policy_search',category:'public_rental',query:'挂靠在亲戚户口本',asOf:'2026-11-14',limit:10};
 assert.ok(retrieve(index,input).citations.every(c=>!c.historicalOnly));
 assert.ok(retrieve(index,{...input,includeHistorical:true}).citations.some(c=>c.sourceId==='official-faq-10509542'&&c.historicalOnly));
});

test('complete bounded directory archive preserves short answers and simulated review identity',async()=>{
 const archive=JSON.parse(await readFile(new URL('./policy-data/public-discovery-20261114/external-archive.json',import.meta.url),'utf8'));
 assert.equal(archive.documents.length,76);assert.equal(archive.errors.length,0);
 assert.equal(new Set(archive.documents.map(d=>d.id)).size,76);
 for(const year of ['2023','2024','2025','2026'])assert.ok(archive.documents.some(d=>d.publishedOn?.startsWith(year)));
 assert.match(raw.documents.find(d=>d.id==='official-faq-10835845').text,/日常轮候和定向配租/);
 assert.ok(raw.documents.find(d=>d.id==='official-faq-10662220').historicalOnly);
 const review=JSON.parse(await readFile(new URL('./policy-data/review/simulated-business-review.json',import.meta.url),'utf8'));
 assert.equal(review.records.length,raw.documents.filter(d=>d.status==='collected').length);
 assert.ok(review.records.every(r=>r.departmentApproved===false&&r.reviewMode==='AI_simulated_business_review'));
 const crossing=review.records.find(r=>r.sourceId==='official-faq-10835810');assert.deepEqual(crossing.policySections,['public-rental-352:第十四条']);
});
