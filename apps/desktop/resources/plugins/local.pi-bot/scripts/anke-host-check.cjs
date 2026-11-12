const {spawn}=require('node:child_process');
const {createInterface}=require('node:readline');
const path=require('node:path'),fs=require('node:fs'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../../../../..');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'anke-bot-host-'));
const child=spawn(path.join(root,'pi-official-runtime-0.21.0/resources/bin/pi-desktop-host-core.exe'),[],{windowsHide:true,env:{...process.env,PI_DESKTOP_DATA_DIR:profile,PI_DESKTOP_BUILTIN_PLUGINS_DIR:path.resolve(__dirname,'../..')},stdio:['pipe','pipe','pipe']});
const pending=new Map();let serial=0;
child.stderr.on('data',data=>process.stderr.write(data));
createInterface({input:child.stdout}).on('line',line=>{const m=JSON.parse(line),p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}});
function call(method,params={}){return new Promise((resolve,reject)=>{const id=String(++serial),timer=setTimeout(()=>reject(Error('Timeout: '+method)),60000);pending.set(id,{resolve,reject,timer});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});}
(async()=>{try{await call('app.handshake',{protocolVersion:11});const result=await call('plugins.list');const rows=Array.isArray(result)?result:result.plugins;const bot=rows.find(p=>p.id==='local.pi-bot');assert.ok(bot,'Anke Bot must register on the official host');assert.equal(bot.name,'Anke Bot');assert.equal(bot.enabled,true);console.log('PASS: official 0.21 host registers bundled Anke Bot, enabled, native manifest accepted.');}finally{child.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
