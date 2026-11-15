const {chromium}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,900,390]){
   const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
   await page.locator('#experiences').scrollIntoViewIfNeeded();
   assert.equal(await page.locator('.experience-card').count(),3);
   assert.doesNotMatch(await page.locator('#experiences').innerText(),/模拟|虚构|不代表真实/);
   assert.equal(await page.locator('#experiences blockquote').count(),0);
   for(const card of await page.locator('.experience-card').all()){
    assert.equal(await card.locator('.experience-copy').count(),1);
    await card.locator('summary').click();
    assert.equal(await card.locator('details').evaluate(d=>d.open),true);
    assert.ok((await card.locator('details p').innerText()).length>20);
    await card.locator('summary').click();
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.equal(await page.locator('.experience-grid').evaluate(e=>getComputedStyle(e).display),'grid');
   await page.locator('#experiences').screenshot({path:path.join(__dirname,'previews',`experiences-${width}.png`)});
   assert.deepEqual(errors,[]);
   console.log(`PASS ${width}px: scenario copy, no testimonial labels or quotes, three expandable cards, responsive layout, no script errors`);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
