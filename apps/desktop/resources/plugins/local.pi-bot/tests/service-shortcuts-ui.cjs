'use strict';
const fs=require('node:fs'),fsp=require('node:fs/promises'),http=require('node:http'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PI_BOT_PLAYWRIGHT_MODULE||'playwright');
const {Team}=require('../src/team'),{createStateSync}=require('../src/state-sync');
const root=path.resolve(__dirname,'..'),output=path.join(root,'output/playwright/service-shortcuts');
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>html,body,#test{height:100%;margin:0}</style><div id="test"></div><script type="module">
import {mount} from '/renderer/app.mjs';
window.dispose=await mount(document.querySelector('#test'),async(channel,input={})=>{const r=await fetch('/rpc',{method:'POST',body:JSON.stringify({channel,input})});const v=await r.json();if(v.error)throw Error(v.error);return v;},()=>{},true);
</script>`;
(async()=>{
 fs.mkdirSync(output,{recursive:true});const temp=await fsp.mkdtemp(path.join(os.tmpdir(),'anke-services-')),errors=[],sync=createStateSync(),results={};
 const team=new Team({});team.mentions=await import('../renderer/upstream/mentions.mjs');team.data=temp;team.file=path.join(temp,'team.json');team.queueCheckpoint=()=>{};
 const keys=['education','food','parcel','repair','billing','property','activities','operations','iot','health','remote-work','campus','mail','wealth','career'];
 const names=['教育培训','外卖配送','快递寄送','设备报修','费用缴纳','物业通知','社区活动','智能运维','智能公寓','医疗保障','居家工作','校园动态','邮件中心','财富管理','职业规划'];
 team.state={version:1,bots:[{id:'chief',name:'Anke Bot',role:'Administrator',chat:[]},...keys.map((key,i)=>({id:key,name:names[i],role:'Worker',ankeServicePreset:key,chat:[],modelKey:''}))],rooms:[],jobs:[],questions:[],views:[],asides:[],prefs:{theme:'deepseek',motion:'quiet'}};
 const front=()=>({...structuredClone(team.state),memoryNews:{},usageSummaries:{},schedules:{tasks:[]},botActivity:{},executing:[]});
 let failNext=false;
 async function rpc(channel,input){
  if(channel==='team.learning.library')return require('../src/learning-library').operation(team,input,{registry:path.join(temp,'obsidian.json')});
  if(channel==='team.github')throw Error('Fixture GitHub outage');
  if(channel==='team.prefs'){if(failNext){failNext=false;throw Error('Test save failure');}return team.preferences(input);}
  if(channel==='team.bot.save')return team.upsertBot(input);
  if(channel==='team.bootstrap')return front();if(channel==='team.state')return sync(front(),input.cursor);
  if(channel==='team.startup')return {phase:'ready'};if(channel==='team.models')return [{key:'mock',label:'测试模型',isDefault:true}];
  if(channel==='team.appearance')return {base:'light',locale:'zh-CN'};if(channel==='team.updates')return {status:'current',current:'0.3.107'};
  if(channel==='team.pin')return front();if(channel==='team.history.search')return {results:[]};
  if(channel==='team.office')return {available:false};if(channel==='team.workspaces')return {current:'',projects:[]};
  if(channel==='team.bot.preview')return {permissionMode:'inherit',permissionStatus:'ready',memoryCount:0};
  throw Error('Unexpected '+channel);
 }
 const server=http.createServer(async(req,res)=>{
  if(req.url==='/'){res.setHeader('content-type','text/html;charset=utf-8');return res.end(html);}
  if(req.url==='/rpc'){try{let body='';for await(const c of req)body+=c;const {channel,input}=JSON.parse(body);res.end(JSON.stringify(await rpc(channel,input)));}catch(e){res.end(JSON.stringify({error:e.message}));}return;}
  const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;return res.end();}res.setHeader('content-type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream');res.end(fs.readFileSync(file));
 });
 let browser,page;
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,executablePath:process.env.PI_BOT_CHROMIUM_EXECUTABLE||undefined});page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
  const launcher=page.getByRole('region',{name:'服务功能',exact:true});await launcher.waitFor();assert.equal(await launcher.locator('.anke-service-region').count(),7);assert.equal(await launcher.locator('.anke-service-entry').count(),17);
  assert.equal(await launcher.locator('img').evaluateAll(nodes=>nodes.every(n=>n.complete&&n.naturalWidth>0)),true);
  assert.equal(await launcher.locator('.anke-service-entry').first().evaluate(n=>getComputedStyle(n).fontSize),'11px');results.groupingAndArt=true;
  await page.locator('.sidebar').screenshot({path:path.join(output,'grouped-services.png'),animations:'disabled'});
  await launcher.getByRole('button',{name:'管理服务',exact:true}).click();await launcher.getByRole('button',{name:'移除教育培训',exact:true}).click();await launcher.getByRole('button',{name:'教育培训',exact:true}).waitFor({state:'detached'});
  await page.waitForFunction(()=>document.querySelector('#test').shadowRoot.querySelector('.anke-service-launcher.is-managing'));
  await page.reload();await launcher.waitFor();assert.equal(await launcher.getByRole('button',{name:'教育培训',exact:true}).count(),0);assert.equal(team.state.bots.length,16);assert.equal(JSON.parse(await fsp.readFile(team.file,'utf8')).prefs.serviceShortcuts.length,16);results.removePersistedWithoutDeletingBot=true;
  await launcher.getByRole('button',{name:'添加服务',exact:true}).click();const picker=page.getByRole('dialog',{name:'添加服务',exact:true});await picker.getByRole('combobox',{name:'服务分类',exact:true}).selectOption('living');await picker.getByRole('combobox',{name:'已有 Bot',exact:true}).selectOption({label:'教育培训'});await picker.getByRole('button',{name:'添加并配置',exact:true}).click();await page.locator('#settings-body #bot-name').waitFor();assert.equal(await page.locator('#bot-name').inputValue(),'教育培训');assert.equal(await page.locator('#bot-instructions').count(),1);assert.equal(await page.locator('#bot-capabilities').count(),1);assert.equal(await page.locator('#bot-mcp').count(),1);assert.equal(team.state.prefs.serviceShortcuts.find(s=>s.id==='education').group,'living');await page.getByRole('button',{name:'返回详情',exact:true}).click();await page.locator('#close-details').click();results.addUsesOriginalBotSettings=true;
  await launcher.getByRole('button',{name:'管理服务',exact:true}).click();failNext=true;await launcher.getByRole('button',{name:'移除教育培训',exact:true}).click();await page.getByText('Test save failure',{exact:true}).waitFor();await launcher.getByRole('button',{name:'教育培训',exact:true}).waitFor();results.failedSaveRollsBack=true;
  await launcher.getByRole('button',{name:'添加服务',exact:true}).click();await picker.getByRole('combobox',{name:'服务分类',exact:true}).selectOption('work');await picker.getByRole('button',{name:'新建服务',exact:true}).click();await page.getByRole('textbox',{name:'新 Bot 名称',exact:true}).fill('测试新服务');await page.locator('.pi-create-bot').getByRole('button',{name:'创建',exact:true}).click();await page.locator('#settings-body #bot-name').waitFor();assert.equal(await page.locator('#bot-name').inputValue(),'测试新服务');assert(team.state.prefs.serviceShortcuts.some(s=>s.group==='work'&&team.bot(s.id)?.name==='测试新服务'));results.createUsesOriginalBotFlow=true;
  const before=structuredClone(team.state.prefs);await assert.rejects(team.preferences({serviceShortcuts:[{kind:'bot',id:'missing',group:'work'}]}));await assert.rejects(team.preferences({serviceShortcuts:[{kind:'bot',id:'education',group:'bad'}]}));await assert.rejects(team.preferences({serviceShortcuts:[{kind:'bot',id:'education',group:'work'},{kind:'bot',id:'education',group:'living'}]}));assert.deepEqual(team.state.prefs,before);results.invalidConfigurationRejected=true;
  const first=path.join(temp,'Vault A'),second=path.join(temp,'Vault B');for(const dir of [first,second])await fsp.mkdir(path.join(dir,'.obsidian'),{recursive:true});await fsp.writeFile(path.join(first,'First.md'),'First vault fixture');await fsp.writeFile(path.join(second,'Second.md'),'Second vault fixture');await fsp.writeFile(path.join(temp,'obsidian.json'),JSON.stringify({vaults:{a:{path:first,open:true},b:{path:second}}}));
  team.state.bots.push(...['knowledge','cloud'].map(key=>({id:key,name:key==='knowledge'?'知识库':'云盘',role:'Worker',ankeServicePreset:key,chat:[],instructions:'',modelKey:''})));team.state.prefs.serviceShortcuts.push({kind:'bot',id:'knowledge',group:'learning'},{kind:'bot',id:'cloud',group:'learning'});await team.save();await page.reload();await launcher.waitFor();
  await launcher.getByRole('button',{name:'知识库',exact:true}).click();let library=page.getByRole('dialog',{name:'知识库',exact:true});await library.getByText('First',{exact:true}).waitFor();await library.getByRole('button',{name:'阅读',exact:true}).click();await library.locator('pre').filter({hasText:'First vault fixture'}).waitFor();
  await library.getByLabel('Obsidian 资料库',{exact:true}).selectOption('b');await library.getByRole('button',{name:'保存',exact:true}).click();await library.getByText('Second',{exact:true}).waitFor();assert.equal(await library.getByText('First',{exact:true}).count(),0);assert.equal(await library.locator('pre').innerText(),'');await library.getByRole('button',{name:'阅读',exact:true}).click();await library.locator('pre').filter({hasText:'Second vault fixture'}).waitFor();await library.getByLabel('检索范围',{exact:true}).selectOption('content');await library.getByLabel('检索笔记',{exact:true}).fill('vault fixture');await library.getByRole('button',{name:'检索',exact:true}).click();await library.getByText('Second vault fixture',{exact:true}).waitFor();await library.getByRole('button',{name:'阅读',exact:true}).click();await library.getByRole('button',{name:'与助手讨论',exact:true}).waitFor();await library.screenshot({path:path.join(output,'learning-library.png')});await library.getByRole('button',{name:'与助手讨论',exact:true}).click();const draft=await page.locator('#content').inputValue();assert.match(draft,/Second\.md/);assert.match(draft,/"vaultId":"b"/);assert.equal(team.state.jobs.length,0);results.learningContentSearchAndDiscussionDraft=true;
  await page.reload();await launcher.waitFor();await launcher.getByRole('button',{name:'知识库',exact:true}).click();await library.getByText('Second',{exact:true}).waitFor();assert.equal(JSON.parse(await fsp.readFile(team.file,'utf8')).ankeLearningConnections.knowledge.vaultId,'b');await library.getByRole('button',{name:'配置连接器',exact:true}).click();const settings=page.getByRole('dialog',{name:'Anke Bot 设置',exact:true});await settings.getByLabel('知识库服务',{exact:true}).waitFor();await settings.getByLabel('云盘服务',{exact:true}).waitFor();await settings.getByText('GitHub 连接状态暂时不可用。',{exact:true}).waitFor();await settings.screenshot({path:path.join(output,'learning-connectors.png')});results.learningVaultSwitchAndPersistence=true;results.learningSettingsSurviveGithubOutage=true;
  assert.deepEqual(errors,[]);results.passed=true;await page.evaluate(()=>window.dispose());console.log(JSON.stringify(results,null,2));
 }catch(e){results.passed=false;results.error=e.stack;console.error(e);if(page){await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});console.error(errors);}process.exitCode=1;}
 finally{await browser?.close();await new Promise(r=>server.close(r));await team.writes;await fsp.rm(temp,{force:true,recursive:true});fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));}
})();
