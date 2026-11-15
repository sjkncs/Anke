import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {start} from './server.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright-core');
const service=await start({port:0});
let browser;
try {
  browser=await chromium.launch({headless:true,executablePath:'C:/Users/Lenovo/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error')console.error(message.text());});
  await page.goto(service.url+'/workspace/');
  await page.waitForFunction(()=>window.ankeSpatialStatus?.ready,{},{timeout:120000});
  const status=await page.evaluate(()=>window.ankeSpatialStatus);
  assert.equal(status.failed,0);assert.equal(status.loaded,6);assert.equal(status.triangles,2750476);
  assert.equal(await page.locator('#spatialEmpty').isVisible(),false);
  await mkdir(new URL('./verification/',import.meta.url),{recursive:true});
  await page.screenshot({path:fileURLToPath(new URL('./verification/city-overview.png',import.meta.url)),fullPage:true});
  await page.getByLabel('查看模型分区').selectOption('nanshan');
  await page.screenshot({path:fileURLToPath(new URL('./verification/city-nanshan.png',import.meta.url)),fullPage:true});
  await page.evaluate(()=>window.updateHousingSpatial([
    {id:'TEST-POINT',project:'Synthetic marker',location:{crs:'WGS84',longitude:113.95,latitude:22.55}},
    {id:'MISSING',project:'No coordinates'},
    {id:'UNKNOWN',location:{crs:'unknown',longitude:113.95,latitude:22.55}}
  ]));
  assert.equal(await page.evaluate(()=>window.ankeSpatialStatus.pins),1);
  await page.getByRole('button',{name:'实景',exact:true}).click();
  await page.locator('#realityFile').setInputFiles(fileURLToPath(new URL('../verification_v3/synthetic_ellipsoid.splat',import.meta.url)));
  await page.locator('#realityLon').fill('113.95');await page.locator('#realityLat').fill('22.55');
  await page.locator('#realityLoad').click();
  await page.waitForFunction(()=>['loaded','error'].includes(window.ankeRealityStatus?.state),{},{timeout:60000});
  assert.equal(await page.evaluate(()=>window.ankeRealityStatus.state),'loaded',await page.locator('#realityState').innerText());
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await page.waitForTimeout(600);
  await page.screenshot({path:fileURLToPath(new URL('./verification/city-synthetic-splat.png',import.meta.url)),fullPage:true});
  await page.getByRole('button',{name:'实景',exact:true}).click();await page.locator('#realityRemove').click();
  await page.waitForFunction(()=>window.ankeRealityStatus.state==='empty');
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  assert.equal((await page.request.get(service.url+'/workspace/city/unknown.js')).status(),404);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',...status,checks:['six district meshes','WebGL render','district focus','unknown coordinates excluded','asset allowlist','no page errors']}));
} finally {await browser?.close();await service.close();}
