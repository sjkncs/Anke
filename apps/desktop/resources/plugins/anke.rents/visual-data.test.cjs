const {test}=require('node:test'),assert=require('node:assert/strict');
const {query}=require('./query.cjs');
const base={dataset:'imported',project:'Fixture',district:'南山',date:'2026-01-12',record_type:'挂牌',lease:'整租',rent:1000,area:20};
test('rent change compares dated homogeneous samples and never invents missing history',()=>{
 const {rentChange}=require('./visual-data.cjs');
 assert.equal(rentChange([base]),null);
 const after={...base,date:'2026-01-13',rent:1200};
 const up=rentChange([after,base]);assert.equal(up.amount,10);assert.equal(up.percent,20);assert.equal(up.previousDate,base.date);
 assert.equal(rentChange([base,{...after,rent:800}]).percent,-20);
 assert.equal(rentChange([base,{...after,rent:1000}]).percent,0);
 assert.equal(rentChange([base,{...after,source:'other'}]),null);
 assert.equal(rentChange([base,{...after,lease:'合租'}]),null);
 assert.equal(rentChange([base,{...after,date:'2026-02-30'}]),null);
});
test('visual aggregation uses all matches beyond ledger cap and separates districts',()=>{
 const records=Array.from({length:600},(_,i)=>({...base,date:i<300?'2026-01-12':'2026-04-12',rent:i<300?1000:2000}));records.push({...base,district:'福田'});
 const result=query({dataset:'imported',recordType:'挂牌',lease:'整租'},{records});
 assert.equal(result.rows.length,500);assert.equal(result.visual.projects.length,2);assert.equal(result.visual.projects[0].count,600);assert.equal(result.visual.projects[0].rows.length,100);
 assert.deepEqual(result.visual.quarters,[{date:'2026-Q1',value:50,count:301},{date:'2026-Q2',value:100,count:300}]);
});
test('invalid observations do not produce rent values or fabricated history',()=>{
 const {visualData,series}=require('./visual-data.cjs');
 assert.deepEqual(series([{...base,date:'2026-02-30'},{...base,rent:null},{...base,area:0}],'month'),[]);
 assert.deepEqual(series([base],'month'),[{date:'2026-01',value:50,count:1}]);
 assert.equal(visualData([base],false).projects.length,0);
});
