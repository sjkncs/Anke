import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {openStore} from './store.mjs';
import {start} from './server.mjs';

// Reuse an installed browser-test runtime; do not install or execute downloads.
const require=createRequire(import.meta.url);
const {chromium}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright-core');
const dir=await mkdtemp(path.join(os.tmpdir(),'anke-talent-browser-'));
const store=await openStore(path.join(dir,'db'));
let service,browser;
try{
  service=await start({port:0,store});
  browser=await chromium.launch({headless:true,executablePath:'C:/Users/Lenovo/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
  const page=await browser.newPage({viewport:{width:1366,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(service.url);
  await page.locator('[data-page="preferences"]').click();
  await page.locator('#preferenceResult').getByText('租住稳定性',{exact:true}).waitFor();
  assert.equal(await page.locator('#preferenceResult tr').count(),17);
  await page.locator('[data-page="survey"]').click();
  await page.locator('#surveyResult').getByText('情景题（仅用于调查设定）',{exact:true}).waitFor();
  assert.equal(await page.locator('#surveyResult tr').count(),21);
  await page.locator('[data-page="records"]').click();
  await page.locator('#f-id').waitFor();
  const fill=async values=>{for(const [k,v]of Object.entries(values))await page.locator('#f-'+k).fill(String(v));};
  await fill({id:'TEST-A',label:'测试家庭',ruleVersion:'测试规则-非正式政策',priority:1,submittedOn:'2026-01-01',allowedTypes:'测试住房',maxCost:5000,maxCommute:40,minBedrooms:2,latestMoveIn:'2026-12-01','weight-commute':40,'weight-cost':30,'weight-space':20,'weight-quality':10,stage:'学校初审',stageOn:'2026-02-01'});
  await page.locator('#f-eligibility').selectOption('verified');
  await page.getByRole('button',{name:'保存记录',exact:true}).click();
  await page.getByRole('status').filter({hasText:'已保存'}).waitFor();
  await page.locator('#kind').selectOption('unit');
  await fill({id:'TEST-U',project:'测试房源（非实际供应）',type:'测试住房',source:'浏览器测试样本',rent:2000,fees:100,bedrooms:2,quality:80,availableOn:'2026-11-01','commute-TEST-A':10});
  await page.getByRole('button',{name:'保存记录',exact:true}).click();
  await page.locator('#recordList').getByText('TEST-U',{exact:true}).waitFor();
  await page.locator('[data-page="recommend"]').click();
  await page.locator('#find').click();
  await page.locator('#recommendResult').getByText('符合条件',{exact:true}).waitFor();
  assert.ok((await page.locator('#recommendResult').innerText()).includes('2100'));
  const out=new URL('./verification/',import.meta.url);await mkdir(out,{recursive:true});
  await page.screenshot({path:fileURLToPath(new URL('matching-synthetic.png',out)),fullPage:true});
  await page.locator('[data-page="workflow"]').click();await page.locator('#progress').click();
  await page.locator('#progressResult').getByText('学校初审',{exact:true}).waitFor();
  await page.locator('[data-page="allocation"]').click();await page.locator('#simulate').click();
  await page.locator('#allocationResult').getByText('TEST-U',{exact:true}).waitFor();
  assert.equal((await store.all('unit'))[0].status,'available');
  assert.deepEqual(errors,[]);
  console.log('PASS: browser forms, persistence, recommendation, workflow and simulation; synthetic data only.');
}finally{
  if(browser)await browser.close();if(service)await service.close();await store.close();await rm(dir,{recursive:true,force:true});
}
