const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright-core');
test('dropdown uses rounded picker and preserves native selection and keyboard',async t=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Lenovo/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:700,height:500}});
 const css=await fs.readFile(path.join(__dirname,'../renderer/anke-select.css'),'utf8');
 await page.setContent('<style>'+css+'</style><div style="padding:40px;font:14px system-ui"><label>市场板块 <select aria-label="市场板块"><option value="all">全部板块</option><option value="sz">深圳主板</option><option disabled>不可用</option></select></label><select multiple aria-label="多选"><option>保留原样</option></select><button id="custom">当前 安客工作区</button></div>');
 assert(await page.evaluate(()=>CSS.supports('appearance','base-select')));
 const select=page.getByRole('combobox');assert.equal(await select.evaluate(x=>getComputedStyle(x).appearance),'base-select');
 assert.equal(await page.locator('#custom').evaluate(x=>getComputedStyle(x).appearance),'auto');
 await select.click();assert.equal(await select.evaluate(x=>x.matches(':open')),true);
 assert.equal(await select.evaluate(x=>getComputedStyle(x,'::picker(select)').borderRadius),'16px');
 await fs.mkdir(path.join(__dirname,'../output'),{recursive:true});await page.screenshot({path:path.join(__dirname,'../output/anke-select-open.png')});
 await page.getByRole('option',{name:'深圳主板',exact:true}).click();assert.equal(await select.inputValue(),'sz');
 await select.focus();await page.keyboard.press('Space');await page.keyboard.press('Home');await page.keyboard.press('Enter');assert.equal(await select.inputValue(),'all');
 await select.evaluate(x=>x.disabled=true);assert(await select.isDisabled());
});
