import {date} from './core.mjs';

export const stages=['submitted','materials_checked','review_pending','reviewed','matching','selection','contract_pending','move_in_pending','completed'];
const text=(value,label,max=200)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(`Invalid ${label}`);};
export function createOrder(input,application){
  text(input.id,'order ID');text(input.subject,'subject');text(input.actor,'actor');date(input.on);
  if(input.on<application.submittedOn)throw Error('Order date precedes application');
  const transcript=input.transcript??'';if(typeof transcript!=='string'||transcript.length>20000)throw Error('Invalid transcript');
  if(transcript)text(input.transcriptSource,'transcript source',500);
  return {id:input.id,applicationId:application.id,subject:input.subject,mode:'local',stage:'submitted',revision:1,transcript,transcriptSource:input.transcriptSource??'',selectedUnitId:null,events:[{stage:'submitted',on:input.on,actor:input.actor,detail:'created'}]};
}
export function advanceOrder(order,input,{application,matches,units}){
  if(input.revision!==order.revision)throw Error('Revision conflict; refresh the work order');
  date(input.on);text(input.actor,'actor');
  if(input.on<order.events.at(-1).on)throw Error('Workflow dates out of order');
  let next=stages[stages.indexOf(order.stage)+1];if(!next)throw Error('Work order already completed');
  if(input.execution==='assistant'&&['reviewed','selection','move_in_pending','completed'].includes(next))throw Error('Operator confirmation required');
  const detail={};
  if(next==='materials_checked'){
    if(!Array.isArray(input.materials)||!input.materials.length||input.materials.length>30)throw Error('Materials checklist required');
    for(const item of input.materials){text(item.name,'material');if(item.status!=='received')throw Error('Materials incomplete');}
    detail.materials=input.materials;
  }
  if(next==='reviewed'){
    if(application.eligibility!=='verified'||input.decision!=='verified')throw Error('Recorded eligibility review required');
    text(input.receipt,'review reference',500);detail.receipt=input.receipt;
  }
  if(next==='matching'){
    const candidates=matches.results.filter(x=>x.state==='matched');
    if(!candidates.length)throw Error('No verified matching supply');
    detail.candidates=candidates.map(r=>({unitId:r.unitId,score:r.score}));
  }
  let selectedUnitId=order.selectedUnitId;
  if(next==='selection'){
    if(!matches.results.some(x=>x.unitId===input.unitId&&x.state==='matched'))throw Error('Selected unit no longer matches');
    selectedUnitId=input.unitId;detail.unitId=input.unitId;
  }
  if(['contract_pending','move_in_pending','completed'].includes(next)){
    if(!units.some(u=>u.id===selectedUnitId&&u.status==='available'))throw Error('Selected supply requires recheck');
  }
  if(next==='move_in_pending'||next==='completed'){
    text(input.receipt,next==='completed'?'handover receipt':'contract reference',500);detail.receipt=input.receipt;
  }
  return {...order,revision:order.revision+1,stage:next,selectedUnitId,events:[...order.events,{stage:next,on:input.on,actor:input.actor,...detail}]};
}
