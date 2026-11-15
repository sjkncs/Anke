const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright-core');
const {query}=require('./query.cjs');
test('rent cards show direction, missing history and change sorting',async t=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Lenovo/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:1100,height:700}});
 await page.setContent('<main><div id="tabs"><button data-tab="ledger">台账</button></div><div class="filters"></div><select id="district"></select></main>');
 await page.addStyleTag({path:path.join(__dirname,'renderer/rent-visuals.css')});await page.addScriptTag({path:path.join(__dirname,'renderer/rent-visuals.js')});
 const base={dataset:'imported',district:'南山',record_type:'挂牌',lease:'整租',source:'Synthetic UI fixture',area:20,date:'2026-01-01',rent:1000};
 const records=[...['上涨','下跌','持平','单期'].map(project=>({...base,project})),...['上涨','下跌','持平'].map((project,i)=>({...base,project,date:'2026-01-02',rent:[1200,800,1000][i]}))];
 await page.evaluate(data=>{window.dispatchEvent(new CustomEvent('anke:rents-data',{detail:data}));document.querySelector('#rentVisuals').hidden=false;},query({recordType:'挂牌',lease:'整租'},{records}));
 assert.match(await page.locator('[data-direction=up]').innerText(),/20%/);assert.match(await page.locator('[data-direction=down]').innerText(),/-20%/);assert.match(await page.locator('[data-direction=unknown]').getAttribute('title'),/暂无可比历史/);assert.equal(await page.locator('[data-direction=unknown] .rv-change').innerText(),'—');
 await page.getByLabel('小区排序').selectOption('fall');assert.match(await page.locator('.rv-tiles button').first().innerText(),/下跌/);await page.getByLabel('小区排序').selectOption('rise');assert.match(await page.locator('.rv-tiles button').first().innerText(),/上涨/);
 await page.addStyleTag({content:'body{font:14px system-ui;background:#fafafa;margin:24px}'});
 const preview=Array.from({length:60},(_,i)=>({...base,project:'示例小区 '+String(i+1).padStart(2,'0'),rent:1000}));preview.push(...preview.map((r,i)=>({...r,date:'2026-01-02',rent:1000+(i%19-9)*10})));
 await page.evaluate(data=>window.dispatchEvent(new CustomEvent('anke:rents-data',{detail:data})),query({recordType:'挂牌',lease:'整租'},{records:preview}));
 await fs.mkdir(path.join(__dirname,'output'),{recursive:true});await page.locator('.rv-tiles').screenshot({path:path.join(__dirname,'output/rent-heatmap-fixture.png')});
});
