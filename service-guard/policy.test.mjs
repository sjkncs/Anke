import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decide} from './policy.mjs';
const base={healthy:false,occupied:false,running:false,attempts:[],now:700000};
test('recover a missing service',()=>assert.equal(decide(base),'start'));
test('reuse a healthy service',()=>assert.equal(decide({...base,healthy:true}),'healthy'));
test('never replace an occupied port or running process',()=>{assert.equal(decide({...base,occupied:true}),'degraded');assert.equal(decide({...base,running:true}),'degraded');});
test('bound crash loops and permit cooldown',()=>{assert.equal(decide({...base,attempts:[650000,660000,670000]}),'limited');assert.equal(decide({...base,attempts:[1,2,3]}),'start');});
