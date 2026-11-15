const {chromium}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright');
const fs=require('node:fs/promises');
(async()=>{const browser=await chromium.connectOverCDP('http://127.0.0.1:9337');try{const page=browser.contexts()[0].pages().find(p=>!p.url().includes('surface='));
if(process.argv[2]==='open'){console.log(JSON.stringify(await page.locator('button').evaluateAll(xs=>xs.map(x=>({text:x.innerText,aria:x.getAttribute('aria-label'),title:x.title})).filter(x=>/插件|扩展|Anke Bot|设置/.test(JSON.stringify(x))))));}
if(process.argv[2]==='api')console.log(JSON.stringify(await page.evaluate(()=>Object.keys(window.piDesktop))));
if(process.argv[2]==='model-channels')console.log(JSON.stringify(await page.evaluate(()=>Object.entries(window.piDesktop.channels.invoke).filter(([k])=>/model|provider|sessionGet/i.test(k)))));
if(process.argv[2]==='vision-config')console.log(JSON.stringify(await page.evaluate(async()=>{const r=await window.piDesktop.invoke(window.piDesktop.channels.invoke.providersList);const data=r.data;return {ok:r.ok,providers:(Array.isArray(data)?data:data?.providers||[]).map(p=>({id:p.id,name:p.name,models:p.models,modelBindings:p.modelBindings}))};})));
if(process.argv[2]==='enable-vision')console.log(JSON.stringify(await page.evaluate(async()=>{const api=window.piDesktop,r=await api.invoke(api.channels.invoke.providersList),data=r.data,p=(Array.isArray(data)?data:data?.providers||[]).find(p=>p.id==='6dbf86f3-9c7b-40e6-b085-09047fba7ec3');if(!p)throw Error('Provider missing');const models=p.models.map(m=>m.id==='claude-sonnet-5-5'?{...m,supportsImages:true}:m);const result=await api.invoke(api.channels.invoke.providersUpdate,{id:p.id,models});return {ok:result.ok,error:result.error?.message,imageOverride:result.data?.provider?.models?.find(m=>m.id==='claude-sonnet-5-5')?.supportsImages};})));
if(process.argv[2]==='loaded')console.log(JSON.stringify(await page.evaluate(async()=>{const r=await window.piDesktop.invoke(window.piDesktop.channels.invoke.pluginList);return r.data?.plugins?.map(p=>({id:p.id,path:p.path,status:p.status}))||r;})));
if(process.argv[2]==='reload')console.log(JSON.stringify(await page.evaluate(()=>window.piDesktop.invoke(window.piDesktop.channels.invoke.pluginReload,'local.pi-bot'))));
async function rpc(channel,payload){return page.evaluate(async({channel,payload})=>{
 const invoke=async(method,args)=>{await new Promise(resolve=>setTimeout(resolve,600));const r=await window.piDesktop.invoke(window.piDesktop.channels.invoke.pluginRendererCall,'local.pi-bot',method,args);if(!r.ok)throw Error(r.error.message);return r.data;};
 const {id}=await invoke('request.start',{channel,payload});let text='';
 for(let i=0;i<600;i++){const r=await invoke('request.read',{id,offset:text.length});if(r.error)throw Error(r.error);if(r.pending){await new Promise(resolve=>setTimeout(resolve,100));continue;}text+=r.chunk;if(r.done)return JSON.parse(text);}throw Error('Request timeout');
},{channel,payload});}
if(process.argv[2]==='mcp'){
 const view=await rpc('team.connectors');for(const server of view.bridge?.servers||[]){if(!/mcd\.cn|lkcoffee\.com/.test(server.url||''))continue;try{const r=await rpc('team.mcp.tools',{serverId:server.id,botId:server.botIds[0]});console.log(JSON.stringify({provider:server.name,count:r.tools.length,tools:r.tools.map(t=>({name:t.name,description:t.description?.slice(0,90),inputSchema:t.inputSchema}))}));}catch(e){console.log(JSON.stringify({provider:server.name,error:e.message}));}}
}
if(process.argv[2]==='image'){
 await page.locator('.anke-service-entry').filter({hasText:'居家工作'}).click();
 await page.locator('[data-pi-attachment-picker]').setInputFiles('apps/desktop/resources/plugins/local.pi-bot/renderer/service-icons/food.png');
 console.log('image attached');
}
if(process.argv[2]==='image-send'){
 const box=page.getByPlaceholder('发送给 居家工作');await box.fill('[安客图片实测] 请只描述附件图片中的物品和主要颜色。不要调用工具。');
 const send=page.getByRole('button',{name:'发送消息',exact:true});await send.waitFor({state:'visible'});await send.click();
}
if(process.argv[2]==='channels')console.log(JSON.stringify(await page.evaluate(()=>Object.entries(window.piDesktop.channels.invoke).filter(([k])=>/plugin/i.test(k)))));
if(process.argv[2]==='pace-test'){
 await page.keyboard.press('Escape');await page.evaluate(()=>localStorage.setItem('anke.readingSpeed','20'));
 console.log(JSON.stringify({setting:await page.evaluate(()=>localStorage.getItem('anke.readingSpeed'))}));
 await page.keyboard.press('Escape');
 await page.locator('.anke-service-entry').filter({hasText:'居家工作'}).click();
 const box=page.getByPlaceholder('发送给 居家工作');await box.fill('[安客调速实测] 请写约600字，介绍高校教师住房的通勤、租金和品质取舍。只写正文，不要调用工具。');await page.getByRole('button',{name:'发送消息',exact:true}).click();
 const samples=[];for(let i=0;i<45;i++){await page.waitForTimeout(1000);samples.push(await page.locator('[data-line-id]').last().evaluate(x=>({at:Date.now(),id:x.dataset.lineId,length:Array.from(x.innerText).length})));}
 console.log(JSON.stringify({samples}));await fs.writeFile('apps/desktop/resources/plugins/local.pi-bot/output/pace-native-live.json',JSON.stringify({samples},null,2));
}
if(process.argv[2]==='cancel-send'){
 const box=page.getByPlaceholder('发送给 居家工作');await box.fill('[安客中止实测] 请写3000字，详细介绍高校教师住房品质评价。不要调用工具。');await page.getByRole('button',{name:'发送消息',exact:true}).click();
 await page.waitForTimeout(2500);console.log(JSON.stringify(await page.locator('button').evaluateAll(xs=>xs.filter(x=>x.getBoundingClientRect().width>0&&/停|取消/.test(x.innerText+' '+x.getAttribute('aria-label'))).map(x=>({text:x.innerText,aria:x.getAttribute('aria-label')})))));
}
if(process.argv[2]==='send'){
 await page.locator('.anke-service-entry').filter({hasText:'居家工作'}).click();
 const box=page.getByPlaceholder('发送给 居家工作');await box.fill('[安客实测 20261112] 请直接写一段约300字的中文，介绍教师选择住房时如何比较通勤和居住品质。不要调用工具，不要保存文件。');await box.press('Enter');
}
if(process.argv[2]==='poll'){
 console.log(JSON.stringify(await page.locator('[data-line-id]').evaluateAll(xs=>xs.slice(-4).map(x=>({id:x.dataset.lineId,text:x.innerText})))));
 console.log(JSON.stringify(await page.locator('button').evaluateAll(xs=>xs.filter(x=>x.getBoundingClientRect().width>0&&/停|取消|发送/.test(x.innerText+' '+x.getAttribute('aria-label'))).map(x=>({text:x.innerText,aria:x.getAttribute('aria-label')})))));
}
if(process.argv[2]==='panel'){
 const images=await page.locator('.anke-service-entry').evaluateAll(xs=>xs.map(x=>({text:x.innerText,width:x.querySelector('img')?.naturalWidth,visible:x.getBoundingClientRect().width>0})));
 const inputs=await page.locator('textarea').evaluateAll(xs=>xs.map(x=>({placeholder:x.placeholder,visible:x.getBoundingClientRect().width>0})));
 const buttons=await page.locator('button').evaluateAll(xs=>xs.filter(x=>x.getBoundingClientRect().width>0).map(x=>({text:x.innerText,aria:x.getAttribute('aria-label')})).slice(-45));
 console.log(JSON.stringify({images,inputs,buttons}));await page.screenshot({path:'apps/desktop/resources/plugins/local.pi-bot/output/anke-native-live.png'});
}
if(process.argv[2]==='click')await page.getByRole('button',{name:process.argv[3],exact:true}).first().click();
}finally{await browser.close();}})().catch(e=>{console.error(e.message);process.exitCode=1});
