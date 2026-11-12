const {test}=require('node:test');
const assert=require('node:assert/strict');
const {events,createDelivery}=require('./events.cjs');
test('actual exported snapshot preserves sources and absence of measured rent impact',()=>{
 const d=events({includeExpired:true}); assert.ok(d.events.length>0);assert.equal(d.rentImpactEstimated,false);
 for(const e of d.events){assert.ok(e.url.startsWith('https://'));assert.equal(e.rentEffect,null);assert.ok(e.evidence.length);}
 assert.ok(events({query:'APEC'}).events.length>0);
 assert.throws(()=>events({query:12}));assert.throws(()=>events({path:'x'}));
});
test('notifications suppress repeats, respect native opt-in, and retry failed delivery',async()=>{
 let settings={},toasts=0,native=0,fail=true;
 const pi={plugin:{getSettings:async()=>structuredClone(settings),setSettings:async p=>{settings={...settings,...p};}},ui:{notify:async()=>{if(fail)throw Error('delivery unavailable');toasts++;},showNativeNotification:async()=>{native++;return {shown:true,permission:'granted'};}}};
 const tick=createDelivery(pi);
 await assert.rejects(tick());assert.equal(settings.eventDelivery,undefined);
 fail=false;await tick();await tick();assert.equal(toasts,1);assert.equal(native,0);
 settings.eventDelivery={};settings.eventSystemNotifications=true;await tick();assert.equal(toasts,2);assert.equal(native,1);
});
