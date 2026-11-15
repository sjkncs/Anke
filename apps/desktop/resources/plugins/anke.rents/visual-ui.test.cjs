const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright-core');
const {query}=require('./query.cjs');
test('rent board filters, project detail, watch persistence, trend cursor and empty state',async ctx=>{
 const root=path.join(__dirname,'renderer'),server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+(req.url==='/'?'/index.html':req.url));if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html;charset=utf-8');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true});ctx.after(async()=>{await browser.close();await new Promise(r=>server.close(r));});
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],locations=[];page.on('pageerror',e=>errors.push(e.message));
 const records=Array.from({length:36},(_,i)=>({dataset:'imported',project:i%2?'Fixture B':'Fixture A',district:i%2?'福田':'南山',date:`${2024+Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}-12`,record_type:'挂牌',lease:'整租',area:40+i,rent:2000+i*50,source:'Synthetic browser test fixture'}));
 await page.exposeFunction('invokeRents',async(channel,args)=>{
  if(channel==='rents.query'){if(args.query==='__fail__')throw Error('Synthetic load failure');return query(args,{records});}
  if(channel==='rents.appearance')return {base:'light'};
  if(channel==='rents.saveAddress')return {saved:true};
  if(channel==='rents.module')return 'overview';
  if(channel==='rents.events')return {events:[],sources:[],generatedAt:'fixture'};
  if(channel==='rents.housing')return {applications:[],units:[],orders:[]};
  if(channel==='rents.locate'){locations.push(args);if(args.project==='Fixture B')return {results:[{id:'fixture-b',project:'Fixture B',district:'福田',address:'测试地址 B 号',exact:true,source:'Synthetic address fixture'}],selected:'fixture-b'};return {results:[],selected:null};}
  throw Error('Unsupported fixture '+channel);
 });
 await page.addInitScript(()=>window.pluginBridge={on:()=>()=>{},invoke:(c,a)=>window.invokeRents(c,a)});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.housingReady);await page.getByRole('button',{name:'租金看板',exact:true}).click();
 assert.equal(await page.locator('.filters').isVisible(),true);assert.equal(await page.locator('.rv-tiles button').count(),2);
 const chart=page.locator('#rentVisuals > .rv-panel svg').first();await chart.scrollIntoViewIfNeeded();const box=await chart.boundingBox();await page.mouse.move(box.x+box.width*.3,box.y+box.height*.4);const first=await chart.getAttribute('data-crosshair');await chart.focus();await page.keyboard.press('ArrowRight');assert.notEqual(await chart.getAttribute('data-crosshair'),first);
 // SVG letterboxing changes with panel width: hover the actual first point,
 // rather than assuming the viewBox fills the entire element rectangle.
 for(const width of [720,1900]){await page.setViewportSize({width,height:1100});await chart.scrollIntoViewIfNeeded();const point=await chart.evaluate(el=>{const p=new DOMPoint(70,100).matrixTransform(el.getScreenCTM());return {x:p.x,y:p.y};});await page.mouse.move(point.x,point.y);assert.equal(JSON.parse(await chart.getAttribute('data-crosshair')).date,'2025-01');}
 assert.match(await chart.locator('.rv-axis-date').textContent(),/2025-01/);assert.ok(Number.isFinite(Number((await chart.locator('.rv-axis-price').textContent()).replaceAll(',',''))));
 const beforeDrag=await chart.getAttribute('data-visible-range');const dragBox=await chart.boundingBox();await page.mouse.move(dragBox.x+dragBox.width*.4,dragBox.y+dragBox.height*.4);await page.mouse.down();await page.mouse.move(dragBox.x+dragBox.width*.7,dragBox.y+dragBox.height*.4,{steps:5});await page.mouse.up();assert.notEqual(await chart.getAttribute('data-visible-range'),beforeDrag);await chart.dblclick();assert.equal(await chart.getAttribute('data-visible-range'),beforeDrag);
 await page.setViewportSize({width:1440,height:1100});
 await page.locator('.rv-tiles button').first().click();assert.equal(await page.locator('.rv-detail').isVisible(),true);await page.getByRole('button',{name:'关注小区',exact:true}).click();assert.match(await page.evaluate(()=>localStorage.getItem('anke.rents.watch')),/Fixture/);
 await page.getByRole('button',{name:'只看关注',exact:true}).click();assert.equal(await page.locator('.rv-tiles button').count(),1);await page.getByRole('button',{name:'只看关注',exact:true}).click();
 await page.locator('.rv-districts button').filter({hasText:'南山'}).click();await page.waitForFunction(()=>document.querySelectorAll('.rv-tiles button').length===1);assert.match(await page.locator('.rv-tiles').textContent(),/Fixture A/);
 await page.getByRole('button',{name:'季度',exact:true}).click();assert.match(await chart.getAttribute('data-crosshair'),/Q/);
 await page.getByRole('button',{name:'地图定位',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#residentialStatus').textContent.includes('没有找到'));assert.equal(locations.at(-1).project,'Fixture A');assert.equal(locations.at(-1).district,'南山');assert.equal(await page.locator('#map').isVisible(),true);assert.equal(await page.locator('#residentialFrame').isVisible(),false);await page.getByRole('button',{name:'租金看板',exact:true}).click();
 await fs.mkdir(path.join(__dirname,'output'),{recursive:true});await page.screenshot({path:path.join(__dirname,'output/rent-board-fixture.png')});
 await page.getByLabel('搜索项目、地址',{exact:true}).fill('no matching fixture');await page.waitForFunction(()=>document.querySelector('.rv-tiles').textContent.includes('没有小区样本'));assert.equal(await page.locator('.rv-detail').isVisible(),false);assert.equal(await page.locator('#rentVisuals svg').count(),0);assert.deepEqual(errors,[]);
 await page.getByLabel('搜索项目、地址',{exact:true}).fill('');await page.waitForFunction(()=>document.querySelectorAll('#ledgerTable tbody tr').length>0);
 await page.locator('[data-tab="ledger"]').click();
 const ledger=page.locator('.market-ledger-scroll');assert.equal(await ledger.locator('thead th').count(),32);
 assert.match(await page.locator('#geographicRentStats').textContent(),/深圳市/);await page.getByLabel('租金统计层级',{exact:true}).selectOption('district');assert.match(await page.locator('#geographicRentStats').textContent(),/南山/);assert.match(await page.locator('#geographicRentStats').textContent(),/同房源变化/);
 for(const width of [720,1440,1900]){await page.setViewportSize({width,height:1100});assert.equal(await ledger.evaluate(el=>el.scrollWidth>el.clientWidth),true);await ledger.evaluate(el=>el.scrollLeft=500);assert.ok(await ledger.evaluate(el=>el.scrollLeft)>0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);}
 assert.match(await ledger.evaluate(el=>getComputedStyle(el).scrollbarColor),/rgba\(0, 0, 0, 0\)$/);
 assert.equal(await page.locator('#rentProvenance').isVisible(),false);
 await page.setViewportSize({width:1440,height:1100});await ledger.evaluate(el=>el.scrollLeft=0);await page.screenshot({path:path.join(__dirname,'output/market-ledger-fixture.png')});
 await ledger.locator('tbody tr').first().getByRole('button',{name:'补充地址'}).click();await page.waitForFunction(()=>document.querySelector('#status').textContent==='没有匹配住宅');
 await page.getByLabel('行政区',{exact:true}).selectOption('福田');await page.waitForFunction(()=>document.querySelector('#ledgerTable tbody tr')?.textContent.includes('Fixture B'));
 await ledger.locator('tbody tr').first().getByRole('button',{name:'补充地址'}).click();await page.waitForFunction(()=>document.querySelector('#ledgerTable tbody tr')?.textContent.includes('测试地址 B 号'));
 assert.equal(await ledger.getByRole('button',{name:'补充地址'}).count(),0);
 await page.reload();await page.waitForFunction(()=>window.housingReady);await page.locator('[data-tab="ledger"]').click();await page.getByLabel('行政区',{exact:true}).selectOption('福田');await page.waitForFunction(()=>document.querySelector('#ledgerTable tbody tr')?.textContent.includes('测试地址 B 号'));
 await page.getByLabel('行政区',{exact:true}).selectOption('南山');await page.waitForFunction(()=>document.querySelector('#ledgerTable tbody tr')?.textContent.includes('Fixture A'));assert.equal(await ledger.getByRole('button',{name:'补充地址'}).count()>0,true);
 await page.getByRole('button',{name:'企业版',exact:true}).click();assert.equal(await page.locator('[data-tab="profiles"]').isVisible(),true);assert.equal(await page.locator('[data-tab="scenario"]').isVisible(),false);
 await page.getByRole('button',{name:'政府板块',exact:true}).click();await page.locator('[data-tab="scenario"]').click();assert.equal(await page.locator('.scenario-help').count(),0);assert.match(await page.locator('#estimate').textContent(),/31.5/);await page.locator('#area').fill('100');assert.match(await page.locator('#estimate').textContent(),/3,330/);
 await page.locator('[data-tab="map"]').click();assert.match(await page.locator('#locations').textContent(),/原始记录未提供地址/);assert.match(await page.locator('#locations').textContent(),/坐标待核实/);assert.match(await page.locator('#rentProvenance').textContent(),/Synthetic browser test fixture/);
 await page.getByRole('button',{name:'个人版',exact:true}).click();assert.equal(await page.locator('[data-tab="profiles"]').isVisible(),false);assert.equal(await page.locator('[data-tab="map"]').isVisible(),true);
 await page.getByLabel('搜索项目、地址',{exact:true}).fill('__fail__');await page.waitForFunction(()=>document.querySelector('#status').textContent==='租金数据加载失败');assert.equal(await page.locator('#ledgerTable table').count(),0);assert.equal(await page.locator('#metrics .metric').count(),0);assert.equal(await page.locator('#rentVisuals svg').count(),0);
});
