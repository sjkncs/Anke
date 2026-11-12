import {el} from './dom.mjs';
const STATUS={open:'待处理',in_progress:'处理中',resolved:'已处理待核验',closed:'已关闭'};
export function createServiceDesk({app,call,getSelection}){
  const dialog=el('dialog','','anke-desk-dialog'),head=el('div','','bt-actions'),body=el('div'),message=el('p','','feature-note');
  dialog.setAttribute('aria-label','安客服务台');message.setAttribute('role','status');
  Object.assign(dialog.style,{boxSizing:'border-box',width:'min(720px, calc(100vw - 48px))',maxHeight:'85vh',overflow:'auto',padding:'24px',border:'1px solid #aaa6',borderRadius:'16px',background:'var(--bg, #fafafa)',color:'inherit'});
  let selection=null,epoch=0;
  const button=(label,run)=>{const b=el('button',label,'soft-button');b.type='button';b.onclick=async()=>{if(b.disabled)return;b.disabled=true;try{await run();}catch(error){if(dialog.open)message.textContent=error.message;}finally{b.disabled=false;}};return b;};
  const close=()=>{epoch++;dialog.close();};
  head.append(el('strong','安客服务台'),button('关闭服务台',close));dialog.append(head,message,body);app.append(dialog);
  dialog.addEventListener('close',()=>{epoch++;});
  const invoke=input=>call('team.anke.desk',{...input,selection});
  async function render(){
    const ticket=++epoch;message.textContent='正在读取…';const result=await invoke({action:'dashboard'});if(ticket!==epoch||!dialog.open||!dialog.isConnected)return;
    message.textContent='本会话本地记录 · 物业、支付、邮箱与设备网关尚未连接';body.replaceChildren();
    body.append(el('p',`待办 ${result.active} · 逾期 ${result.overdue} · 设备 ${result.devices.length}`));
    const actions=el('div','','bt-actions');actions.append(button('新增事项',()=>form(result.catalog)),button('录入设备',()=>form(result.catalog,true)),button('刷新服务台',render));body.append(actions);
    if(!result.items.length)body.append(el('p','还没有待办。可录入真实通知、报修或账单，保留资料来源。','feature-note'));
    for(const item of result.items){
      const card=el('section','','feature-card');card.append(el('strong',item.title),el('p',STATUS[item.status]+' · '+(item.location||'未指定位置')),el('p','期限：'+(item.dueAt||'未设置')),el('p','来源：'+item.source));
      const next={open:'in_progress',in_progress:'resolved',resolved:'closed'}[item.status];
      if(next)card.append(button({in_progress:'开始处理',resolved:'记录处理结果',closed:'核验并关闭'}[next],()=>progress(item,next)));
      const history=el('details');history.append(el('summary','处理记录'));for(const event of item.history)history.append(el('p',STATUS[event.status]+' · '+event.at+(event.note?' · '+event.note:'')));card.append(history);body.append(card);
    }
    if(result.devices.length)body.append(el('h3','设备记录'));
    for(const device of result.devices)body.append(el('p',device.title+' · '+device.location+' · '+({online:'记录为在线',offline:'记录为离线',unknown:'状态未知'}[device.reportedStatus])+' · '+(device.freshness==='stale'?'记录已过期':'近期记录')+' · '+device.observedAt+' · 来源：'+device.source));
  }
  function field(form,label,key,required=true){const row=el('label',label),input=el('input');input.name=key;input.required=required;input.maxLength=key==='source'||key==='note'||key==='receipt'?2000:200;row.append(input);form.append(row);return input;}
  function editor(title,submit){body.replaceChildren();body.append(el('h3',title));const ticket=epoch;const f=el('form');Object.assign(f.style,{display:'grid',gap:'14px'});const controls=el('div','','bt-actions'),save=el('button','保存','soft-button');save.type='submit';controls.append(save,button('返回服务台',render));f.onsubmit=async event=>{event.preventDefault();if(!f.reportValidity()||save.disabled)return;save.disabled=true;try{await submit(Object.fromEntries(new FormData(f)));if(ticket===epoch&&dialog.open&&dialog.isConnected)await render();}catch(error){if(ticket===epoch&&dialog.open)message.textContent=error.message;}finally{save.disabled=false;}};body.append(f);return {f,controls};}
  function form(catalog,device=false){
    const requestId=crypto.randomUUID();const {f,controls}=editor(device?'录入设备观测':'新增服务事项',async data=>{
      if(!data.dueAt)delete data.dueAt;if(!data.location)delete data.location;
      await invoke({...data,action:device?'device':'create',requestId});
    });
    field(f,device?'设备名称':'事项标题','title');field(f,'原始资料来源','source');field(f,'楼栋 / 房间','location',device);
    if(device){field(f,'设备编号','deviceKey');field(f,'观测时间（如 2026-11-12T10:00:00+08:00）','observedAt');const label=el('label','观测状态'),select=el('select');select.name='reportedStatus';for(const [value,name] of [['unknown','未知'],['online','在线'],['offline','离线']]){const option=el('option',name);option.value=value;select.append(option);}label.append(select);f.append(label);}
    else {const label=el('label','服务类型'),select=el('select');select.name='service';for(const service of catalog){const option=el('option',service.name);option.value=service.id;select.append(option);}label.append(select);f.append(label);field(f,'期限（含时区，可留空）','dueAt',false);}
    f.append(controls);
  }
  function progress(item,status){const {f,controls}=editor('更新：'+item.title,data=>invoke({...data,action:'update',id:item.id,status}));field(f,'处理依据 / 核验说明','note');if(item.service==='billing'&&status==='resolved')field(f,'缴费凭据来源','receipt');f.append(controls);}
  return {async open(){selection=structuredClone(getSelection());if(!selection)throw Error('请先选择一个服务会话。');if(!dialog.open)dialog.showModal();try{await render();}catch(error){message.textContent=error.message;}},close,destroy(){close();dialog.remove();}};
}
