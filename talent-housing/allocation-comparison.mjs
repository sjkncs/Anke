import {recommend,simulate,validateApplication,validateUnit} from './core.mjs';
// Two transparent counterfactuals. Neither is a formal allocation or an optimal solver.
export function compareAllocation(applications,units){
  applications.forEach(validateApplication);units.forEach(validateUnit);
  const ranked=simulate(applications,units);
  const available=new Set(units.filter(u=>u.status==='available').map(u=>u.id));
  const ordered=[...applications].sort((a,b)=>a.priority-b.priority||a.submittedOn.localeCompare(b.submittedOn)||a.id.localeCompare(b.id));
  const assignments=ordered.map(a=>{const r=recommend(a,units);const feasible=r.results.filter(x=>x.state==='matched'&&available.has(x.unitId)).sort((a,b)=>a.unitId.localeCompare(b.unitId));const chosen=a.eligibility==='verified'?feasible[0]:null;if(chosen)available.delete(chosen.unitId);return {applicationId:a.id,unitId:chosen?.unitId??null,score:chosen?.score??null};});
  function summarize(rows){const chosen=rows.filter(x=>x.unitId);const usable=units.filter(u=>u.status==='available').length;return {assigned:chosen.length,unmatched:rows.length-chosen.length,meanFit:chosen.length?chosen.reduce((s,x)=>s+x.score,0)/chosen.length:null,allocationCoverage:usable?chosen.length/usable:null,occupancyRate:null,turnoverDays:null,reason:'配租覆盖为计算输出；实际入住率与周转天数需要事件和入住记录',assignments:rows};}
  return {mode:'counterfactual_simulation',empiricalOutcome:false,policyOrdering:ranked.ordering,baseline:{rule:'same_priority_order_first_feasible_unit_by_id',...summarize(assignments)},preference:{rule:'same_priority_order_best_self_reported_fit',...summarize(ranked.assignments)},limitations:['房源编号顺序仅为技术基准，不代表现行业务规则','权重由输入提供，未由正式问卷估计','非整数规划全局最优，不含拒选后置或事件队列','不得据此认定政策优越性']};
}
export function universityQuota(demands,totalUnits){
  if(!Number.isInteger(totalUnits)||totalUnits<0||!Array.isArray(demands)||!demands.length||demands.some(d=>typeof d.university!=='string'||!d.university.trim()||!Number.isInteger(d.eligibleDemand)||d.eligibleDemand<0)||new Set(demands.map(d=>d.university)).size!==demands.length)throw Error('Invalid quota inputs');
  const total=demands.reduce((s,d)=>s+d.eligibleDemand,0),supply=Math.min(total,totalUnits);
  const rows=demands.map(d=>({...d,exact:total?supply*d.eligibleDemand/total:0,quota:total?Math.floor(supply*d.eligibleDemand/total):0}));
  let remain=supply-rows.reduce((s,d)=>s+d.quota,0);
  for(const r of [...rows].sort((a,b)=>(b.exact-b.quota)-(a.exact-a.quota)||a.university.localeCompare(b.university)))if(remain>0&&r.quota<r.eligibleDemand){r.quota++;remain--;}
  return {mode:'scenario_only',method:'largest_remainder_proportional_to_confirmed_demand',allocations:rows.map(({exact,...r})=>r),unallocated:totalUnits-supply,eligibilityCheckedUpstream:true,unitTypeCompatibilityChecked:false,policyDecision:false};
}
