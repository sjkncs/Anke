import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright-core');
const checks=[];
let status;
const deadline=Date.now()+40000;
do{status=JSON.parse(await readFile(new URL('./logs/status.json',import.meta.url)));if(status.length===5&&status.every(s=>s.state==='healthy'))break;await new Promise(resolve=>setTimeout(resolve,500));}while(Date.now()<deadline);
assert.equal(status.length,5);assert(status.every(s=>s.state==='healthy'));checks.push('five guarded services healthy');
const duplicate=spawn(process.execPath,[fileURLToPath(new URL('./guard.mjs',import.meta.url))],{windowsHide:true,stdio:'ignore'});
assert.equal(await new Promise((resolve,reject)=>{duplicate.once('error',reject);duplicate.once('exit',resolve);}),0);checks.push('duplicate guard exits without starting workers');
for(const port of [47831,47835]){
 const origin=`http://127.0.0.1:${port}`;
 const html=await(await fetch(origin+'/workspace/')).text();
 const token=html.match(/name="anke-service-token" content="([^"]+)"/)?.[1];assert(token);
 for(const action of ['market_query','market_events']){
  const response=await fetch(origin+'/api',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'X-Anke-Token':token},body:JSON.stringify({action,filters:action==='market_events'?{}:{recordType:'挂牌',lease:'整租'}})});
  assert.equal(response.status,200);const value=await response.json();assert(!value.error);checks.push(`${port} ${action}`);
 }
 const denied=await fetch(origin+'/api',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:'{}'});assert.equal(denied.status,403);checks.push(`${port} missing-token rejected`);
}
const browser=await chromium.connectOverCDP('http://127.0.0.1:47919');
try{
 const page=browser.contexts()[0].pages().find(p=>p.url().includes('/out/renderer/index.html')&&!p.url().includes('surface='));assert(page);
 const result=await page.evaluate(async()=>{
  const settings=await window.piDesktop.invoke('pi-desktop/settings/get');
  const plugins=await window.piDesktop.invoke('pi-desktop/plugin/list');
  return {settings:settings.ok&&!!settings.data,pluginsOk:plugins.ok,localError:document.body.innerText.includes('本地服务不可用')};
 });assert(result.settings);assert(result.pluginsOk);assert(!result.localError);checks.push('live desktop settings and plugin listing');
}finally{await browser.close();}
await writeFile(new URL('./logs/smoke.json',import.meta.url),JSON.stringify({at:new Date().toISOString(),passed:true,checks},null,2));
console.log(JSON.stringify({passed:true,checks}));
