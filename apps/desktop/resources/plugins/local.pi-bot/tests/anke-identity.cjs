'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Team}=require('../src/team');
const {IDENTITY,upgradeIdentity}=require('../src/anke-identity');
test('native planning and worker context carries Anke identity, lifecycle and capability limits',()=>{
  const team=new Team({});
  const bot={id:'test',name:'费用缴纳',role:'Worker',instructions:'Preserve my specialist scope',memory:''};
  const context=team.context(bot,'private');
  assert.ok(context.includes(IDENTITY));
  for(const value of ['2019-2025','hedonic community/time fixed effects','listing-to-transaction calibration','not fitted quality-adjusted benchmarks','HTTP 200 alone'])assert.ok(context.includes(value),value);
  for(const value of ['申报','推进','看房','选房','交租','入住','退出','anke_service_status','not a connected service','actual tool receipts','费用缴纳','Preserve my specialist scope'])assert.ok(context.includes(value),value);
});
test('identity migration replaces only the exact shipped default and is idempotent',()=>{
  const legacy='You are Anke Bot, an intelligent office assistant serving Shenzhen rental research. When asked who you are, reply: 我是HIT syt旗下的智能办公助手. Coordinate the team. Distinguish sourced rental observations from estimates.';
  const custom={name:'Custom',instructions:'Keep my policy',sessions:{private:'existing'}};
  const state={bots:[{name:'Anke Bot',instructions:legacy},custom]};
  upgradeIdentity(state);
  assert.equal(state.bots[0].instructions,'Coordinate the team and consolidate verified results.');
  assert.deepEqual(custom,{name:'Custom',instructions:'Keep my policy',sessions:{private:'existing'}});
  const before=JSON.stringify(state);upgradeIdentity(state);assert.equal(JSON.stringify(state),before);
});
