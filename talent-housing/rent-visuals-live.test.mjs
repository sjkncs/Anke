import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {start} from './server.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright-core');

test('standalone workspace loads real rental snapshot and visualization assets',async t=>{
 // No access to the user's application database. Rental queries read the real snapshot.
 const live=process.env.ANKE_RENT_LIVE==='1';
 const service=live?{url:'http://127.0.0.1:47831',close:async()=>{}}:await start({port:0,store:{all:async()=>[],execute:async input=>{
  assert.equal(input.action,'workspace');return {applications:[],units:[],orders:[]};
 }}});
 const browser=await chromium.launch({headless:true});t.after(async()=>{await browser.close();await service.close();});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 if(live)await page.route('**/api',async route=>{const input=route.request().postDataJSON();if(!['workspace','market_query','market_events','search_homes'].includes(input?.action))throw Error('Live verification permits read-only actions only');await route.continue();});
 page.on('pageerror',e=>errors.push(e.message));
 for(const asset of ['rent-visuals.js','rent-visuals.css']){const response=await fetch(service.url+'/workspace/'+asset);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),asset.endsWith('.css')?/text\/css/:/javascript/);}
 assert.equal((await fetch(service.url+'/workspace/..%2Fstore.mjs')).status,404);
 await page.goto(service.url+'/workspace/');await page.waitForFunction(()=>window.housingReady);
 await page.getByRole('button',{name:'租金看板',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.rv-tiles button').length>0);
 assert.equal(await page.locator('.filters').isVisible(),true);
 const unknown=page.getByRole('button',{name:/行政区待核实/});if(await unknown.count())assert.equal(await unknown.isDisabled(),true);
 const counts=await page.evaluate(()=>({projects:document.querySelectorAll('.rv-tiles button').length,summary:document.querySelector('.rv-stamp').textContent}));assert.ok(counts.projects>0);
 await page.locator('.rv-tiles button').first().click();assert.equal(await page.locator('.rv-detail').isVisible(),true);
 await page.getByRole('button',{name:'关闭详情',exact:true}).click();await page.evaluate(()=>scrollTo(0,0));
 await mkdir(new URL('./verification/rent-visuals/',import.meta.url),{recursive:true});await page.screenshot({path:fileURLToPath(new URL('./verification/rent-visuals/'+(live?'running-service.png':'real-snapshot.png'),import.meta.url)),fullPage:false});
  await page.getByLabel('行政区',{exact:true}).selectOption('南山');await page.waitForFunction(()=>{const tiles=[...document.querySelectorAll('.rv-tiles button')];return tiles.length>0&&tiles.every(n=>n.title.includes(' · 南山 · '));});
  await page.getByLabel('行政区',{exact:true}).selectOption('光明');await page.getByLabel('搜索项目、地址',{exact:true}).fill('乐府广场');
  await page.locator('[data-tab="ledger"]').click();await page.waitForFunction(()=>{const rows=[...document.querySelectorAll('#ledgerTable tbody tr')];return rows.length===2&&rows.every(r=>r.textContent.includes('乐府广场')&&r.textContent.includes('光明大道481号'));});
  assert.match(await page.locator('#ledgerTable tbody').textContent(),/1室1厅/);
  assert.match(await page.locator('#ledgerTable tbody').textContent(),/凤凰街道/);
  assert.match(await page.locator('#ledgerTable .event-sources').textContent(),/具体地址\s+2\/2/);
  await page.getByLabel('租金统计层级',{exact:true}).selectOption('street');assert.match(await page.locator('#geographicRentStats').textContent(),/凤凰街道/);assert.match(await page.locator('#geographicRentStats').textContent(),/同房源变化/);
  await page.locator('[data-tab="ledger"]').click();
  const ledger=page.locator('.market-ledger-scroll');await ledger.waitFor({state:'visible'});assert.equal(await ledger.evaluate(el=>el.scrollWidth>el.clientWidth),true);
  await page.screenshot({path:fileURLToPath(new URL('./verification/rent-visuals/market-ledger-real.png',import.meta.url))});
  await page.getByRole('button',{name:'租金看板',exact:true}).click();
 await page.getByLabel('搜索项目、地址',{exact:true}).fill('__no_matching_residence__');await page.waitForFunction(()=>document.querySelector('.rv-tiles').textContent.includes('没有小区样本'));
 assert.equal(await page.locator('.rv-detail').isVisible(),false);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({scope:live?'running service, read-only verification':'real rental snapshot, isolated housing state',...counts}));
});
