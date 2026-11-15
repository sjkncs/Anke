'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright-core');
test('visible service entries use local artwork and enter the correct existing chat',async ctx=>{
  const root=path.resolve(__dirname,'..');
  const html=`<html><head><meta charset="utf-8"></head><body style="margin:24px;background:#f5f5f5;font:14px Arial"><div id="list" style="width:256px"></div><div id="chosen"></div><script type="module">import {renderServiceLauncher,SERVICE_ENTRIES} from '/renderer/service-launcher.mjs';const state={bots:SERVICE_ENTRIES.map(([id,name])=>({id:'bot-'+id,name,ankeServicePreset:id}))};renderServiceLauncher(document.querySelector('#list'),state,(kind,id)=>{document.querySelector('#chosen').textContent=kind+':'+id;});</script></body></html>`;
  const server=http.createServer(async(req,res)=>{try{
    if(req.url==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');return res.end(html);}
    const file=path.resolve(root,'.'+req.url);if(!file.startsWith(root+path.sep)||file.endsWith('.png'))throw Error('Images are not served by the plugin module protocol');
    res.setHeader('Content-Type',file.endsWith('.png')?'image/png':'text/javascript');res.end(await fs.readFile(file));
  }catch{res.statusCode=404;res.end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  ctx.after(async()=>{await browser?.close();await new Promise(r=>server.close(r));});
  browser=await chromium.launch({headless:true,executablePath:'C:/Users/Lenovo/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByRole('button',{name:'教育培训',exact:true}).click();assert.equal(await page.locator('#chosen').innerText(),'bot:bot-education');
  await page.getByRole('button',{name:'外卖配送',exact:true}).click();assert.equal(await page.locator('#chosen').innerText(),'bot:bot-food');
  for(const [label,key] of [['财富管理','wealth'],['职业规划','career']]){
    await page.getByRole('button',{name:label,exact:true}).click();assert.equal(await page.locator('#chosen').innerText(),'bot:bot-'+key);
  }
  for(const [label,key] of [['知识库','knowledge'],['科研中心','research'],['日常饮食','diet'],['锻炼计划','exercise'],['营养搭配','nutrition'],['阳明讲堂','yangming'],['购物清单','shopping'],['旅游计划','travel'],['行程管理','itinerary']]){
    await page.getByRole('button',{name:label,exact:true}).click();assert.equal(await page.locator('#chosen').innerText(),'bot:bot-'+key);
  }
  for(const [label,count] of [['终身学习',3],['修身养性',4],['购物旅游',3]]) assert.equal(await page.locator('section[aria-label="'+label+'"]').locator('.anke-service-entry').count(),count);
  assert.equal(await page.locator('.anke-service-entry').count(),29);
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth===256));
  assert.equal(new Set(await page.locator('img').evaluateAll(xs=>xs.map(x=>x.src))).size,17);assert.deepEqual(errors,[]);
  await fs.mkdir(path.join(root,'output'),{recursive:true});await page.screenshot({path:path.join(root,'output/service-launcher.png'),fullPage:true});
});
