'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Team}=require('../src/team');
const {CONSTITUTION}=require('../src/anke-identity');
test('Bot task context includes constitutional guidance without claiming training or granting permission',()=>{
 const bot={id:'principles',name:'Personal helper',role:'Worker',instructions:'Keep my scope',memory:''};
 const context=new Team({}).context(bot,'private');
 assert.ok(context.includes(CONSTITUTION));
 for(const term of ['在复杂中建立判断，在变化中安顿生活。','privacy','authorization','foreseeable harm','not completed Constitutional AI model training','does not grant permissions','Keep my scope'])assert.ok(context.includes(term),term);
 assert.equal(bot.instructions,'Keep my scope');
});
