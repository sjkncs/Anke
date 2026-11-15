// Refresh offline annotations once per changed source snapshot, then deploy.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=__dirname;
const source=path.join(root,'../event-monitor/data/events.json');
const audit=path.join(root,'data/event-semantic-audit.json');
const sourceHash=()=>crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
let old;try{old=JSON.parse(fs.readFileSync(audit,'utf8'));}catch{}
const before=sourceHash();
if(old?.sourceSha256!==before){
 const result=spawnSync(path.join(root,'.semantic-venv/Scripts/python.exe'),[path.join(root,'event-semantic.py')],{encoding:'utf8',timeout:60000,windowsHide:true});
 if(result.status!==0)throw Error('Offline semantic analysis failed: '+(result.error?.message||result.stderr?.slice(-500)));
 if(sourceHash()!==before)throw Error('Source changed during analysis; retry next collection');
 console.log(result.stdout.trim());
}
const sync=spawnSync(process.execPath,[path.join(root,'sync-event-tone.cjs')],{encoding:'utf8',timeout:15000,windowsHide:true});
if(sync.status!==0)throw Error('Semantic deployment failed: '+sync.stderr);
console.log(sync.stdout.trim());
