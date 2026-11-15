import {el} from './dom.mjs';
import {soft,row,section,choose,href} from './settings-ui.mjs';
const LABELS={local_ready:'已关联本地库',not_found:'未发现可用资料库',configured:'已配置 · 待检查连接',not_connected:'待连接'};
export async function connectionControls({host,call,onManage=()=>{},onError=()=>{},onSaved=()=>{},service}){
 const value=await call('team.learning.library',{service,action:'status'});
 if(!host.isConnected)return;
 const provider=choose(service==='knowledge'?'知识库服务':'云盘服务',value.providers,value.config.provider),vault=choose('Obsidian 资料库',[['','自动 · 最近打开'],...value.vaults.map(v=>[v.id,v.name])],value.config.vaultId),connector=choose('服务连接器',[['','未选择'],...value.connectors.map(c=>[c.id,c.name+(c.enabled?'':' · 已停用')])],value.config.connectorId);
 const detail=el('span',LABELS[value.status]),actions=el('div','','bt-actions');
 const sync=()=>{vault.hidden=provider.value!=='obsidian';connector.hidden=provider.value==='obsidian';};provider.onchange=()=>{connector.value='';sync();};sync();
 const save=soft('保存',async()=>{provider.disabled=vault.disabled=connector.disabled=true;try{const result=await call('team.learning.library',{service,action:'configure',provider:provider.value,vaultId:provider.value==='obsidian'?vault.value:'',connectorId:provider.value==='obsidian'?'':connector.value});if(!host.isConnected)return;detail.textContent=LABELS[result.status];await onSaved(result);}finally{provider.disabled=vault.disabled=connector.disabled=false;}});
 save.addEventListener('settings-error',e=>onError(e.detail.message));
 actions.append(save,soft('管理连接器',onManage));
 host.append(row(service==='knowledge'?'知识库':'云盘','',provider,vault,connector),row('连接状态','',detail,actions));
 return value;
}
export function createLearningLibrary({app,call,onConfigure,onDiscuss,notice}){
 let dialog,epoch=0;
 async function open(service){
  dialog?.close();dialog?.remove();const ticket=++epoch;
  const box=dialog=el('dialog','','anke-service-picker anke-learning-library');box.setAttribute('aria-label',service==='knowledge'?'知识库':'云盘');Object.assign(box.style,{width:'min(720px,90vw)',maxHeight:'82vh',overflow:'auto'});
  box.addEventListener('settings-error',event=>notice(event.detail.message));
  const actions=el('div','','bt-actions'),content=el('div'),status=el('p');status.setAttribute('role','status');
  const close=soft('关闭',()=>box.close()),manage=soft('配置连接器',()=>{box.close();onConfigure();});actions.append(manage,close);box.append(el('h2',service==='knowledge'?'知识库':'云盘'),actions,status,content);app.append(box);box.addEventListener('close',()=>{if(dialog===box){epoch++;dialog=null;}box.remove();},{once:true});box.showModal();
  const current=()=>ticket===epoch&&box.open;
  const request=input=>call('team.learning.library',{service,...input});
  try{
   const view=await request({action:'status'});if(!current())return;status.textContent=LABELS[view.status]+(view.vault?' · '+view.vault.name:'');
   const controls=section('服务');content.append(controls);await connectionControls({host:controls.querySelector('.bt-set-card'),call,onManage:()=>{box.close();onConfigure();},onError:notice,onSaved:()=>current()?open(service):undefined,service});if(!current())return;
   if(service==='knowledge'&&view.config.provider==='obsidian'&&view.vault){
    const form=el('form'),query=el('input','','bt-input'),mode=choose('检索范围',[['filename','标题与路径'],['content','标题与正文']],'filename'),results=el('div'),note=el('pre');query.type='search';query.placeholder='输入关键词';query.setAttribute('aria-label','检索笔记');Object.assign(note.style,{whiteSpace:'pre-wrap',font:'inherit',overflowWrap:'anywhere'});
    const search=el('button','检索','bt-soft');search.type='submit';form.append(query,mode,search);const noteActions=el('div','','bt-actions');content.append(form,results,note,noteActions);let searchEpoch=0,readEpoch=0;
    async function load(offset=0){const version=++searchEpoch;search.disabled=true;status.textContent='正在扫描资料库…';try{const data=await request({action:'search',query:query.value,mode:mode.value,offset,vaultId:view.vault.id});if(!current()||version!==searchEpoch)return;status.textContent=data.truncated?'扫描结束 · 部分笔记未能读取':'扫描完成'+(Number.isFinite(data.totalMatches)?' · '+data.totalMatches+' 条匹配':'');readEpoch++;note.textContent='';noteActions.replaceChildren();results.replaceChildren();for(const item of data.items){results.append(row(item.name,item.snippet||item.file,soft('阅读',async()=>{const revision=++readEpoch;const data=await request({action:'read',file:item.file,vaultId:view.vault.id});if(current()&&revision===readEpoch){note.textContent=data.source+' · '+data.file+'\n\n'+data.text;noteActions.replaceChildren(href('在 Obsidian 打开','obsidian://open?vault='+encodeURIComponent(view.vault.name)+'&file='+encodeURIComponent(data.file)));if(onDiscuss)noteActions.append(soft('与助手讨论',()=>{box.close();onDiscuss(service,{file:data.file,vaultId:view.vault.id,vaultName:view.vault.name});}));}})));}if(!data.items.length)results.append(el('p',data.truncated?'已读取的笔记中没有匹配；部分笔记未能读取。':'没有匹配的笔记'));if(data.nextOffset!==null)results.append(soft('下一页',()=>load(data.nextOffset)));if(offset)results.append(soft('返回首页',()=>load()));if(data.truncated)results.append(el('p','存在未读取的笔记，结果不代表完整资料库。'));if(data.skipped)results.append(el('p',data.skipped+' 篇笔记无法读取或超过大小限制。'));}catch(e){if(current())status.textContent=e.message;}finally{if(version===searchEpoch)search.disabled=false;}}
    form.onsubmit=e=>{e.preventDefault();load();};await load();
   }else{
    const links=el('div','','bt-actions');for(const [name,url] of view.links)links.append(href(name,url));content.append(links);
    const toolList=el('div');toolList.setAttribute('aria-label','已授权工具');content.append(soft('检查已授权工具',async()=>{const result=await request({action:'tools'});if(current()){const tools=Array.isArray(result)?result:result.tools||[];toolList.replaceChildren();for(const tool of tools)toolList.append(row(tool.name||tool.id||'工具',tool.description||''));if(!tools.length)toolList.append(el('p','此连接器尚未提供可用工具。'));}}),toolList);
   }
   content.append(soft('刷新',()=>open(service)));
  }catch(e){if(current())status.textContent=e.message;}
 }
 return {open,close(){epoch++;dialog?.close();dialog?.remove();dialog=null;}};
}
