const {chromium}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9337');
 try{
  const page=browser.contexts()[0].pages().find(p=>!p.url().includes('surface='));
  const existing=page.locator('dialog[open][aria-label="知识库"]');if(await existing.count())await existing.getByRole('button',{name:'关闭',exact:true}).click();
  const groups=[['终身学习',['知识库','科研中心']],['修身养性',['日常饮食','锻炼计划','营养搭配','阳明讲堂']],['购物旅游',['购物清单','旅游计划','行程管理']]];
  const result=[];
  for(const [name,labels] of groups){
   const region=page.locator('.anke-service-region[aria-label="'+name+'"]');
   assert.equal(await region.count(),1);
   assert((await region.locator('.anke-service-entry').count())>=labels.length);
   for(const label of labels){
    const button=region.getByRole('button',{name:label,exact:true});
    await button.scrollIntoViewIfNeeded();assert(await button.isVisible());
    assert(await button.locator('img').evaluate(i=>i.complete&&i.naturalWidth>0));
    await button.click();
    if(label==='知识库'){
     const dialog=page.getByRole('dialog',{name:'知识库',exact:true});await dialog.waitFor({state:'visible'});await dialog.getByRole('button',{name:'关闭',exact:true}).click();
    }else await page.getByPlaceholder('发送给 '+label,{exact:true}).waitFor({state:'visible'});
    assert.equal(await region.locator('[aria-label="配置'+label+'"]').count(),1);
   }
   result.push({group:name,count:labels.length,passed:true});
  }
  await page.locator('.anke-service-entry[aria-label="科研中心"]').click();
  await page.locator('.anke-service-region').filter({has:page.getByRole('heading',{name:'修身养性',exact:true})}).scrollIntoViewIfNeeded();
  await page.screenshot({path:'apps/desktop/resources/plugins/local.pi-bot/output/personal-workspaces-native.png'});
  console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
