import {test} from 'node:test';
import assert from 'node:assert/strict';
import {listingFields} from './listing-fields.mjs';
test('export retains disclosed attributes without inventing addresses or monthly fees',()=>{
 const raw={'标题':'测试小区2室1厅','位置描述':'南山 桃源','物业费':'5元/㎡/月','建筑年份':'2018','所在楼层':'中层/20层','房屋朝向':'南','图片URL':'https://example.org/photo.jpg'};
 const row=listingFields(raw);
 assert.equal(row.layout,'2室1厅');assert.equal(row.address,'');assert.equal(row.position,'南山 桃源');
 assert.equal(row.fee,null);assert.equal(row.buildingYear,'2018');assert.equal(row.age,'');
 assert.equal(row.floor,'中层/20层');assert.equal(row.orientation,'南');assert.deepEqual(row.sourceFields,raw);
 assert.equal(row.location,null);
 assert.equal(listingFields({'详细地址':'桃源路1号','物业费_元每月':'200'}).fee,200);
 assert.equal(listingFields({'详细地址':'桃源路1号'}).address,'桃源路1号');
});
