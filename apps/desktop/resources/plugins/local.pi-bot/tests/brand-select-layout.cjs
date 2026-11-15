const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright-core');
test('closed dropdown labels fit and official product logos decode',async t=>{
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Lenovo/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});t.after(()=>browser.close());
const base=path.join(__dirname,'../renderer');const css=await fs.readFile(path.join(base,'anke-select.css'),'utf8');
const page=await browser.newPage();
for(const dark of [false,true])for(const width of [390,1299]){
await page.setViewportSize({width,height:600});await page.setContent(`<style>body{font:16px system-ui;background:${dark?'#222':'#fff'};--bt-card:${dark?'#292929':'#fff'};--bt-ink:${dark?'#eee':'#222'}}select{height:34px;max-width:180px}${css}</style><select aria-label="library"><option>自动 · 最近打开</option><option>一个非常长的知识库名称用于检验文字不会越界</option></select><select aria-label="cloud"><option>Google Drive</option></select><div id="logos"></div>`);
for(const name of ['claude','deepseek','gemini']){const svg=await fs.readFile(path.join(base,'assets/model-logos',name+'.svg'),'utf8');assert.match(svg,/^\s*<svg/);await page.locator('#logos').evaluate((el,{svg,name})=>{const img=new Image(32,32);img.alt=name;img.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg)));el.append(img)},{svg,name});}
assert(await page.locator('img').evaluateAll(async imgs=>{await Promise.all(imgs.map(i=>i.decode()));return imgs.every(i=>i.naturalWidth>0)}));
for(const s of await page.locator('select').all()){const v=await s.evaluate(e=>({white:getComputedStyle(e).whiteSpace,h:e.clientHeight,scroll:e.scrollHeight,arrow:getComputedStyle(e,'::picker-icon').position}));assert.equal(v.white,'nowrap');assert.equal(v.arrow,'absolute');assert(v.scroll<=v.h+2,JSON.stringify(v));}
await page.screenshot({path:path.join(__dirname,`../output/brand-select-${dark?'dark':'light'}-${width}.png`)});
}
});
