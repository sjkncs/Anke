import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {connect} from './store.mjs';
import {importEvents} from './import-events.mjs';
test('official events import idempotently, retain revisions, and leave rental observations unchanged',async()=>{
 const db=await connect({memory:true});
 try{
  const data=JSON.parse(await readFile(new URL('../event-monitor/data/events.json',import.meta.url),'utf8'));
  const one=await importEvents(db,data),two=await importEvents(db,data);
  assert.equal(one.events,data.events.length);assert.deepEqual(one,two);
  assert.equal((await db.query('SELECT count(*)::integer AS n FROM rent_event_revisions')).rows[0].n,data.events.length);
  const e=structuredClone(data.events[0]);e.version++;e.body+='\n官方正文修订测试';
  await importEvents(db,{...data,events:[e]});
  assert.equal((await db.query('SELECT count(*)::integer AS n FROM rent_event_revisions')).rows[0].n,data.events.length+1);
  assert.equal((await db.query('SELECT body FROM rent_documents WHERE id=$1',['event:'+e.id])).rows[0].body,e.body);
  assert.equal((await db.query('SELECT count(*)::integer AS n FROM rent_observations')).rows[0].n,0);
  await assert.rejects(importEvents(db,{...data,events:[{...e,url:'https://evil.com/a'}]}));
  for(const url of ['https://view.inews.qq.com.evil.test/a','https://user@view.inews.qq.com/a','http://view.inews.qq.com/a']){
   await assert.rejects(importEvents(db,{...data,events:[{...e,sourceKind:'media',url}]}));
  }
  const media={...e,id:'media-fixture',sourceKind:'media',publisher:'Fixture publisher',url:'https://view.inews.qq.com/a/fixture'};
  await importEvents(db,{...data,events:[media]});
  const metadata=(await db.query('SELECT metadata FROM rent_documents WHERE id=$1',['event:media-fixture'])).rows[0].metadata;
  assert.equal(metadata.sourceKind,'media');assert.equal(metadata.publisher,'Fixture publisher');
 }finally{await db.close();}
});
