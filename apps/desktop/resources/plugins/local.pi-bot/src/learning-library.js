'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const {StateEdit}=require('./state-edit');
const PROVIDERS={knowledge:[['obsidian','Obsidian'],['ima','ima'],['custom','其他知识库']],cloud:[['google','Google Drive'],['claude','Claude Projects'],['github','GitHub'],['custom','其他云服务']]};
const LINKS={ima:'https://ima.qq.com/',google:'https://drive.google.com/',claude:'https://claude.ai/projects',github:'https://github.com/'};
async function discover(registry=path.join(process.env.APPDATA||'', 'obsidian','obsidian.json')){
 let raw;try{raw=JSON.parse(await fs.readFile(registry,'utf8'));}catch(e){if(e.code==='ENOENT')return [];throw Error('Obsidian 库登记文件无法读取。');}
 const result=[];
 for(const [id,item] of Object.entries(raw.vaults||{})){
  if(typeof item.path!=='string'||!path.isAbsolute(item.path))continue;
  try{const root=await fs.realpath(item.path);if(!(await fs.stat(root)).isDirectory()||!(await fs.stat(path.join(root,'.obsidian'))).isDirectory())continue;result.push({id,name:path.basename(root),path:root,opened:item.open===true,ts:Number(item.ts)||0});}catch{}
 }
 return result.sort((a,b)=>Number(b.opened)-Number(a.opened)||b.ts-a.ts);
}
function scope(input){if(!['knowledge','cloud'].includes(input.service))throw Error('Unknown learning service.');return input.service;}
function config(team,service){return {provider:service==='knowledge'?'obsidian':'google',vaultId:'',connectorId:'',...(team.state.ankeLearningConnections?.[service]||{})};}
function serviceBot(team,service){return team.state.bots.find(b=>b.ankeServicePreset===service);}
function connectors(team,service){const bot=serviceBot(team,service);return (team.state.botConnectors||[]).filter(c=>bot&&c.botIds?.includes(bot.id)).map(c=>({id:c.id,name:c.name,enabled:c.enabled===true}));}
async function readNote(root,file,budget=512000){
 if(typeof file!=='string'||file.length>2000||!file.endsWith('.md')||file.split(/[\\/]/).some(p=>p.startsWith('.'))||path.isAbsolute(file))throw Error('Invalid note path.');
 const filename=await fs.realpath(path.resolve(root,file)),relative=path.relative(root,filename);
 if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Note is outside the vault.');
 const handle=await fs.open(filename,'r');try{const stat=await handle.stat();if(!stat.isFile()||stat.size>512000)throw Error('笔记超过 500 KB，请在 Obsidian 中查看。');if(stat.size>budget)throw Object.assign(Error('Search byte budget reached.'),{code:'SEARCH_BUDGET'});const bytes=Buffer.alloc(Math.min(512001,budget)),{bytesRead}=await handle.read(bytes,0,bytes.length,0);if(bytesRead>512000)throw Error('笔记超过 500 KB。');return {file:relative,text:bytes.subarray(0,bytesRead).toString('utf8'),modifiedAt:stat.mtime.toISOString(),bytesRead};}finally{await handle.close();}
}
async function view(team,service,options){const current=config(team,service),vaults=service==='knowledge'?await discover(options?.registry):[];const vault=vaults.find(v=>v.id===current.vaultId)||(!current.vaultId?vaults[0]:null);return {service,config:current,providers:PROVIDERS[service],connectors:connectors(team,service),vaults,vault:vault||null,status:current.provider==='obsidian'?(vault?'local_ready':'not_found'):(connectors(team,service).some(c=>c.id===current.connectorId&&c.enabled)?'configured':'not_connected'),links:service==='cloud'?[['Google Drive',LINKS.google],['Claude Projects',LINKS.claude],['GitHub',LINKS.github]]:[['ima',LINKS.ima]],url:LINKS[current.provider]||null};}
async function operation(team,input={},options={}){
 const service=scope(input);
 if(input.action==='status')return view(team,service,options);
 if(input.action==='configure'){
  if(!PROVIDERS[service].some(([id])=>id===input.provider))throw Error('Unknown provider.');
  const connectorId=input.connectorId||'',vaultId=input.vaultId||'';
  if(typeof connectorId!=='string'||connectorId.length>200||typeof vaultId!=='string'||vaultId.length>200)throw Error('Invalid connection selection.');
  if(input.provider==='obsidian'&&connectorId||input.provider!=='obsidian'&&vaultId)throw Error('Provider and connection selection do not match.');
  if(connectorId&&!connectors(team,service).some(c=>c.id===connectorId))throw Error('请选择已授权给此服务 Bot 的连接器。');
  if(vaultId&&!(await discover(options.registry)).some(v=>v.id===vaultId))throw Error('Obsidian 库不可用。');
  const edit=new StateEdit();try{await team.save(()=>edit.rollback(),()=>{edit.set(team.state,'ankeLearningConnections',{...team.state.ankeLearningConnections,[service]:{provider:input.provider,connectorId,vaultId}});});}catch(e){edit.rollback();throw e;}return view(team,service,options);
 }
 const current=await view(team,service,options);
 if(input.action==='tools'){
  if(!current.config.connectorId||!current.connectors.some(c=>c.id===current.config.connectorId&&c.enabled))throw Error('请先配置并启用服务连接器。');
  return team.bridge.list(serviceBot(team,service).id,current.config.connectorId);
 }
 if(service!=='knowledge'||current.config.provider!=='obsidian')throw Error('请使用已授权连接器的工具访问此服务。');
 if(!current.vault)throw Error('未发现可用的 Obsidian 库，请先在 Obsidian 中打开资料库。');
 if(input.vaultId!==undefined&&input.vaultId!==current.vault.id)throw Error('资料库已切换，请刷新后重新选择笔记。');
 const root=current.vault.path;
 if(input.action==='read'){
  const {bytesRead,...note}=await readNote(root,input.file);return {...note,source:'Obsidian / '+current.vault.name};
 }
 if(input.action!=='search')throw Error('Unknown library action.');
 const query=String(input.query||'').trim().toLocaleLowerCase();if(query.length>200)throw Error('检索词过长。');
 const mode=input.mode||'filename';if(!['filename','content'].includes(mode))throw Error('Unknown search mode.');
 const offset=Number(input.offset||0);if(!Number.isSafeInteger(offset)||offset<0)throw Error('Invalid offset.');
 const items=[],queue=[''];let scanned=0,notesRead=0,skipped=0,totalMatches=0;
 while(queue.length){const dir=queue.shift();const entries=await fs.readdir(path.join(root,dir),{withFileTypes:true});entries.sort((a,b)=>a.name.localeCompare(b.name));for(const entry of entries){scanned++;if(entry.name.startsWith('.')||entry.isSymbolicLink())continue;const relative=path.join(dir,entry.name);if(entry.isDirectory()){queue.push(relative);continue;}if(!entry.isFile()||!entry.name.endsWith('.md'))continue;
  const titleMatch=relative.toLocaleLowerCase().includes(query);let match=titleMatch,snippet='';
  if(mode==='content'&&query){notesRead++;try{const note=await readNote(root,relative);const at=note.text.toLocaleLowerCase().indexOf(query);if(at>=0){match=true;snippet=note.text.slice(Math.max(0,at-50),at+query.length+110).replace(/\s+/g,' ');}}catch{skipped++;}}
  if(match){if(totalMatches>=offset&&items.length<50)items.push({file:relative,name:entry.name.slice(0,-3),...(snippet?{snippet}:{}),match:titleMatch?'title':'content'});totalMatches++;}
 }}
 return {vault:current.vault.name,items,nextOffset:totalMatches>offset+50?offset+50:null,truncated:skipped>0,complete:skipped===0,totalMatches,scanned,skipped,notesRead,searchMode:mode,source:'Obsidian'};
}
async function botOperation(team,input,owner){if(owner.room||owner.bot.ankeServicePreset!==input.service)throw Error('Only this service private Bot can access its library.');if(input.action==='configure')throw Error('Change providers in connector settings.');return operation(team,input);}
module.exports={operation,botOperation,discover};
