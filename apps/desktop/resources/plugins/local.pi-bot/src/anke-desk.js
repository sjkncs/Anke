'use strict';
const {randomUUID}=require('node:crypto');
const {StateEdit}=require('./state-edit');
const {serviceStatus}=require('./anke-services');
const STATES=['open','in_progress','resolved','closed'];
function text(value,label,max=200,optional=false){if(optional&&value===undefined)return '';if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('Invalid '+label);return value.trim();}
function timestamp(value,optional=false){if(optional&&(value===undefined||value===''))return '';if(typeof value!=='string'||!/(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))throw Error('Use a valid timestamp with an explicit time zone.');return value;}
function scope(owner){return owner.room?'room:'+owner.room.id:'bot:'+owner.bot.id;}
function validateDesk(state){
  const desk=state.ankeDesk;if(desk===undefined)return;
  if(desk?.version!==1||!Array.isArray(desk.items)||!Array.isArray(desk.devices)||desk.items.length>3000||desk.devices.length>1000)throw Error('Invalid ANKE service ledger.');
  const ids=new Set();
  for(const item of [...desk.items,...desk.devices]){text(item.id,'record id');if(ids.has(item.id))throw Error('Duplicate service record.');ids.add(item.id);if(typeof item.scope!=='string'||! /^(bot|room):.+/.test(item.scope))throw Error('Invalid service scope.');text(item.title,'title');text(item.source,'source',2000);timestamp(item.updatedAt);}
  for(const item of desk.items){serviceStatus(text(item.service,'service'));if(!STATES.includes(item.status)||!Array.isArray(item.history)||item.history.length>1000)throw Error('Invalid service status or history.');timestamp(item.dueAt,true);if(item.service==='billing'&&['resolved','closed'].includes(item.status))text(item.receipt,'receipt',2000);}
  for(const device of desk.devices){text(device.deviceKey,'device key');text(device.location,'location');timestamp(device.observedAt);if(!['online','offline','unknown'].includes(device.reportedStatus))throw Error('Invalid device status.');}
}
function visible(team,owner){validateDesk(team.state);const desk=team.state.ankeDesk||{version:1,items:[],devices:[]};return {items:desk.items.filter(i=>i.scope===scope(owner)),devices:desk.devices.filter(i=>i.scope===scope(owner))};}
async function editDesk(team,owner,change){
  if(team.stopped||team.storeConflict)throw Error('Service desk is unavailable.');
  let result;const edit=new StateEdit();await team.save(()=>edit.rollback(),()=>{
    if(team.stopped||team.storeConflict)throw Error('Service desk is unavailable.');
    try{const next=structuredClone(team.state.ankeDesk||{version:1,items:[],devices:[]});result=change(next,scope(owner));validateDesk({ankeDesk:next});edit.set(team.state,'ankeDesk',next);}
    catch(error){edit.rollback();throw error;}
  });return result;
}
async function operateDesk(team,input,owner){
  const now=new Date().toISOString();
  if(input.action==='list')return visible(team,owner);
  if(input.action==='create'){
    const title=text(input.title,'title'),source=text(input.source,'source',2000),service=text(input.service,'service');serviceStatus(service);
    const requestId=text(input.requestId,'request id'),dueAt=timestamp(input.dueAt,true),detail=text(input.detail,'detail',4000,true),location=text(input.location,'location',200,true);
    return editDesk(team,owner,(desk,key)=>{
      const prior=desk.items.find(i=>i.scope===key&&i.requestId===requestId);
      if(prior){if(JSON.stringify([prior.title,prior.source,prior.service,prior.dueAt,prior.detail,prior.location])!==JSON.stringify([title,source,service,dueAt,detail,location]))throw Error('Request ID already has different content.');return {record:prior,duplicate:true};}
      const record={id:randomUUID(),scope:key,requestId,title,source,service,dueAt,detail,location,status:'open',updatedAt:now,history:[{status:'open',at:now}],externalStatus:'not_submitted'};desk.items.push(record);return {record,duplicate:false};
    });
  }
  if(input.action==='update')return editDesk(team,owner,(desk,key)=>{
    const record=desk.items.find(i=>i.id===input.id&&i.scope===key);if(!record)throw Error('Record not found in this conversation.');
    if(input.status===record.status)return {record,duplicate:true};
    const allowed={open:['in_progress'],in_progress:['resolved','open'],resolved:['closed','in_progress'],closed:[]};
    if(!allowed[record.status].includes(input.status))throw Error('Invalid workflow transition.');
    const note=text(input.note,'progress evidence',2000);
    if(record.service==='billing'&&['resolved','closed'].includes(input.status))record.receipt=text(input.receipt||record.receipt,'payment receipt source',2000);
    record.status=input.status;record.updatedAt=now;record.history.push({status:input.status,note,at:now});return {record};
  });
  if(input.action==='device')return editDesk(team,owner,(desk,key)=>{
    const deviceKey=text(input.deviceKey,'device key'),observedAt=timestamp(input.observedAt),title=text(input.title,'title'),source=text(input.source,'source',2000),location=text(input.location,'location');
    if(Date.parse(observedAt)>Date.parse(now)+60000)throw Error('Device observation cannot be in the future.');
    if(!['online','offline','unknown'].includes(input.reportedStatus))throw Error('Invalid device status.');
    let device=desk.devices.find(d=>d.scope===key&&d.deviceKey===deviceKey);
    if(device&&Date.parse(observedAt)<Date.parse(device.observedAt))throw Error('Older observations cannot replace newer device state.');
    const update={title,source,location,observedAt,reportedStatus:input.reportedStatus,updatedAt:now,connection:'manual_record'};
    if(device)Object.assign(device,update);else {device={id:randomUUID(),scope:key,deviceKey,...update};desk.devices.push(device);}return {device};
  });
  throw Error('Unknown service desk action.');
}
function deskDashboard(team,owner,now=Date.now()){
  const {items,devices}=visible(team,owner),active=items.filter(i=>i.status!=='closed');
  active.sort((a,b)=>(a.dueAt?Date.parse(a.dueAt):Infinity)-(b.dueAt?Date.parse(b.dueAt):Infinity)||a.updatedAt.localeCompare(b.updatedAt));
  const overdue=active.filter(i=>i.status!=='resolved'&&i.dueAt&&Date.parse(i.dueAt)<now).length;
  return {total:items.length,active:active.length,overdue,items:active,devices:devices.map(d=>({...d,freshness:now-Date.parse(d.observedAt)>15*60000?'stale':'recent'})),externalConnections:'not_connected'};
}
function dashboardView(result){
  const labels={open:'待处理',in_progress:'处理中',resolved:'已处理待核验',closed:'已关闭'};
  return {type:'stack',children:[{type:'text',text:'本会话服务台 · 本地记录；设备状态为人工录入，尚未连接外部系统。'},{type:'metric',label:'待办 / 逾期',value:result.active+' / '+result.overdue},{type:'table',columns:[{key:'title',label:'事项'},{key:'status',label:'进度'},{key:'due',label:'期限'},{key:'source',label:'资料来源'}],rows:result.items.slice(0,8).map(i=>[i.title.slice(0,60),labels[i.status],i.dueAt||'未设置',i.source.slice(0,120)])},{type:'text',text:'设备 '+result.devices.length+' 台；其中 '+result.devices.filter(d=>d.freshness==='stale').length+' 台记录超过 15 分钟。显示前 8 条事项；完整记录可通过服务台查询。'}]};
}
async function panelDesk(team,input){
  const selection=input.selection;
  const owner=selection?.kind==='room'?{room:team.room(selection.id),bot:team.bot(team.room(selection.id).adminId||team.room(selection.id).members[0])}:selection?.kind==='bot'?{bot:team.bot(selection.id)}:null;
  if(!owner?.bot)throw Error('请先选择一个服务会话。');
  if(input.action==='dashboard')return {...deskDashboard(team,owner),catalog:serviceStatus().services};
  return operateDesk(team,input,owner);
}
module.exports={operateDesk,validateDesk,deskDashboard,dashboardView,panelDesk};
