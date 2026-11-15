import {createRequire} from 'node:module';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {openStore} from './store.mjs';
import {start} from './server.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright-core');
const dir=await mkdtemp(path.join(os.tmpdir(),'anke-news-ui-'));
const store=await openStore(path.join(dir,'db'));
let service,browser;
try{
  service=await start({port:0,store});
  browser=await chromium.launch({headless:true,executablePath:'C:/Users/Lenovo/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',args:['--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(service.url+'/workspace/');await page.waitForFunction(()=>window.housingReady);
  await page.click('[data-tab="events"]');await page.locator('.news-card').first().waitFor();
  const card=page.locator('.news-card').filter({hasText:'媒体报道'}).first();
  await card.locator('summary').click();assert.equal(await card.getAttribute('open'),'');
  assert.match(await card.innerText(),/报道摘要/);
  assert.match(await card.locator('a').getAttribute('href'),/^https:\/\/view\.inews\.qq\.com\//);
  const id=await card.getAttribute('data-id');await page.evaluate(()=>refreshEvents());
  assert.equal(await page.locator(`details[data-id="${id}"]`).getAttribute('open'),'');
  await page.locator(`details[data-id="${id}"] summary`).focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator(`details[data-id="${id}"]`).getAttribute('open'),null);
  await page.locator(`details[data-id="${id}"] summary`).click();
  await mkdir(new URL('./verification/news/',import.meta.url),{recursive:true});
  await page.screenshot({path:fileURLToPath(new URL('./verification/news/news-cards.png',import.meta.url)),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  console.log('PASS: real snapshot cards, source link, expand, keyboard, refresh preservation, mobile width; isolated browser only');
}finally{
  if(browser)await browser.close();if(service)await service.close();await store.close();
  await rm(dir,{recursive:true,force:true});
}
