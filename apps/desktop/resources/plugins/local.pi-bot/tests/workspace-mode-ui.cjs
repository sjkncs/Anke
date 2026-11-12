'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require(process.env.PI_BOT_PLAYWRIGHT_MODULE||'playwright');
const adapter=fs.readFileSync(path.join(__dirname,'../renderer/workspace-sidebar.mjs'),'utf8');
const html=`<!doctype html><style>
html,body{margin:0;height:100%}.work-panel{position:fixed;left:0;top:0;width:100%;height:100%;background:white}
#bot{position:fixed;inset:0;background:#fafafa}#host{position:fixed;inset:0;pointer-events:none}#root{position:fixed;inset:0}
</style><div class="app-shell"><button class="app-work-panel-toggle" aria-pressed="false">Panel</button></div>
<div id="host"><div id="root"></div></div><script type="module">
import {attachWorkspaceSidebar} from '/adapter.mjs';
const root=document.querySelector('#root');root.attachShadow({mode:'open'}).innerHTML='<div class="pi-bot-app">Bot workspace</div>';
const control=document.querySelector('button');window.closeCount=0;
control.onclick=()=>{const panel=document.querySelector('.work-panel');if(panel){window.closeCount++;control.setAttribute('aria-pressed','false');panel.classList.add('is-exiting');setTimeout(()=>panel.remove(),30);}else{control.setAttribute('aria-pressed','true');const panel=document.createElement('aside');panel.className='work-panel';panel.textContent='Agent preview';document.querySelector('.app-shell').append(panel);}};
window.workspace=attachWorkspaceSidebar(root);window.ready=true;
</script>`;
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/adapter.mjs'?'text/javascript':'text/html');res.end(req.url==='/adapter.mjs'?adapter:html);});
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true});const page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);
  // Agent preview remains open when the user enters Bot mode.
  await page.locator('button').click();await page.evaluate(()=>window.workspace.setActive(true));
  assert.equal(await page.locator('button').getAttribute('aria-pressed'),'false','Entering Bot must collapse the inherited Agent preview');
  await page.waitForFunction(()=>!document.querySelector('.work-panel'));
  assert.equal(await page.evaluate(()=>window.closeCount),1);
  // Bot can still explicitly open and close its own native workspace.
  await page.evaluate(()=>window.workspace.toggle());
  assert.equal(await page.locator('button').getAttribute('aria-pressed'),'true');
  await page.evaluate(()=>window.workspace.setActive(true));
  assert.equal(await page.locator('button').getAttribute('aria-pressed'),'true','Repeated activation must preserve the Bot-owned workspace');
  await page.evaluate(()=>window.workspace.toggle());await page.waitForFunction(()=>!document.querySelector('.work-panel'));
  await page.evaluate(()=>window.workspace.toggle());
  await page.evaluate(()=>window.workspace.setActive(false));
  assert.equal(await page.locator('button').getAttribute('aria-pressed'),'false','Leaving Bot must release its native workspace');
  await page.waitForFunction(()=>!document.querySelector('.work-panel'));
  // A return trip can open another panel normally, without stale ownership.
  await page.evaluate(()=>window.workspace.setActive(true));await page.evaluate(()=>window.workspace.toggle());
  assert.equal(await page.locator('button').getAttribute('aria-pressed'),'true');
  await page.evaluate(()=>window.workspace.close());
  console.log('PASS: Agent preview -> Bot -> workspace open/close -> Agent -> Bot');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
