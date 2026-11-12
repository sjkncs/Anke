'use strict';
// Isolated browser component acceptance with the real Team store and panel API.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {Team}=require('../src/team');const {panelDesk}=require('../src/anke-desk');
const {harness}=require('./route-harness.cjs');
const {chromium}=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
test('service desk form persists, advances, reloads and records devices through real panel API',async ctx=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'anke-desk-ui-')),root=path.resolve(__dirname,'..');
  const team=new Team({});team.data=dir;team.file=path.join(dir,'team.json');team.queueCheckpoint=()=>{};team.state.bots=[{id:'admin',name:'Anke',role:'Administrator',modelKey:'',sessions:{}}];
  const bridge=harness(team);
  const server=http.createServer(async(req,res)=>{
    try{
      if(req.url==='/api'){let body='';for await(const chunk of req)body+=chunk;const request=JSON.parse(body),result=await bridge.onRendererCall(request.method,request.args);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return;}
      if(req.url==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<div id="app"></div><button id="open">服务台</button><script type="module">import {createServiceDesk} from "/renderer/anke-desk.mjs";import {createClient} from "/renderer/rpc.mjs";const client=createClient(async(_,request)=>{const r=await fetch("/api",{method:"POST",body:JSON.stringify(request)});const data=await r.json();if(!r.ok)throw Error(data.error);return data;});window.desk=createServiceDesk({app:document.querySelector("#app"),getSelection:()=>({kind:"bot",id:"admin"}),call:client});document.querySelector("#open").onclick=()=>desk.open();</script>');return;}
      const file=path.resolve(root,'.'+decodeURIComponent(req.url));if(!file.startsWith(root+path.sep))throw Error('Invalid path');res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':'text/css');res.end(await fs.readFile(file));
    }catch(error){res.statusCode=400;res.end(JSON.stringify({error:error.message}));}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  ctx.after(async()=>{await browser?.close();await new Promise(r=>server.close(r));await team.writes;await fs.rm(dir,{recursive:true,force:true});});
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1050,height:900}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#open').click();
  await page.getByRole('button',{name:'新增事项',exact:true}).click();
  await page.getByLabel('事项标题').fill('隔离测试空调报修');await page.getByLabel('原始资料来源').fill('测试夹具照片');await page.getByLabel('服务类型').selectOption('repair');
  await page.getByRole('button',{name:'保存',exact:true}).click();await page.getByText('隔离测试空调报修',{exact:true}).waitFor();
  await page.getByRole('button',{name:'开始处理',exact:true}).click();await page.getByLabel('处理依据 / 核验说明').fill('已整理材料，未提交物业');await page.getByRole('button',{name:'保存',exact:true}).click();await page.getByRole('button',{name:'记录处理结果',exact:true}).waitFor();
  assert.equal(team.state.ankeDesk.items[0].status,'in_progress');
  await page.getByRole('button',{name:'录入设备',exact:true}).click();await page.getByLabel('设备名称').fill('测试电表');await page.getByLabel('原始资料来源').fill('测试夹具人工读数');await page.getByLabel('楼栋 / 房间').fill('测试楼101');await page.getByLabel('设备编号').fill('test-meter');await page.getByLabel('观测时间').fill('2026-11-10T10:00:00+08:00');await page.getByRole('button',{name:'保存',exact:true}).click();await page.getByText(/测试电表 · 测试楼101/).waitFor();
  await page.getByRole('button',{name:'关闭服务台',exact:true}).click();await page.locator('#open').click();await page.getByText('隔离测试空调报修',{exact:true}).waitFor();
  const disk=JSON.parse(await fs.readFile(team.file,'utf8'));assert.equal(disk.ankeDesk.devices.length,1);assert.equal(disk.ankeDesk.items.length,1);
  await assert.rejects(panelDesk(team,{action:'dashboard',selection:{kind:'bot',id:'missing'}}));
  await page.setViewportSize({width:390,height:850});assert.ok(await page.locator('dialog').evaluate(n=>n.getBoundingClientRect().width<=390));
  await page.screenshot({path:path.resolve(root,'../../../../../../verification_welcome/anke-service-desk.png')});assert.deepEqual(errors,[]);
});
