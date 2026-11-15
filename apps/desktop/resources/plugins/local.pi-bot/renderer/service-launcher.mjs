import {el} from './dom.mjs';
import {SERVICE_ARTWORK} from './service-artwork.mjs';
import {VISUAL_WORKSPACES} from './visual-workspace.mjs';
export const SERVICE_ENTRIES=[['education','教育培训'],['food','外卖配送'],['parcel','快递寄送'],['repair','设备报修'],['billing','费用缴纳'],['property','物业通知'],['activities','社区活动'],['operations','智能运维'],['iot','智能公寓'],['health','医疗保障'],['remote-work','居家工作'],['campus','校园动态'],['mail','邮件中心'],['wealth','财富管理'],['career','职业规划']];
const PERSONAL_GROUPS={knowledge:'learning',cloud:'learning',research:'learning',diet:'wellbeing',exercise:'wellbeing',nutrition:'wellbeing',yangming:'wellbeing',shopping:'travel-shopping',travel:'travel-shopping',itinerary:'travel-shopping'};
SERVICE_ENTRIES.push(['knowledge','知识库'],['cloud','云盘'],['research','科研中心'],['diet','日常饮食'],['exercise','锻炼计划'],['nutrition','营养搭配'],['yangming','阳明讲堂'],['shopping','购物清单'],['travel','旅游计划'],['itinerary','行程管理']);
SERVICE_ENTRIES.push(['for-you','猜您想看'],['care','日常关怀']);
const ART_ALIASES={knowledge:'education',cloud:'parcel',research:'remote-work',diet:'food',exercise:'health',nutrition:'food',yangming:'education',shopping:'parcel',travel:'career',itinerary:'activities','for-you':'campus',care:'health'};
export function serviceArtwork(key,size=36){
  if(!SERVICE_ENTRIES.some(([id])=>id===key))return null;
  const strokes={'for-you':'M49 107 Q45 76 48 44 Q70 39 82 48 Q98 39 116 44 L118 109 Q98 104 83 113 Q65 104 49 107 M82 49 L83 113 M57 59 L73 58 M57 74 L73 73 M95 58 L109 57 M95 73 L109 72 M95 89 L109 88',care:'M37 70 Q30 48 47 43 Q62 38 79 55 Q95 38 110 44 Q131 53 116 77 Q104 94 79 113 Q52 94 37 70'};
  const image=el('img','','anke-service-art');image.src=strokes[key]?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 160 160"><rect width="160" height="160" rx="28" fill="#f6f6f3"/><path d="'+strokes[key]+'" fill="none" stroke="#5b615f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'):SERVICE_ARTWORK[ART_ALIASES[key]||key];image.alt='';image.width=size;image.height=size;image.draggable=false;
  Object.assign(image.style,{width:size+'px',height:size+'px',objectFit:'contain',borderRadius:'10px',flexShrink:'0'});return image;
}
export const SERVICE_GROUPS=[['work','工作与学习'],['living','生活服务'],['housing','住房与物业'],['wealth','财富管理'],['learning','终身学习'],['wellbeing','修身养性'],['travel-shopping','购物旅游']];
const managementModes=new WeakMap();
export function serviceShortcuts(state){
  if(Array.isArray(state.prefs?.serviceShortcuts))return state.prefs.serviceShortcuts.filter(s=>s.kind==='bot'?state.bots.some(b=>b.id===s.id):VISUAL_WORKSPACES.some(w=>w.id===s.id));
  return [...SERVICE_ENTRIES.flatMap(([key])=>{const bot=state.bots.find(b=>b.ankeServicePreset===key);const group=PERSONAL_GROUPS[key]||(key==='wealth'?'wealth':['education','remote-work','campus','mail','career'].includes(key)?'work':['repair','billing','property','operations','iot'].includes(key)?'housing':'living');return bot?[{kind:'bot',id:bot.id,group}]:[];}),...VISUAL_WORKSPACES.map(w=>({kind:'visual',id:w.id,group:w.id==='niulai'?'wealth':'housing'}))];
}
function handButton(label,minus=false){
  const button=el('button','','anke-service-hand');button.type='button';button.title=label;button.setAttribute('aria-label',label);
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  for(const [key,value]of Object.entries({viewBox:'0 0 28 28',width:'25',height:'25',fill:'none',stroke:'currentColor','stroke-width':'1.5','stroke-linecap':'round','aria-hidden':'true'}))svg.setAttribute(key,value);
  const path=document.createElementNS(ns,'path');path.setAttribute('d',minus?'M6 14.4 Q14 13.4 22 14':'M6 14.4 Q14 13.4 22 14 M14.3 6 Q13.5 14 14 22');svg.append(path);button.append(svg);return button;
}
export function renderServiceLauncher(target,state,select,openVisual,options={}){
  const shortcuts=serviceShortcuts(state),section=el('section','','anke-service-launcher');section.setAttribute('aria-label','服务功能');
  const heading=el('div','','anke-service-heading'),title=el('span','服务'),add=handButton('添加服务'),remove=handButton('管理服务',true);
  heading.append(title,add,remove);add.onclick=()=>options.add?.();
  section.classList.toggle('is-managing',Boolean(managementModes.get(target)));remove.setAttribute('aria-pressed',String(Boolean(managementModes.get(target))));remove.onclick=()=>{const active=section.classList.toggle('is-managing');managementModes.set(target,active);remove.setAttribute('aria-pressed',String(active));};section.append(heading);
  for(const [group,label] of SERVICE_GROUPS){
    const region=el('section','','anke-service-region');region.setAttribute('aria-label',label);region.append(el('h3',label));const grid=el('div','','anke-service-grid');
    for(const shortcut of shortcuts.filter(s=>s.group===group)){
      const bot=shortcut.kind==='bot'?state.bots.find(b=>b.id===shortcut.id):null,visual=shortcut.kind==='visual'?VISUAL_WORKSPACES.find(w=>w.id===shortcut.id):null;
      if(!bot&&!visual)continue;const name=bot?.name||visual.name;
      const entry=el('div','','anke-service-tile'),button=el('button','','anke-service-entry');button.type='button';button.setAttribute('aria-label',name);button.title=name;
      const art=serviceArtwork(bot?.ankeServicePreset||visual?.art,40)||el('span','◇','anke-service-custom-art');button.append(art,el('span',name));
      button.onclick=()=>bot?(options.openService&&['knowledge','cloud','for-you','care'].includes(bot.ankeServicePreset)?options.openService(bot.ankeServicePreset):select('bot',bot.id)):openVisual?.(visual.id);entry.append(button);
      const tools=el('div','','anke-service-tools'),minus=handButton('移除'+name,true);minus.onclick=()=>options.save?.(shortcuts.filter(s=>s!==shortcut));tools.append(minus);
      if(bot){const config=el('button','配置','anke-service-config');config.type='button';config.setAttribute('aria-label','配置'+name);config.onclick=()=>options.configure?.(bot);tools.append(config);}
      entry.append(tools);grid.append(entry);
    }
    region.append(grid);section.append(region);
  }
  target.append(section);
}
export function servicePicker(host,state,{save,create,configure,onError}){
  const dialog=el('dialog','','anke-service-picker');dialog.setAttribute('aria-label','添加服务');
  const form=el('form'),heading=el('h2','添加服务'),group=el('select'),bot=el('select');group.setAttribute('aria-label','服务分类');bot.setAttribute('aria-label','已有 Bot');
  for(const [id,label] of SERVICE_GROUPS){const option=el('option',label);option.value=id;group.append(option);}
  const current=serviceShortcuts(state),existing=new Set(current.map(s=>s.kind+':'+s.id));
  const available=[...state.bots.map(b=>({kind:'bot',id:b.id,name:b.name})),...VISUAL_WORKSPACES.map(w=>({kind:'visual',id:w.id,name:w.name}))].filter(s=>!existing.has(s.kind+':'+s.id));
  available.forEach((item,index)=>{const option=el('option',item.name);option.value=String(index);bot.append(option);});
  const actions=el('div','','anke-service-picker-actions'),cancel=el('button','取消','bt-soft'),fresh=el('button','新建服务','bt-soft'),submit=el('button','添加并配置','bt-soft');cancel.type=fresh.type='button';submit.type='submit';submit.disabled=!available.length;
  let busy=false;dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  cancel.onclick=()=>dialog.close();fresh.onclick=()=>{const value=group.value;dialog.close();create(value);};
  form.onsubmit=async event=>{event.preventDefault();if(submit.disabled)return;const item=available[Number(bot.value)];if(!item)return;busy=true;for(const control of [submit,cancel,fresh,group,bot])control.disabled=true;try{await save([...current,{kind:item.kind,id:item.id,group:group.value}]);dialog.close();if(item.kind==='bot')configure(state.bots.find(b=>b.id===item.id));}catch(error){onError(error);}finally{busy=false;for(const control of [submit,cancel,fresh,group,bot])control.disabled=false;}};
  actions.append(cancel,fresh,submit);form.append(heading,el('label','分类'),group,el('label','服务 Bot'),bot,actions);dialog.append(form);host.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();return dialog;
}
