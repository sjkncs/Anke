import {test} from 'node:test';
import assert from 'node:assert/strict';
import {policy} from './policy.mjs';
import {createHandler} from './mcp.mjs';
test('youth housing answers cite their own rule and respect effective date',async()=>{
 for(const query of ['租金','入住家具家电','认定后多久内申请','如何申请','续租']){
  const r=await policy({action:'policy_answer',category:'youth_transition',query,asOf:'2026-11-14'});
  assert.ok(r.plainLanguage);assert.ok(r.citations.every(c=>c.sourceId==='youth-transition-rule-2026'));
  assert.equal(r.currentEligibilityDecision,false);assert.equal(r.confidence,null);
 }
 const old=await policy({action:'policy_answer',category:'youth_transition',query:'租金',asOf:'2025-12-31'});
 assert.equal(old.citations.length,0);assert.equal(old.plainLanguage,undefined);
 const exception=await policy({action:'policy_answer',category:'youth_transition',query:'学校证明替代人才认定如何申请'});
 assert.equal(exception.plainLanguage,undefined);assert.equal(exception.requiresHuman,true);
 const compound=await policy({action:'policy_answer',category:'youth_transition',query:'租金和家具家电'});assert.equal(compound.plainLanguage,undefined);
 const definition=await createHandler(policy)({jsonrpc:'2.0',method:'tools/list'});
 assert.ok(definition.tools.find(t=>t.name==='anke_official_policy').inputSchema.properties.category.enum.includes('youth_transition'));
});

test('subsidy answers separate amount, eligibility, overlap and suspension',async()=>{
 const ask=query=>policy({action:'policy_answer',category:'youth_transition',query,asOf:'2026-11-14'});
 for(const [query,id]of [['补贴多少钱','subsidy_amount'],['补贴如何申请','subsidy_apply'],['社保中断后补贴','subsidy_stop'],['补贴和过渡住房同时享受','subsidy_overlap'],['放弃选房','refuse']]){
  const r=await ask(query);assert.equal(r.plainLanguage?.id,'youth_transition:'+id);assert.ok(r.citations.every(c=>c.sourceId==='youth-transition-rule-2026'));
 }
 assert.match((await ask('补贴多少钱')).plainLanguage.summary,/税后1000元/);
 assert.match((await ask('社保中断后补贴')).plainLanguage.summary,/暂停期间不再补发/);
 for(const query of ['补贴多少钱和如何申请','补贴和租金多少钱','补贴申请条件和过渡住房同时享受'])assert.equal((await ask(query)).plainLanguage,undefined);
});
