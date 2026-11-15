const {chromium}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 fs.mkdirSync(path.join(__dirname,'previews'),{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  for(const file of ['index.html','warm.html','monitor.html']){
   for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:1000}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.join(__dirname,file)).href);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${file} overflow at ${width}`);
    assert.equal(await page.locator('h1').count(),1);
    const links=await page.locator('a').evaluateAll(as=>as.map(a=>a.getAttribute('href')));
    for(const href of links){
     if(href.startsWith('http://127.0.0.1:47831/'))continue;
     if(href.startsWith('#'))assert.equal(await page.locator(href).count(),1,`missing target ${href}`);
     else assert.ok(fs.existsSync(path.join(__dirname,href)),`missing file ${href}`);
    }
    if(file==='index.html'){
     assert.equal(await page.locator('.capability-card').count(),8);
     await page.getByRole('button',{name:'安居住房',exact:true}).click();assert.equal(await page.locator('.capability-card').count(),2);
     await page.locator('.card-open').first().click();assert.equal(await page.locator('dialog').evaluate(d=>d.open),true);assert.match(await page.locator('#dialog-title').innerText(),/租金/);
     await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').evaluate(d=>d.open),false);
     await page.getByRole('button',{name:'财富资讯',exact:true}).click();assert.equal(await page.locator('.capability-card').count(),2);
     await page.getByRole('button',{name:'全部',exact:true}).click();
     await page.locator('[data-workflow="work"]').click();assert.match(await page.locator('#workflow-question').innerText(),/研究和工作/);
     await page.locator('#workflow-steps summary').nth(1).click();assert.equal(await page.locator('#workflow-steps details').nth(1).evaluate(d=>d.open),true);
    }else{
     await page.getByRole('button',{name:'工作',exact:true}).click();
     assert.match(await page.locator('#question').innerText(),/研究和工作/);
     assert.equal(await page.getByRole('button',{name:'工作',exact:true}).getAttribute('aria-pressed'),'true');
     await page.getByRole('button',{name:'日常',exact:true}).click();
     assert.match(await page.locator('#question').innerText(),/照顾自己/);
     await page.getByRole('button',{name:'住房',exact:true}).click();
     await page.locator('summary').first().click();
     assert.equal(await page.locator('details').first().evaluate(e=>e.open),true);
     await page.locator('summary').first().click();
    }
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:path.join(__dirname,'previews',`${file.replace('.html','')}-${width}.png`),fullPage:true});
    assert.deepEqual(errors,[]);
    console.log(`PASS ${file} ${width}px: layout, links, scenarios, FAQ, no script errors`);
    await page.close();
   }
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
