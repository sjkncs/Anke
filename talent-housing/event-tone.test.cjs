const {test}=require('node:test');
const assert=require('node:assert/strict');
const {analyze}=require('./event-tone.cjs');
test('tenant perspective distinguishes rent directions',()=>{
 assert.equal(analyze('深圳租金下调，地铁正式开通。').polarity,'positive');
 assert.equal(analyze('深圳房租上涨。').polarity,'negative');
 assert.equal(analyze('沪深住宅租金连涨8个月').polarity,'negative');
 assert.equal(analyze('实施临时交通管控措施').polarity,'negative');
 assert.equal(analyze('租金下调，但交通管制。').polarity,'mixed');
});
test('negated, conditional, planned and uncertain statements are not positive facts',()=>{
 for(const s of ['租金未下降','未降低租金','地铁尚未开通','地铁预计开通','如果租金下调','是否新增房源','租金上涨并不意味着租金优惠'])assert.notEqual(analyze(s).polarity,'positive',s);
});
test('insufficient evidence remains neutral, provenance preserved',()=>{
 assert.equal(analyze('深圳发布住房情况通知').polarity,'neutral');
 const result=analyze('租金补贴');assert.equal(result.method,'clause-lexicon-v2');assert.equal(result.estimatedRentImpact,false);assert.equal(result.evidence[0].text,'租金补贴');
});
test('negation stays in its clause and does not swallow a later benefit',()=>{
 assert.equal(analyze('租金未上涨，但住房补贴增加').polarity,'positive');
 assert.equal(analyze('地铁尚未开通，租金下调').polarity,'positive');
 assert.equal(analyze('地铁开通未获批准').polarity,'neutral');
});
test('ended restrictions and proposals are not current negative facts',()=>{
 for(const s of ['临时限行已经解除','交通管制措施已结束','拟实施临时交通管理'])assert.equal(analyze(s).polarity,'neutral',s);
 assert.equal(analyze('关于地铁工程施工期间调整交通组织的通告').polarity,'negative');
});
