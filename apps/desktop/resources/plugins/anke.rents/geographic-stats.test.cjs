const {test}=require('node:test'),assert=require('node:assert/strict');
const {geographicStats}=require('./geographic-stats.cjs');
test('official community evidence fills geography without inventing an address or crossing district',()=>{
 const {enrich}=require('./geography.cjs');const rows=enrich([{dataset:'imported',project:'会展湾东城',district:'宝安'},{dataset:'imported',project:'华强城花园一期',district:'宝安'},{dataset:'imported',project:'会展湾东城',district:'南山'}]);
 assert.equal(rows[0].street,'福海街道');assert.match(rows[0].address,/凤塘大道/);assert.equal(rows[1].street,'福海街道');assert.equal(rows[1].address,undefined);assert.equal(rows[2].street,undefined);
});
test('raw street field is carried through listing normalization',async()=>{
 const {listingFields}=await import('../../../../../../rent-knowledge/listing-fields.mjs');assert.equal(listingFields({'乡镇街道':'福海街道'}).street,'福海街道');
});
test('public project evidence supplies streets without spreading building addresses or phase aliases',()=>{
 const {enrich}=require('./geography.cjs');
 const rows=enrich([
  {dataset:'imported',project:'会展湾南岸',district:'宝安'},
  {dataset:'imported',project:'同泰时代中心',district:'宝安'},
  {dataset:'imported',project:'鸿荣源·珈誉府',district:'宝安'},
  {dataset:'imported',project:'益田御龙天地',district:'罗湖'},
  {dataset:'imported',project:'鸿荣源·珈誉府二期',district:'宝安'},
  {dataset:'imported',project:'益田御龙天地',district:'南山'}
 ]);
 assert.deepEqual(rows.slice(0,4).map(r=>r.street),['福海街道','福海街道','新桥街道','翠竹街道']);
 for(const r of rows.slice(0,4)){assert.match(r.streetSource.url,/^https:\/\//);assert.equal(r.streetSource.checkedOn,'2026-11-14');}
 assert.equal(rows[4].street,undefined);assert.equal(rows[5].street,undefined);
 assert.ok(!rows[0].address?.includes('A2'));assert.ok(!rows[1].address?.includes('510'));
 const groups=geographicStats(rows.slice(0,4).map((r,i)=>({...r,source:'fixture',listingId:String(i),record_type:'挂牌',lease:'整租',date:'2026-11-14',area:50,rent:2500})))[0].groups;
 assert.equal(groups.find(g=>g.level==='street'&&g.name==='福海街道').current.count,2);
});
test('second evidence batch preserves disclosed values and excludes missing districts',()=>{
 const {enrich}=require('./geography.cjs');
 const cases=[['KPR佳兆业广场','大鹏新区','大鹏街道'],['中粮云景广场写字楼','光明','马田街道'],['会展湾中港','宝安','福海街道'],['深业中城(公寓)','福田','香蜜湖街道'],['市政大院','福田','莲花街道'],['深城投·中心公馆','坪山','坪山街道']];
 for(const [project,district,street] of cases){
  const [r,missing,disclosed]=enrich([{dataset:'imported',project,district},{dataset:'imported',project,district:''},{dataset:'imported',project,district,address:'Disclosed source address'}]);
  assert.equal(r.street,street);assert.match(r.streetSource.url,/^https:\/\//);assert.equal(missing.street,undefined);assert.equal(disclosed.address,'Disclosed source address');
  assert.ok(!r.address||!/(3805|1208|217|212)/.test(r.address));
 }
});
test('third evidence batch keeps phase boundaries and unresolved names outside street groups',()=>{
 const {enrich}=require('./geography.cjs');
 const cases=[['中洲滨海华府三期','福田','沙头街道'],['碧湖春天','坪山','碧岭街道'],['金地香蜜山','福田','香蜜湖街道'],['泥围新村','光明','马田街道'],['香蜜新村','福田','莲花街道'],['塘尾城市花园','宝安','福海街道']];
 for(const [project,district,street] of cases){
  const [r,missing,original]=enrich([{dataset:'imported',project,district},{dataset:'imported',project,district:''},{dataset:'imported',project,district,address:'Original address'}]);
  assert.equal(r.street,street);assert.ok(r.streetSource.url);assert.equal(missing.street,undefined);assert.equal(original.address,'Original address');
 }
 const unresolved=enrich([{dataset:'imported',project:'中洲滨海华府二期',district:'福田'},{dataset:'imported',project:'龙光玖云著',district:'坪山'},{dataset:'imported',project:'宝能公馆V-HOUSE(',district:'福田'}]);
 assert.ok(unresolved.every(r=>!r.street));
});
test('fourth evidence batch matches exact project phases and districts',()=>{
 const {enrich}=require('./geography.cjs');
 const cases=[['金地梅陇镇四期','龙华','民治街道'],['锦荟PARK','龙岗','横岗街道'],['珑城原点广场','龙岗','龙城街道'],['碧海富通城三期','宝安','西乡街道'],['龙光玖钻','龙华','民治街道'],['天健天骄南苑','福田','莲花街道']];
 for(const [project,district,street] of cases){
  const [r,missing,original]=enrich([{dataset:'imported',project,district},{dataset:'imported',project,district:''},{dataset:'imported',project,district,address:'Original address'}]);
  assert.equal(r.street,street);assert.ok(r.streetSource.url);assert.equal(missing.street,undefined);assert.equal(original.address,'Original address');
 }
 const otherPhases=enrich([{dataset:'imported',project:'金地梅陇镇三期',district:'龙华'},{dataset:'imported',project:'碧海富通城二期',district:'宝安'},{dataset:'imported',project:'天健天骄北苑',district:'福田'}]);
 assert.ok(otherPhases.every(r=>!r.street));
});
test('shared addresses persist to a sidecar; street labels exclude city and district prefixes',t=>{
 const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'anke-address-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'addresses.json'),{save,enrich}=require('./geography.cjs');
 const input={project:'Fixture',district:'南山',address:'测试路1号',source:'fixture'};assert.equal(save(input,file).saved,true);assert.equal(JSON.parse(fs.readFileSync(file)).projects[0].address,input.address);save({...input,address:'测试路2号'},file);assert.equal(JSON.parse(fs.readFileSync(file)).projects.length,1);assert.throws(()=>save({...input,district:'布吉'},file));
 assert.equal(enrich([{dataset:'imported',district:'龙岗',project:'Fixture',address:'深圳市龙岗区横岗街道测试路1号'}])[0].street,'横岗街道');
});
const row=(id,date,rent,extra={})=>({dataset:'imported',listingId:id,source:'fixture',project:'fixture',district:'南山',street:'桃源街道',record_type:'挂牌',lease:'整租',area:10,rent,date,...extra});
test('sample composition changes while matched rents stay stable; duplicates do not reweight',()=>{
 const a=row('1','2026-11-12',100),b=row('1','2026-11-13',100),c=row('2','2026-11-13',300);
 const stats=geographicStats([a,a,b,c])[0],city=stats.groups[0];
 assert.equal(city.previous.count,1);assert.equal(city.current.meanUnitRent,20);assert.equal(city.sampleChange.percent,100);assert.equal(city.pairedChange.percent,0);assert.equal(city.pairedChange.count,1);
 assert.equal(stats.groups.find(g=>g.level==='street').name,'桃源街道');
});
test('conflicting prices, changed areas, invalid dates and missing geography are explicit',()=>{
 const stats=geographicStats([row('1','2026-11-12',100),row('1','2026-11-13',100),row('1','2026-11-13',120),row('2','2026-11-13',200,{district:'',street:''}),row('3','2026-02-30',100)])[0];
 assert.equal(stats.groups[0].current.conflictingListings,1);assert.equal(stats.groups[0].pairedChange,null);assert.equal(stats.missingDistrict,1);assert.equal(stats.missingStreet,1);
 assert.equal(geographicStats([row('1','2026-11-12',100),row('1','2026-11-13',100,{area:20})])[0].groups[0].pairedChange,null);
 assert.equal(geographicStats([row('1','2026-11-12',100),row('2','2026-11-13',100,{lease:'合租'})]).length,2);
});
