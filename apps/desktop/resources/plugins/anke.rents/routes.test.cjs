'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createRequire}=require('node:module');
test('all rental routes dispatch with isolated external APIs',async()=>{
  const filename=path.join(__dirname,'main.js'),calls=[],module={exports:{}};
  const pi={app:{getAppearance:()=>({base:'light'})},shell:{openExternal:async url=>{calls.push(url);return {opened:true};}},ui:{requestNotificationPermission:async()=>'denied'},plugin:{setSettings:async value=>{assert.equal(value.eventSystemNotifications,false);}}};
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),{require:createRequire(filename),module,pi,URL});
  const call=module.exports.onPanelInvoke;
  assert.equal(await call('rents.module'),'overview');assert.equal((await call('rents.appearance')).base,'light');
  assert.equal((await call('rents.query',{dataset:'demo'})).count,480);
  assert.ok(await call('rents.knowledge',{}));assert.ok(await call('rents.events',{}));
  await assert.rejects(()=>call('rents.environment',{}));
  assert.equal((await call('rents.enableEventNotifications',{})).permission,'denied');
  await call('rents.openMap',{url:'https://map.baidu.com/'});await call('rents.openEvent',{url:'https://www.sz.gov.cn/'});assert.equal(calls.length,2);
  for(const channel of ['rents.openMap','rents.openEvent'])for(const url of ['file:///C:/private','https://evil.test','https://www.sz.gov.cn.evil.test','https://user@www.sz.gov.cn','https://www.sz.gov.cn:444/'])await assert.rejects(()=>call(channel,{url}));
  await assert.rejects(()=>call('unknown',{}));
});
