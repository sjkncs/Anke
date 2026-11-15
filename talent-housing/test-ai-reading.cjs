const assert=require('node:assert/strict');
const {analyze}=require('../anke-agent-source/apps/desktop/resources/plugins/anke.rents/analysis.cjs');
(async()=>{
 let called=0;const pi={models:{list:async()=>[{key:'test/model',isDefault:true}]},session:{getLlmContext:async()=>({modelKey:'test/model'})},agent:{complete:async input=>{called++;assert.equal(input.includeSessionContext,false);assert.ok(input.system.includes('不可信数据'));assert.ok(input.messages[0].content.includes('调租'));return {text:'测试解读',modelKey:input.modelKey};}}};
 assert.equal((await analyze(pi,{module:'scenario',context:'调租输入'})).text,'测试解读');
 assert.equal(called,1);assert.equal((await analyze(pi,{module:'scenario',action:'models'})).models.length,1);assert.equal(called,1);
 await assert.rejects(()=>analyze(pi,{module:'invalid'}));
 await assert.rejects(()=>analyze(pi,{module:'scenario',modelKey:'not-ready'}),/配置/);
 console.log('PASS backend completion contract, model validation, read-only model listing');
 const {chromium}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright');
 const browser=await chromium.launch({headless:true});try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:47835/workspace/');await page.waitForSelector('.anke-ai-launch');
  assert.equal(await page.locator('section.page').count(),await page.locator('section.page > .anke-ai-launch').count());
  await page.evaluate(()=>{const original=window.pluginBridge.invoke.bind(window.pluginBridge);window.pluginBridge.invoke=async(channel,payload)=>channel==='rents.analyze'?(payload.action==='models'?{models:[{key:'test/model',label:'测试模型',isDefault:true}]}:{text:'依据当前页面的数据进行解读。\n缺失信息仍需核实。',generatedAt:new Date().toISOString()}):original(channel,payload);});
  await page.locator('#overview > .anke-ai-launch').click();await page.getByRole('button',{name:'开始解读',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.anke-ai-answer')?.textContent.includes('缺失信息'));await page.screenshot({path:__dirname+'/data/ai-reading-smoke.png'});await page.locator('.anke-ai-dialog button').first().click();
  await page.locator('[data-tab=events]').click();await page.locator('.event-reader-launch').first().click();assert.ok(await page.locator('.event-reader-content strong').count()>0);assert.equal(await page.locator('.event-reader script').count(),0);await page.screenshot({path:__dirname+'/data/reading-highlights.png'});assert.deepEqual(errors,[]);
  console.log('PASS all rental pages have shortcuts; mock model flow, paragraph highlights, no script injection, no page errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
