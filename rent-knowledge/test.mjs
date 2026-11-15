import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {connect,ingest,exportSnapshot,statistics,setEmbedding,vectorSearch,refreshDocuments} from './store.mjs';
const require=createRequire(import.meta.url);
const {knowledge}=require('../anke-agent-source/apps/desktop/resources/plugins/anke.rents/knowledge.cjs');
const sourceId='a'.repeat(64);
function row(id,date,rent,area,extra={}) {
  return {'统一观测ID':`fixture:${id}:${date}`,'房源ID':id,'平台':'fixture','观测日期':date,'观测日期口径':'synthetic test observation',
    '区县':'南山区','小区名称':'测试小区','月租金_元':String(rent),'面积_平方米':String(area),'出租方式':'整租',
    '数据性质':'当前挂牌，非成交','房源URL':`https://example.com/${id}`,...extra};
}
test('import -> SQL -> exported knowledge -> Agent query preserves dates, strata, means and missing history',async()=>{
  const db=await connect({memory:true});
  const temp=await mkdtemp(path.join(os.tmpdir(),'anke-rent-test-'));
  try {
    const input={sha256:sourceId,sourceFile:'synthetic.csv',usage:'synthetic tests only',rows:[
      row('1','2026-11-07',1000,20),row('2','2026-11-08',4000,40),
      row('3','2026-11-08',200,10,{'出租方式':'合租'}),
      row('4','2026-11-08',500,0,{'区县':''})]};
    await ingest(db,input);await ingest(db,input);
    const stat=(await statistics(db)).find(s=>s.grain==='quarter'&&s.level==='district'&&s.lease==='整租');
    assert.equal(stat.mean_unit_rent,75);assert.equal(stat.median_unit_rent,75);
    assert.ok(Math.abs(stat.area_weighted_unit_rent-5000/60)<1e-9);
    assert.equal(stat.observed_days,2);assert.equal(stat.observations,2);
    await exportSnapshot(db,path.join(temp,'knowledge.json'));
    const snapshot=JSON.parse(await readFile(path.join(temp,'knowledge.json'),'utf8'));
    assert.equal(snapshot.counts.observations,4);assert.equal(snapshot.counts.missing_district,1);
    const details=JSON.parse(await readFile(path.join(temp,'records.json'),'utf8'));
    assert.equal(details.records.filter(r=>r.dataset==='imported').length,4);
    assert.deepEqual([...new Set(details.records.map(r=>r.date))].sort(),['2026-11-07','2026-11-08']);
    const {query}=require('../anke-agent-source/apps/desktop/resources/plugins/anke.rents/query.cjs');
    const detailAnswer=query({district:'南山',lease:'整租'},details);
    assert.equal(detailAnswer.count,2);
    assert.equal(detailAnswer.unitRentMedian,stat.median_unit_rent);
    assert.equal(knowledge({action:'coverage'},snapshot).periods.filter(p=>p.year<=2025&&p.observations!==0).length,0);
    assert.equal(knowledge({action:'statistics',year:2025},snapshot).status,'no_observations');
    const answer=knowledge({action:'statistics',year:2026,quarter:4,district:'南山',lease:'整租'},snapshot);
    assert.equal(answer.results[0].mean_unit_rent,75);assert.equal(answer.citations.length,2);
    assert.equal(knowledge({action:'statistics',recordType:'成交'},snapshot).total,0);
    const retrieved=knowledge({action:'search',query:'南山租金',year:2026,lease:'整租'},snapshot);
    assert.ok(retrieved.results.length);
    assert.ok(retrieved.citations.every(c=>c.lease==='整租'));
    assert.equal(knowledge({action:'search',query:'南山租金',year:2025},snapshot).total,0);
    for(const bad of [{year:'2026'},{quarter:5},{query:{}},{limit:0},{action:'sql',sql:'DROP TABLE x'}])assert.throws(()=>knowledge(bad,snapshot));
    await assert.rejects(()=>ingest(db,{...input,rows:[row('5','2025-02-30',1,1)]}));
    await assert.rejects(()=>ingest(db,{...input,rows:[input.rows[0],input.rows[0]]}));
    await assert.rejects(()=>ingest(db,{...input,sha256:'b'.repeat(64)}));
    assert.equal((await db.query('SELECT count(*)::integer AS n FROM rent_sources')).rows[0].n,1);
  } finally {await db.close();await rm(temp,{recursive:true});}
});
test('pgvector cosine search isolates model and dimensions; refresh preserves unchanged embeddings',async()=>{
  const db=await connect({memory:true});
  try {
    await ingest(db,{sha256:sourceId,sourceFile:'fixture.csv',usage:'synthetic',rows:[row('1','2026-11-07',1000,20)]});
    const stats=await statistics(db);await refreshDocuments(db,stats);
    const docs=(await db.query('SELECT id FROM rent_documents ORDER BY id')).rows;
    await setEmbedding(db,docs[0].id,[1,0,0],'synthetic-test-model');
    await setEmbedding(db,docs[1].id,[0,1,0],'synthetic-test-model');
    await setEmbedding(db,docs[2].id,[1,0,0],'different-model');
    assert.equal((await vectorSearch(db,[1,0,0],'synthetic-test-model'))[0].id,docs[0].id);
    assert.equal((await vectorSearch(db,[1,0],'synthetic-test-model')).length,0);
    await refreshDocuments(db,stats);
    assert.equal((await vectorSearch(db,[1,0,0],'synthetic-test-model')).length,2);
    await assert.rejects(()=>setEmbedding(db,docs[0].id,[0,0,0],'x'));
    await assert.rejects(()=>setEmbedding(db,'missing',[1,0,0],'x'));
  } finally {await db.close();}
});
