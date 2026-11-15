import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {policy} from './policy.mjs';
const draft=JSON.parse(await readFile(new URL('./policy-data/review-questions.json',import.meta.url),'utf8'));
const observations=[];
for(const q of draft.questions){
 const r=await policy({action:'policy_answer',query:q.query,category:q.category,asOf:q.asOf});
 assert.equal(r.confidence,null);assert.equal(r.currentEligibilityDecision,false);
 assert.ok(r.citations.every(c=>!c.historicalBatch));
 assert.ok(r.citations.every(c=>q.category==='all'||c.category===q.category));
 if(['university','talent_sale','talent_rental','all'].includes(q.category))assert.equal(r.plainLanguage,undefined);
 observations.push({id:q.id,category:q.category,query:q.query,answerMode:r.answerMode,editorialId:r.plainLanguage?.id??null,sourceIds:[...new Set(r.citations.map(c=>c.sourceId))],requiresHuman:r.requiresHuman,departmentScore:null});
}
const result={checkedAt:new Date().toISOString(),scope:'60道问题的类型、日期和证据边界回归；非业务正确率评测',cases:observations.length,contractChecks:'PASS',businessAccuracy:null,readabilityScore:null,departmentReview:'PENDING',editorialDraftAnswers:observations.filter(o=>o.editorialId).length,observations};
await mkdir(new URL('./verification/policy-20261114/',import.meta.url),{recursive:true});await writeFile(new URL('./verification/policy-20261114/evaluation.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify({cases:result.cases,contractChecks:result.contractChecks,editorialDraftAnswers:result.editorialDraftAnswers,businessAccuracy:null}));
