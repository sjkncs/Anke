const {chromium}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const out=path.join(__dirname,'previews','audit-20261114');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true});const inventory=[];
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:960},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const file of ['index.html','monitor.html','warm.html','research.html']){
   await page.goto(pathToFileURL(path.join(__dirname,file)).href);
   await page.screenshot({path:path.join(out,`${file}-${width}.png`),fullPage:true});
   inventory.push({file,width,title:await page.title(),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),headings:await page.locator('h1,h2,h3').allTextContents(),brokenImages:await page.locator('img').evaluateAll(x=>x.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src)),errors:[...errors]});
   if(file==='index.html'){
    for(let i=0;i<await page.locator('.card-open').count();i++){await page.locator('.card-open').nth(i).click();await page.screenshot({path:path.join(out,`card-${i}-${width}.png`)});await page.keyboard.press('Escape');}
   }
   if(file==='research.html')for(const view of ['vision','opinion']){await page.locator(`[data-view="${view}"]`).click();await page.screenshot({path:path.join(out,`research-${view}-${width}.png`),fullPage:true});inventory.push({file:'research-'+view,width,text:await page.locator('#'+view).innerText()});}
  }
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:47835/workspace/');await page.screenshot({path:path.join(out,'live-workspace.png'),fullPage:true});inventory.push({file:'live-workspace',text:(await page.locator('body').innerText()).slice(0,16000),buttons:await page.locator('button').allTextContents()});
 try{await page.goto('https://www.worldmonitor.app/',{waitUntil:'domcontentloaded',timeout:45000});await page.screenshot({path:path.join(out,'worldmonitor-home.png'),fullPage:true,timeout:15000});const headings=await page.locator('h1,h2,h3').allTextContents();inventory.push({file:'worldmonitor-home',title:await page.title(),headings});const section=page.locator('section').filter({hasText:'What people say about World Monitor'}).last();if(await section.count())await section.screenshot({path:path.join(out,'worldmonitor-reviews.png'),timeout:15000});}catch(e){inventory.push({file:'worldmonitor-home',error:e.message});}
}finally{fs.writeFileSync(path.join(out,'inventory.json'),JSON.stringify(inventory,null,2));await browser.close();}console.log(out);})().catch(e=>{console.error(e.message);process.exitCode=1});
