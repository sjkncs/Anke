import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildPolicyIndex,retrieve} from './policy.mjs';
const raw=JSON.parse(await readFile(new URL('./policy-data/sources.json',import.meta.url),'utf8'));
const index=buildPolicyIndex(raw);
const ask=(query,category,extra={})=>retrieve(index,{action:'policy_answer',query,category,asOf:'2026-11-14',...extra});
test('plain answers bind exact clauses to two distinct housing systems',()=>{
 for(const category of ['public_rental','affordable_rental'])for(const [query,topic]of [['租金怎么算','rent'],['续租什么时候办理','renew'],['如何申请','apply'],['放弃选房的影响','refuse']]){
  const r=ask(query,category);assert.equal(r.plainLanguage.id,category+':'+topic);assert.equal(r.plainLanguage.reviewStatus,'editorial_draft_pending_department_review');assert.ok(r.citations.length);assert.ok(r.citations.every(c=>c.category===category));assert.equal(r.confidence,null);
 }
 assert.match(ask('租金怎么算','public_rental').plainLanguage.summary,/30%/);
 assert.match(ask('租金怎么算','affordable_rental').plainLanguage.summary,/60%/);
 assert.match(ask('放弃选房的影响','public_rental').plainLanguage.summary,/退出公租房轮候册/);
 assert.match(ask('放弃选房的影响','affordable_rental').plainLanguage.summary,/三年以内/);
});
test('drafts do not survive source changes, old dates, unknown scope or compound questions',()=>{
 for(const [query,category,extra]of [
  ['社会主体出租的租金是多少','affordable_rental',{}],
  ['学校证明可以替代优才卡申请吗','talent_rental',{}],
  ['如何申请和续租','public_rental',{}],
  ['租金怎么算','all',{}],
  ['租金怎么算','public_rental',{asOf:'2023-07-31'}],
  ['租金怎么算','public_rental',{batchId:'public-rental-352'}]
 ])assert.equal(ask(query,category,extra).plainLanguage,undefined);
 const changed={...index,documents:index.documents.map(d=>({...d,textSha256:'changed'}))};
 assert.equal(retrieve(changed,{action:'policy_answer',query:'续租',category:'public_rental'}).plainLanguage,undefined);
});
