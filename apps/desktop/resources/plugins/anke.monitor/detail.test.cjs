const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright-core');
const {normalize}=require('./market.cjs');
test('upstream valuations and limits survive normalization without invented values',()=>{
 const result=normalize({ok:true,rows:[{c:'sz300308',n:'Example',mcap:599438e6,floatCap:564847e6,vr:1.19,upLimit:650.4,dnLimit:433.6,atUp:false,atDn:false},{c:'sz000001',n:'Missing'}]});
 assert.equal(result.rows[0].marketCap,599438e6);assert.equal(result.rows[0].volumeRatio,1.19);assert.equal(result.rows[0].upLimit,650.4);assert.equal(result.rows[0].atUp,false);assert.equal(result.rows[1].marketCap,null);assert.equal(result.rows[1].upLimit,null);assert.equal(result.rows[1].atDown,null);
});
test('visual stock detail opens in viewport, renders valuation, changes period and closes',async ctx=>{
 const root=path.join(__dirname,'renderer');
 const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+(req.url==='/'?'/index.html':req.url));if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':'text/html;charset=utf-8');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true});ctx.after(async()=>{await browser.close();await new Promise(r=>server.close(r));});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],periods=[];page.on('pageerror',e=>errors.push(e.message));
 await page.exposeFunction('invokeMonitor',async(channel,args)=>{
  if(channel==='monitor.state')return {tab:'wealth'};
  if(channel==='monitor.market')return normalize({ok:true,fetchedAt:'SYNTHETIC UI FIXTURE',rows:[{c:'sz300308',n:'中际旭创',boardZh:'创业板',price:508.9,pct:-6.11,amt:33622450000,pre:542,open:532.74,high:567.89,low:506.39,mcap:599438000000,floatCap:564847000000,pe:23.14,pb:6.35,vr:1.19,upLimit:650.4,dnLimit:433.6,atUp:false,atDn:false},{c:'sz000001',n:'缺失字段样本',boardZh:'深主板',price:10,pct:1,amt:1e6}]});
  if(channel==='monitor.history'){periods.push(args.period);return {code:args.code,period:args.period,source:'Synthetic fixture',lastDate:'2026-10-30',bars:Array.from({length:100},(_,i)=>({date:new Date(Date.UTC(2026,6,1+i)).toISOString().slice(0,10),open:100+i*.8,close:102+i*.8+Math.sin(i)*4,high:110+i*.8,low:95+i*.8,volume:1000+i*17}))};}
  throw Error('Unsupported fixture');
 });
 await page.addInitScript(()=>window.pluginBridge={invoke:(channel,args)=>window.invokeMonitor(channel,args)});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#heatmap button').first().click();await page.waitForFunction(()=>!document.querySelector('#exportCSV').disabled);
 assert.equal(await page.getByRole('dialog').isVisible(),true);assert.match(await page.locator('#stockFacts').textContent(),/5,994.38 亿/);assert.match(await page.locator('#stockFacts').textContent(),/650.4/);assert.match(await page.locator('#stockFacts').textContent(),/未触及/);
 const box=await page.locator('#detail').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=1000);assert.equal(await page.locator('#candles').isVisible(),true);
 const candle=page.locator('#candles');await candle.scrollIntoViewIfNeeded();const cb=await candle.boundingBox();await page.mouse.move(cb.x+cb.width*.6,cb.y+cb.height*.35);
 const cursor=await candle.evaluate(n=>JSON.parse(n.dataset.crosshair));assert.ok(Number.isFinite(cursor.price));assert.ok(cursor.indicators.some(s=>s.name==='MA5'&&Number.isFinite(s.value)));
 await candle.focus();await page.keyboard.press('ArrowLeft');assert.equal(await candle.evaluate(n=>JSON.parse(n.dataset.crosshair).index),cursor.index-1);
 const beforeZoom=await candle.getAttribute('data-visible-range');await page.getByLabel('放大图表',{exact:true}).click();assert.notEqual(await candle.getAttribute('data-visible-range'),beforeZoom);
 await page.getByRole('button',{name:'周 K',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-period=week]').getAttribute('aria-pressed')==='true');assert.ok(periods.includes('week'));
 await page.getByLabel('副图指标',{exact:true}).selectOption('MACD');await page.locator('#candles').focus();await page.keyboard.press('+');await page.keyboard.press('ArrowLeft');assert.ok((await page.locator('#chartReadout').textContent()).length>10);
 await page.locator('#detail').evaluate(n=>n.scrollTop=0);await fs.mkdir(path.join(__dirname,'output'),{recursive:true});await page.screenshot({path:path.join(__dirname,'output/stock-detail-fixture.png')});
 await page.keyboard.press('Escape');assert.equal(await page.locator('#detail').isVisible(),false);assert.equal(await page.evaluate(()=>document.body.classList.contains('stock-open')),false);
 await page.getByRole('button',{name:'下跌 1 只',exact:true}).click();assert.equal(await page.locator('#rows tr').count(),1);assert.match(await page.locator('#rows').textContent(),/中际旭创/);await page.getByRole('button',{name:'下跌 1 只',exact:true}).click();assert.equal(await page.locator('#rows tr').count(),2);
 await page.locator('#heatmap button').nth(1).click();assert.match(await page.locator('#stockFacts').textContent(),/—/);assert.doesNotMatch(await page.locator('#stockFacts').textContent(),/650.4/);assert.deepEqual(errors,[]);
});
