const {test} = require('node:test');
const assert = require('node:assert/strict');
const {query} = require('./query.cjs');
test('real and demo data stay separate and empty imported data stays empty',()=>{
  const demo=query({dataset:'demo',recordType:'挂牌',lease:'整租'});
  assert.equal(demo.count,320);assert.equal(demo.coveredDistricts,10);
  assert.ok(query({dataset:'imported'}).rows.every(r=>r.dataset==='imported'));
  assert.equal(query({dataset:'imported'},{records:[],updatedAt:'fixture'}).count,0);
  const district=query({dataset:'demo',district:'南山',recordType:'挂牌',lease:'整租'});
  assert.equal(district.count,32);assert.ok(district.rows.every(r=>r.district==='南山'&&r.record_type==='挂牌'&&r.lease==='整租'));
  assert.ok(district.rows.every(r=>r.source==='内置演示数据（非市场实测）'));
});
test('mixed strata never publish a pooled comparison',()=>{
  const data=query({dataset:'demo'});assert.equal(data.count,480);
  assert.equal(data.unitRentMedian,null);assert.deepEqual(data.districts,[]);assert.ok(data.strata.length>1);
});
test('unknown district records do not inflate district coverage',()=>{
  const base={dataset:'imported',project:'fixture',date:'2026-11-12',record_type:'挂牌',lease:'整租',rent:1000,area:20};
  const result=query({}, {records:[{...base,district:'南山'},{...base,district:'未知'},{...base,district:''}]});
  assert.equal(result.count,3);assert.equal(result.coveredDistricts,1);
});
test('unknown filters and unsupported enums fail',()=>{
  for(const input of [{dataset:'all'},{district:'广州'},{recordType:'未知'},{lease:'混合'},{query:3},{path:'secret'}])assert.throws(()=>query(input));
});

test('missing rents/areas stay outside medians; sync status uses the registered contract',()=>{
  const rows=[{dataset:'imported',project:'test',district:'南山',date:'2026-11-12',record_type:'挂牌',lease:'整租',rent:1000,area:20},
    {dataset:'imported',project:'test',district:'南山',date:'2026-11-12',record_type:'挂牌',lease:'整租',rent:1000,area:null}];
  assert.equal(query({}, {records:rows}).unitRentMedian,50);
  const manifest=require('./manifest.json');
  assert.ok(manifest.contributes.agentTools.find(t=>t.name==='ShenzhenRentKnowledge').schema.properties.action.enum.includes('sync_status'));
  const state=require('./knowledge.cjs').knowledge({action:'sync_status'});
  assert.ok(state.status==='not_configured'||state.streaming===false);
});
test('panel routing rejects arbitrary paths and non-Baidu navigation',async()=>{
  const {onPanelInvoke}=require('./main.js');
  await assert.rejects(()=>onPanelInvoke('fs.read',{path:'x'}));
  for(const url of ['file:///c:/test','https://example.com','https://map.baidu.com.evil.test','https://name@map.baidu.com'])await assert.rejects(()=>onPanelInvoke('rents.openMap',{url}));
  assert.equal((await onPanelInvoke('rents.query',{dataset:'demo',district:'福田',recordType:'挂牌',lease:'整租'})).count,32);
});
test('registered Agent tool queries the same snapshot and unload releases registrations',async()=>{
  const registrations=[],removed=[];
  global.pi={commands:{register:async x=>registrations.push(x),unregister:async x=>removed.push(x)},
    ui:{openPanel:async()=>{},notify:async()=>{}},
    plugin:{getSettings:async()=>({}),setSettings:async()=>{}},
    agent:{registerTool:async x=>registrations.push(x),unregisterTool:async x=>removed.push(x)}};
  try {
    const {onLoad,onUnload}=require('./main.js');await onLoad();
    const tool=registrations.find(x=>x.name==='ShenzhenRents');assert.ok(tool);
    assert.equal((await tool.execute({dataset:'demo',recordType:'挂牌',lease:'整租'})).count,320);
    assert.equal((await tool.execute({dataset:'imported'})).count,query({dataset:'imported'}).count);
    assert.equal(registrations.filter(x=>x.id?.startsWith('anke.rents.')).length,6);
    await registrations.find(x=>x.id==='anke.rents.scenario').run();
    assert.equal(await require('./main.js').onPanelInvoke('rents.module'), 'scenario');
    const knowledgeTool=registrations.find(x=>x.name==='ShenzhenRentKnowledge');assert.ok(knowledgeTool);
    assert.equal((await knowledgeTool.execute({action:'coverage'})).city,'深圳市');
    assert.ok(registrations.some(x=>x.name==='AnkeHousing'));assert.ok(registrations.some(x=>x.name==='ZhuXiaoZhi'));
    await onUnload();assert.deepEqual(removed,['AnkeHousing','ZhuXiaoZhi','ShenzhenRentEvents','anke.rents.open','ShenzhenRents','ShenzhenRentKnowledge','ResidentialEnvironment',...['overview','ledger','projects','scenario','map'].map(id=>`anke.rents.${id}`)]);
  } finally {delete global.pi;}
});
