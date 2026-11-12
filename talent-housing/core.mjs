export const VERSION = 'talent-housing-v1';
const dimensions = ['commute', 'cost', 'space', 'quality'];
export function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value) throw Error('Invalid date');
  return value;
}
function number(value, min, max, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw Error(`Invalid ${field}`);
}
function text(value, field) { if (typeof value !== 'string' || !value.trim() || value.length > 200) throw Error(`Invalid ${field}`); }
export function validateApplication(a) {
  text(a.id,'application ID'); text(a.label,'anonymous label'); text(a.ruleVersion,'rule version'); date(a.submittedOn);
  if (!['pending','verified','ineligible'].includes(a.eligibility)) throw Error('Invalid eligibility');
  number(a.priority,0,100000,'policy priority');
  if (!Number.isInteger(a.priority)) throw Error('Invalid policy priority');
  if (!Array.isArray(a.allowedTypes) || !a.allowedTypes.length) throw Error('Missing allowed housing types');
  a.allowedTypes.forEach(x=>text(x,'housing type'));
  for (const [k,min,max] of [['maxCost',1,1000000],['maxCommute',1,600],['minBedrooms',0,20]]) number(a[k],min,max,k);
  if (!Number.isInteger(a.minBedrooms) || typeof a.needsElevator !== 'boolean') throw Error('Invalid household requirements');
  date(a.latestMoveIn);
  if (!a.weights || dimensions.some(k=>!(k in a.weights)) || Object.keys(a.weights).some(k=>!dimensions.includes(k))) throw Error('Invalid weights');
  dimensions.forEach(k=>number(a.weights[k],0,100,'weight'));
  if (Object.values(a.weights).reduce((x,y)=>x+y,0)<=0) throw Error('Empty weights');
  if (!a.workflow || !Array.isArray(a.workflow.events)) throw Error('Missing workflow');
  if (a.workflow.events.length>100) throw Error('Too many workflow events');
  let previous = a.submittedOn;
  for(const e of a.workflow.events){ date(e.on); text(e.stage,'stage'); if(e.on<previous)throw Error('Workflow dates out of order'); previous=e.on; }
  return a;
}
export function validateUnit(u) {
  text(u.id,'unit ID'); text(u.project,'project'); text(u.type,'type'); text(u.source,'source');
  if (!['available','repair','reserved','occupied'].includes(u.status)) throw Error('Invalid unit status');
  for(const [k,min,max] of [['rent',0,1000000],['fees',0,1000000],['bedrooms',0,20],['quality',0,100]]) if(u[k]!==null)number(u[k],min,max,k);
  if(u.bedrooms!==null && !Number.isInteger(u.bedrooms))throw Error('Invalid bedrooms');
  if(u.elevator!==null && typeof u.elevator!=='boolean') throw Error('Invalid elevator');
  if(u.availableOn!==null)date(u.availableOn);
  if(!u.commute || typeof u.commute!=='object'||Array.isArray(u.commute))throw Error('Invalid commute');
  for(const v of Object.values(u.commute)) if(v!==null)number(v,0,600,'commute');
  return u;
}
export function recommend(application, units) {
  const a=validateApplication(application); units.forEach(validateUnit);
  const results=units.map(u=>{
    const blocked=[],unknown=[];
    const known=(value,label)=>{if(value===null || value===undefined){unknown.push(label);return false;} return true;};
    if(u.status!=='available')blocked.push('unit_not_available');
    if(!a.allowedTypes.includes(u.type))blocked.push('housing_type');
    const cost=u.rent===null||u.fees===null?null:u.rent+u.fees;
    const commute=u.commute[a.id];
    if(known(cost,'total_cost') && cost>a.maxCost)blocked.push('cost_limit');
    if(known(commute,'commute') && commute>a.maxCommute)blocked.push('commute_limit');
    if(known(u.bedrooms,'bedrooms') && u.bedrooms<a.minBedrooms)blocked.push('bedroom_limit');
    if(known(u.availableOn,'available_date') && u.availableOn>a.latestMoveIn)blocked.push('move_in_limit');
    if(a.needsElevator && known(u.elevator,'elevator') && !u.elevator)blocked.push('elevator_required');
    if(a.weights.quality>0)known(u.quality,'quality');
    const scores={commute:commute==null?null:Math.max(0,100*(1-commute/a.maxCommute)),cost:cost===null?null:Math.max(0,100*(1-cost/a.maxCost)),space:u.bedrooms===null?null:Math.min(100,60+20*(u.bedrooms-a.minBedrooms)),quality:u.quality};
    const state=blocked.length?'excluded':unknown.length?'needs_verification':'matched';
    const weight=Object.values(a.weights).reduce((x,y)=>x+y,0);
    const score=state==='matched'?Math.round(dimensions.reduce((sum,k)=>sum+(a.weights[k]===0?0:scores[k]*a.weights[k]),0)/weight*100)/100:null;
    return {unitId:u.id,project:u.project,state,blocked,unknown,score,scores,totalCost:cost,commute:commute??null,source:u.source,education:u.education??'unverified'};
  });
  results.sort((x,y)=>(y.score??-1)-(x.score??-1)||x.unitId.localeCompare(y.unitId,'en'));
  return {version:VERSION,applicationId:a.id,eligibility:a.eligibility,canAllocate:a.eligibility==='verified',results};
}
export function simulate(applications,units) {
  applications.forEach(validateApplication); units.forEach(validateUnit);
  if(new Set(applications.map(x=>x.id)).size!==applications.length || new Set(units.map(x=>x.id)).size!==units.length)throw Error('Duplicate IDs');
  const available=new Set(units.filter(u=>u.status==='available').map(u=>u.id));
  const assignments=[];
  const sorted=[...applications].sort((a,b)=>a.priority-b.priority||a.submittedOn.localeCompare(b.submittedOn)||a.id.localeCompare(b.id,'en'));
  for(const a of sorted){
    const r=recommend(a,units); const feasible=r.results.filter(x=>x.state==='matched');
    const chosen=a.eligibility==='verified'?feasible.find(x=>available.has(x.unitId)):null;
    if(chosen)available.delete(chosen.unitId);
    assignments.push({applicationId:a.id,unitId:chosen?.unitId??null,score:chosen?.score??null,reason:chosen?'matched':a.eligibility!=='verified'?'eligibility_not_verified':feasible.length?'preferred_units_taken':'no_verified_match'});
  }
  return {version:VERSION,mode:'simulation',ordering:'priority_ascending,submitted_on_ascending,id_ascending',assignments,unassignedUnitIds:[...available]};
}
export function progress(a,asOf) {
  validateApplication(a); date(asOf);
  const last=a.workflow.events.at(-1)??{stage:'submitted',on:a.submittedOn};
  if(asOf<last.on || asOf<a.submittedOn)throw Error('As-of date precedes events');
  const days=from=>Math.round((Date.parse(asOf)-Date.parse(from))/86400000);
  return {applicationId:a.id,eligibility:a.eligibility,stage:last.stage,totalElapsedDays:days(a.submittedOn),stageElapsedDays:days(last.on),ruleVersion:a.ruleVersion};
}
