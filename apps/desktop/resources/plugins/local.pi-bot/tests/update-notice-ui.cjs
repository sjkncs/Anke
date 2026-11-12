'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require(process.env.PI_BOT_PLAYWRIGHT_MODULE||'C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
test('footer update notice deduplicates notifications, respects preferences and disposes',async ctx=>{
 const root=path.resolve(__dirname,'..');
 const html=`<!doctype html><footer id="footer"></footer><script type="module">
 import {createUpdateNotice,UPDATE_RESULT,UPDATE_PREF} from '/renderer/update-notice.mjs';
 window.notifications=[];window.opens=0;
 window.Notification=class {static permission='granted';constructor(title,options){window.notifications.push({title,options});}};
 window.emit=result=>window.dispatchEvent(new CustomEvent(UPDATE_RESULT,{detail:result}));
 window.pref=UPDATE_PREF;
 window.handle=createUpdateNotice({host:document.querySelector('footer'),call:async()=>({status:'unconfigured'}),openAbout:()=>window.opens++});
 window.ready=true;</script>`;
 const server=http.createServer(async(req,res)=>{try{res.setHeader('Content-Type',req.url==='/'?'text/html;charset=utf-8':'text/javascript');if(req.url==='/')return res.end(html);const file=path.resolve(root,'.'+req.url);if(!file.startsWith(root+path.sep))throw Error('Invalid path');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;ctx.after(async()=>{await browser?.close();await new Promise(r=>server.close(r));});
 browser=await chromium.launch({headless:true});const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);
 await page.evaluate(()=>{window.emit({status:'available',latest:'0.22.0'});window.emit({status:'available',latest:'0.22.0'});});
 assert.equal(await page.evaluate(()=>window.notifications.length),1);assert.equal(await page.locator('footer #update-check:visible').count(),1);
 await page.locator('#update-check').click();assert.equal(await page.evaluate(()=>window.opens),1);
 await page.evaluate(()=>{localStorage.setItem(window.pref,'false');window.emit({status:'available',latest:'0.23.0'});});
 assert.equal(await page.locator('#update-check:visible').count(),0);assert.equal(await page.evaluate(()=>window.notifications.length),1);
 await page.evaluate(()=>{localStorage.removeItem(window.pref);window.emit({status:'unconfigured'});});assert.equal(await page.locator('#update-check:visible').count(),0);
 await page.evaluate(()=>{window.handle.dispose();window.emit({status:'available',latest:'0.24.0'});});assert.equal(await page.locator('#update-check').count(),0);assert.equal(await page.evaluate(()=>window.notifications.length),1);
});
