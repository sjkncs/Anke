const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright-core');
test('visual workspaces open, refresh and close without retaining frames',async ctx=>{
 const root=path.resolve(__dirname,'..');
 const server=http.createServer(async(req,res)=>{try{if(req.url==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');return res.end('<div id="app"></div><script type="module">import {createVisualWorkspace} from "/renderer/visual-workspace.mjs";window.workspace=createVisualWorkspace(document.querySelector("#app"));</script>');}const file=path.resolve(root,'.'+req.url);if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true});ctx.after(async()=>{await browser.close();await new Promise(r=>server.close(r));});
 const page=await browser.newPage();await page.route('https://**/*',r=>r.fulfill({body:'<h1>Remote fixture</h1>',contentType:'text/html'}));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.workspace);
 await page.evaluate(()=>{window.opened=[];window.addEventListener('anke:monitor-open',event=>window.opened.push(event.detail));});
 for(const id of ['niulai','worldmonitor'])await page.evaluate(id=>window.workspace.open(id),id);
 assert.deepEqual(await page.evaluate(()=>window.opened),['wealth','housing']);assert.equal(await page.locator('iframe').count(),0);assert.equal(await page.locator('dialog').count(),0);await page.evaluate(()=>window.workspace.dispose());
});
