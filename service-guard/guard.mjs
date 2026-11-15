import net from 'node:net';
import {spawn, execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir, appendFile, writeFile, rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {openSync,closeSync} from 'node:fs';
import {decide} from './policy.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const logs=path.join(root,'service-guard/logs');
const exec=promisify(execFile);
const python='E:/FFD-Downloader-Windows/_workspace/rent_cockpit_runtime/.venv/Scripts/python.exe';
const services=[
  {id:'housing',script:'talent-housing/server.mjs',port:47831,service:'anke-talent-housing',version:2},
  {id:'workspace',script:'talent-housing/city-preview.mjs',port:47835,service:'anke-talent-housing',version:2},
  {id:'inspection',script:'housing_monitor/inspection/server.mjs',port:47836,service:'anke-inspection',version:1},
  {id:'events',script:'event-monitor/monitor.py',port:18743,service:'anke-events'},
  {id:'listings',script:'rent-knowledge/listing_sync.py'},
];
const attempts=new Map(), states=new Map();
let closing=false;
await mkdir(logs,{recursive:true});
async function log(value){await appendFile(path.join(logs,'guard.jsonl'),JSON.stringify({at:new Date().toISOString(),...value})+'\n');}
// Exclusive loopback bind owns the guard lifetime; no PID-file stale-lock race.
const lock=net.createServer(socket=>socket.end());
try{await new Promise((resolve,reject)=>{lock.once('error',reject);lock.listen(18745,'127.0.0.1',resolve);});}
catch(error){if(error.code==='EADDRINUSE')process.exit(0);throw error;}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{closing=true;lock.close();});
async function processes(){
  const {stdout}=await exec('powershell.exe',['-NoProfile','-Command',"$inventory = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('node.exe','python.exe') } | Select-Object ProcessId,CommandLine) | ConvertTo-Json -Compress; [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($inventory))"],{windowsHide:true,timeout:10000,maxBuffer:2000000});
  const value=JSON.parse(Buffer.from(stdout.trim(),'base64').toString('utf16le')||'[]');return Array.isArray(value)?value:[value];
}
async function occupied(port){return new Promise(resolve=>{const socket=net.connect({host:'127.0.0.1',port});socket.setTimeout(800);socket.once('connect',()=>{socket.destroy();resolve(true);});socket.once('error',()=>resolve(false));socket.once('timeout',()=>{socket.destroy();resolve(false);});});}
async function cycle(){
  const inventory=await processes(), snapshot=[];
  for(const entry of services){
    const script=path.join(root,entry.script), normalized=script.replaceAll('\\','/').toLowerCase();
    const running=inventory.some(p=>(p.CommandLine||'').replaceAll('\\','/').toLowerCase().includes(normalized));
    let healthy=false, portUsed=false;
    if(entry.port){
      portUsed=await occupied(entry.port);
      try{const response=await fetch(`http://127.0.0.1:${entry.port}/health`,{signal:AbortSignal.timeout(2000)});const body=await response.json();healthy=response.ok&&body.service===entry.service&&(!entry.version||body.version===entry.version);}catch{}
    }else healthy=running; // Process liveness only; source success is tracked by the existing checkpoints.
    const history=attempts.get(entry.id)||[];
    const state=decide({healthy,occupied:portUsed,running,attempts:history,now:Date.now()});
    if(state==='start'){
      attempts.set(entry.id,[...history.filter(t=>Date.now()-t<600000),Date.now()]);
      const output=openSync(path.join(logs,entry.id+'.stdout.log'),'a');
      const errors=openSync(path.join(logs,entry.id+'.stderr.log'),'a');
      let child;
      try{child=spawn(entry.script.endsWith('.py')?python:process.execPath,[script,...(entry.script.endsWith('.py')?['--serve']:[])],{cwd:path.dirname(script),windowsHide:true,detached:true,stdio:['ignore',output,errors],env:process.env});}
      finally{closeSync(output);closeSync(errors);}
      child.once('error',error=>{void log({service:entry.id,event:'spawn_error',code:error.code});});child.unref();
      await log({service:entry.id,event:'start',pid:child.pid});
    }
    if(states.get(entry.id)!==state){await log({service:entry.id,event:'state',state});states.set(entry.id,state);}
    snapshot.push({service:entry.id,state,checkedAt:new Date().toISOString(),attempts:attempts.get(entry.id)?.length||0});
  }
  const target=path.join(logs,'status.json');await writeFile(target+'.tmp',JSON.stringify(snapshot,null,2));await rename(target+'.tmp',target);
}
await log({event:'guard_started',pid:process.pid});
while(!closing){try{await cycle();}catch(error){await log({event:'cycle_error',code:error.code||error.name});}if(!closing)await new Promise(resolve=>setTimeout(resolve,15000));}
