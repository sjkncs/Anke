import {test} from 'node:test';
import assert from 'node:assert/strict';
import {policy} from './policy.mjs';
test('social-provider rent ceiling and application conditions stay separate',async()=>{
 const ask=(category,query,asOf='2026-11-14')=>policy({action:'policy_answer',category,query,asOf});
 const social=await ask('social_affordable','社会主体租金是多少');assert.match(social.plainLanguage.summary,/不高于.*90%/);assert.equal(social.citations[0].section,'第二十条');
 const application=await ask('social_affordable','申请条件');assert.equal(application.citations.length,2);assert.match(application.plainLanguage.summary,/福田、罗湖、南山/);
 assert.equal((await ask('social_affordable','续租')).citations[0].section,'第二十二条');
 assert.equal((await ask('affordable_rental','社会主体租金')).plainLanguage,undefined);
 assert.equal((await ask('social_affordable','租金','2023-07-31')).citations.length,0);
 const extracts=await policy({action:'policy_search',category:'social_affordable',query:'租金 续租 申请',limit:10});assert.ok(extracts.citations.every(c=>!['第十四条','第二十四条','第十六条'].includes(c.section)));
 for(const [category,section]of [['public_rental','第三十一条'],['affordable_rental','第二十四条']]){
  const r=await ask(category,'买房后退房');assert.equal(r.citations[0].section,section);assert.match(r.plainLanguage.summary,/交付使用之日起十六个月/);assert.equal(r.currentEligibilityDecision,false);
 }
 assert.equal((await ask('youth_transition','买房后退房')).plainLanguage,undefined);
});
