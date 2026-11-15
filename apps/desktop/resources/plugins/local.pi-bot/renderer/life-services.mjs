import {el} from './dom.mjs';
import {soft,row,section,choose,textInput,href} from './settings-ui.mjs';
export async function mountLifeSettings({body,call,notice}){
 const view=await call('team.life',{action:'status'});if(!body.isConnected)return;
 let config={...view.config},saving=false;
 const save=soft('保存生活服务设置',async()=>{saving=true;try{await call('team.life',{action:'configure',config});notice('生活服务设置已保存。');}finally{saving=false;}});
 const flag=(label,key)=>choose(label,[['false','关闭'],['true','开启']],String(config[key]),v=>{config[key]=v==='true';});
 const news=section('猜您想看',row('资讯推荐','',flag('资讯推荐','enabled')),row('记住阅读偏好','',flag('记住阅读偏好','remember')),row('低刺激阅读','按您的选择降低强刺激内容排序，不影响住房、政策及风险通知。',flag('低刺激阅读','lowStimulus')));
 const topics=el('div','','bt-actions');for(const topic of view.topics){const label=el('label'),input=el('input');input.type='checkbox';input.checked=config.topics.includes(topic);input.onchange=()=>{config.topics=input.checked?[...config.topics,topic]:config.topics.filter(t=>t!==topic);};label.append(input,document.createTextNode(topic));topics.append(label);}news.querySelector('.bt-set-card').append(row('新闻板块','',topics),row('每次最多展示','',choose('每次最多展示',[['3','3 条'],['6','6 条'],['10','10 条'],['20','20 条']],String(config.dailyLimit),v=>{config.dailyLimit=Number(v);})),row('阅读记录','',soft('清除偏好记录',async()=>{await call('team.life',{action:'clearHistory'});notice('偏好记录已清除。');})));body.append(news);
 const care=section('日常关怀',row('关怀提醒','',flag('关怀提醒','care')));
 for(const [label,key] of [['早餐建议','breakfast'],['午间咖啡建议','coffee'],['下班及出差出行建议','taxi'],['子女语音辅导与签字提醒','tutoring']])care.querySelector('.bt-set-card').append(row(label,'',flag(label,key)));
 const timing=section('时间与任务优先级');for(const [label,key] of [['早间','morning'],['午间','noon'],['晚间','evening'],['免打扰开始','quietStart'],['免打扰结束','quietEnd']]){const input=textInput(label,'','time');input.value=config[key];input.onchange=()=>{config[key]=input.value;};timing.querySelector('.bt-set-card').append(row(label,'北京时间',input));}
 timing.querySelector('.bt-set-card').append(row('任务冲突时','',choose('任务优先级',[['ask','让我选择'],['foreground','当前任务优先'],['care','关怀提醒优先']],config.priority,v=>{config.priority=v;})));
 body.append(care,timing,section('连接与确认',row('点餐与叫车','确认产品、价格、时间、地点后再交给对应服务；恢复后先核对回执。'),row('辅导平台','',href('智小研','https://spising.cn/'),href('北大 Open Agent','https://openagent.pku.edu.cn/'))),save);
 body.addEventListener('settings-error',e=>notice(e.detail.message),{once:true});return ()=>saving;
}
export function createLifePanel({app,call,notice,onSettings,onDiscuss}){
 let dialog,epoch=0,disposed=false;
 async function open(service='for-you'){
  if(disposed)return;
  dialog?.close();const box=dialog=el('dialog','','anke-service-picker anke-life-panel');const ticket=++epoch;
  box.setAttribute('aria-label',service==='for-you'?'猜您想看':'日常关怀');Object.assign(box.style,{width:'min(720px,90vw)',maxHeight:'82vh',overflow:'auto',padding:'24px',background:'var(--bt-main,#fff)',color:'var(--bt-ink,#333)',border:'1px solid var(--bt-line-2,#ccc)',borderRadius:'16px'});
  const style=el('style');style.textContent='.anke-learning-library .bt-set-section{margin:20px 0}.anke-learning-library .bt-set-card{padding:16px;border-radius:12px;background:var(--bt-card,#f5f5f5)}.anke-learning-library .bt-set-row{display:flex;gap:16px;justify-content:space-between;align-items:center}.anke-learning-library .bt-set-copy{display:flex;flex-direction:column;gap:6px}.anke-learning-library .bt-set-hint{color:var(--bt-ink-2,#666);font-size:12px}.anke-learning-library .bt-soft{padding:7px 12px;border:1px solid var(--bt-line-2,#ddd);border-radius:9px;background:var(--bt-main,#fff);color:inherit;cursor:pointer;margin:3px}.anke-learning-library h2{font-size:20px}.anke-learning-library h3{font-size:15px}';box.append(style);
  const content=el('div'),status=el('p','','pi-learning-hint'),actions=el('div','','bt-actions');status.setAttribute('role','status');
  const request=async(action,extra={})=>call('team.life',{action,...extra});const current=()=>ticket===epoch&&box.open;
  async function render(){const value=await request('status');if(!current())return;content.replaceChildren();
   if(service==='for-you'){
    status.textContent=value.lastRefresh?'腾讯新闻 · '+new Date(value.lastRefresh).toLocaleString():'尚未读取资讯';
    if(!value.news.length)content.append(el('p',value.config.enabled?'暂无符合所选板块的资讯。':'请在生活服务设置中开启资讯推荐。'));
    for(const item of value.news){const card=section(item.title,row(item.publisher||'腾讯新闻',item.publishedAt||'日期未提供',el('span',item.topic))),details=el('p',item.abstract||'');card.append(details);const a=href('阅读原文',item.url);a.target='_blank';a.rel='noopener noreferrer';a.onclick=()=>{if(value.config.remember)request('feedback',{topic:item.topic,value:'more'}).catch(()=>{});};card.append(a,soft('少看此类',async()=>{await request('feedback',{topic:item.topic,value:'less'});await render();}));content.append(card);}
   }else{
    status.textContent='建议与提醒 · 待您确认后交给对应服务';const pending=value.offers.filter(o=>['pending','deferred','priority_required'].includes(o.status));
    if(!pending.length)content.append(el('p','当前没有待处理的关怀提醒。'));
    if(value.config.tutoring)content.append(soft('开始语音辅导',()=>{box.close();onDiscuss({service:'education',text:'请先确认孩子的年级、学科、教材与学习目标，再通过已配置的语音能力逐步辅导和批改；需要家长签字时仅提醒本人。'});}));
    for(const offer of pending){const card=section(offer.status==='priority_required'?'与当前任务同时到达':'日常关怀',row(offer.text,new Date(offer.at).toLocaleString()));for(const [label,choice] of [['继续准备','continue'],['稍后处理','later'],['忽略','dismiss']])card.append(soft(label,async()=>{const r=await request('resolve',{id:offer.id,choice});await render();if(choice==='continue'){box.close();onDiscuss(r.offer);}}));content.append(card);}
   }
  }
  actions.append(soft('设置',()=>{box.close();onSettings();}),soft('关闭',()=>box.close()));
  if(service==='for-you')actions.prepend(soft('刷新资讯',async()=>{status.textContent='正在读取腾讯新闻…';await request('refresh');await render();}));
  if(service==='care')actions.prepend(soft('检查关怀提醒',async()=>{await request('poll');await render();}));
  box.addEventListener('settings-error',e=>{if(current())status.textContent=e.detail.message;});box.addEventListener('close',()=>{if(dialog===box){dialog=null;epoch++;}box.remove();},{once:true});box.append(el('h2',service==='for-you'?'猜您想看':'日常关怀'),actions,status,content);app.append(box);box.showModal();try{await render();}catch(e){if(current())notice(e.message);}
 }
 let polling=false,lastMinute='',lastNewsAttempt=0,notified=new Set();
 async function poll(){if(disposed||polling||document.hidden)return;const minute=new Date().toISOString().slice(0,16);if(minute===lastMinute)return;lastMinute=minute;polling=true;try{const value=await call('team.life',{action:'status'});if(disposed)return;const time=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date()),p=value.config;const quiet=p.quietStart===p.quietEnd?false:p.quietStart<p.quietEnd?time>=p.quietStart&&time<p.quietEnd:time>=p.quietStart||time<p.quietEnd;
   if(p.enabled&&!quiet&&Date.now()-lastNewsAttempt>=1800000&&Date.now()-value.lastRefresh>=1800000){lastNewsAttempt=Date.now();try{await call('team.life',{action:'refresh'});}catch{}}
   if(disposed||!p.care)return;await call('team.life',{action:'poll'});if(disposed)return;const next=await call('team.life',{action:'status'}),pending=next.offers.find(o=>['pending','priority_required'].includes(o.status)&&!notified.has(o.id));if(!disposed&&pending&&!dialog&&!app.querySelector('dialog[open]')){notified.add(pending.id);await open('care');}}catch{}finally{polling=false;}}
 return {open,poll,dispose(){disposed=true;epoch++;dialog?.close();}};
}
