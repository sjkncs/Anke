'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ensureAssistants,analyzeAgenda}=require('../src/anke-assistants');
test('assistant migration preserves existing users, creates valid native groups and runs only once',()=>{
  const original={id:'user',name:'教师工作助手',instructions:'Keep my settings'};
  const state={bots:[original],rooms:[],jobs:[]};
  assert.equal(ensureAssistants(state),true);
  assert.equal(state.bots.length,8);assert.equal(state.rooms.length,2);
  assert.deepEqual(state.bots[0],original);
  assert.equal(new Set(state.bots.map(b=>b.name)).size,8);
  for(const room of state.rooms){assert.ok(room.members.includes(room.adminId));assert.equal(state.bots.find(b=>b.id===room.adminId).role,'Administrator');assert.ok(room.members.every(id=>state.bots.some(b=>b.id===id)));}
  state.bots.pop();const snapshot=JSON.stringify(state);
  assert.equal(ensureAssistants(state),false);assert.equal(JSON.stringify(state),snapshot);
});
test('agenda finds nested overlaps across time zones without inventing reminders',()=>{
  const events=[{title:'课程',start:'2026-11-12T10:00:00+08:00',end:'2026-11-12T12:00:00+08:00'},{title:'会议',start:'2026-11-12T03:00:00Z',end:'2026-11-12T03:30:00Z'},{title:'下课',start:'2026-11-12T12:00:00+08:00',end:'2026-11-12T12:15:00+08:00'}];
  const before=JSON.stringify(events),result=analyzeAgenda(events);
  assert.deepEqual(result.conflicts,[{first:0,second:1,overlapMinutes:30}]);
  assert.equal(result.events[0].durationMinutes,120);assert.equal(result.remindersCreated,false);assert.equal(JSON.stringify(events),before);
});
test('agenda rejects missing zones, reversed intervals and unbounded inputs',()=>{
  for(const events of [[{title:'课',start:'2026-11-12T10:00:00',end:'2026-11-12T12:00:00'}],[{title:'课',start:'2026-11-12T12:00:00Z',end:'2026-11-12T10:00:00Z'}],new Array(301).fill({})])assert.throws(()=>analyzeAgenda(events));
});
