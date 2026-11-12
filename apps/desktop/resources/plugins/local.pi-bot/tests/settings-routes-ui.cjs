'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require(process.env.PI_BOT_PLAYWRIGHT_MODULE||'C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
test('all eleven settings navigation routes open and preserve an accessible current page',async ctx=>{
  const root=path.resolve(__dirname,'..');
  const html=`<div id="app"></div><script type="module">
import {createFeatures} from '/renderer/features.mjs';
import {SETTINGS_PAGES} from '/renderer/settings-shell.mjs';
const app=document.querySelector('#app'),state={bots:[],rooms:[],prefs:{},jobs:[],schedules:{tasks:[]}};
window.pages=SETTINGS_PAGES;window.errors=[];
const call=async(channel)=>{if(channel==='team.github')return {connected:false};if(channel==='team.connectors')return {servers:[],statuses:[]};if(channel==='team.capabilities')return {items:[]};if(channel==='team.plugins')return [];if(channel==='team.schedules')return {tasks:[]};if(channel==='team.secrets')return [];if(channel==='team.updates')return {status:'current',latest:'0.3.107'};if(channel==='team.extensions')return {};if(channel==='team.attention')return {rows:[],counts:{needs:0,completed:0,issues:0},total:0};throw Error('Isolated unavailable: '+channel);};
window.features=createFeatures({app,call,getState:()=>state,update:()=>{},selectChat:()=>{},onNative:()=>{},notice:message=>window.errors.push(message),editEntity:()=>{},avatar:()=>document.createElement('span'),cluster:()=>document.createElement('span'),assignCapabilities:()=>{},savePreferences:async()=>{}});
await window.features.settings('general');
</script>`;
  const server=http.createServer(async(req,res)=>{try{res.setHeader('Content-Type',req.url==='/'?'text/html;charset=utf-8':'text/javascript');if(req.url==='/')return res.end(html);const file=path.resolve(root,'.'+req.url);if(!file.startsWith(root+path.sep))throw Error('Invalid path');res.end(await fs.readFile(file));}catch(e){res.statusCode=404;res.end(e.message);}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;ctx.after(async()=>{await browser?.close();await new Promise(resolve=>server.close(resolve));});
  browser=await chromium.launch({headless:true});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('dialog[open]').waitFor();
  for(const id of await page.evaluate(()=>window.pages.map(p=>p[0]))){await page.locator('[data-page="'+id+'"].bt-settings-item').click();await page.waitForFunction(id=>document.querySelector('dialog').dataset.page===id,id);assert.equal(await page.locator('.bt-settings-item[aria-current="page"]').count(),1);assert.ok((await page.locator('.bt-settings-head h2').textContent()).length);assert.doesNotMatch(await page.locator('dialog[open]').innerText(),/\bpi(?:[- ]?(?:desktop|bot|agent))?\b/i,id+' exposes legacy branding');}
  assert.deepEqual(errors,[]);await page.evaluate(()=>window.features.close());assert.equal(await page.locator('dialog').count(),0);
});
