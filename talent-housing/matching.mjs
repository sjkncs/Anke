import {recommend, date, validateUnit} from './core.mjs';

const factors=['education','medical','care','stability','environment'];
const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
export function validateSupply(u){
  validateUnit(u);
  if(u.supply!==undefined){
    if(!u.supply||!['government','university'].includes(u.supply.provider)||typeof u.supply.reference!=='string'||!u.supply.reference.trim()||u.supply.reference.length>500)throw Error('Invalid government or university source');
    date(u.supply.verifiedOn);
  }
  if(u.location!==undefined){
    if(!u.location||!finite(u.location.longitude,113,115)||!finite(u.location.latitude,22,24)||u.location.crs!=='BD09')throw Error('Verified Shenzhen BD09 coordinates required');
  }
  if(u.furnished!==undefined&&u.furnished!==null&&typeof u.furnished!=='boolean')throw Error('Invalid furnishing');
  if(u.setupCost!==undefined&&u.setupCost!==null&&!finite(u.setupCost,0,1000000))throw Error('Invalid setup cost');
  if(u.factors!==undefined){
    if(!u.factors||Object.keys(u.factors).some(k=>!factors.includes(k)))throw Error('Invalid long-term factor');
    for(const f of Object.values(u.factors)){
      if(!f||!finite(f.score,0,100)||typeof f.source!=='string'||!f.source.trim()||f.source.length>500||!['current','planned'].includes(f.status))throw Error('Invalid factor evidence');
      date(f.verifiedOn);
    }
  }
  return u;
}
export function validateProfile(a){
  if(a.profile===undefined)return a;
  const p=a.profile;
  if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Invalid profile');
  if(p.needsFurnished!==undefined&&typeof p.needsFurnished!=='boolean')throw Error('Invalid furnishing requirement');
  if(p.maxSetupCost!==undefined&&!finite(p.maxSetupCost,0,1000000))throw Error('Invalid setup budget');
  if(p.longTermShare!==undefined&&!finite(p.longTermShare,0,1))throw Error('Invalid horizon weight');
  if(p.longTermWeights!==undefined){
    if(!p.longTermWeights||Object.keys(p.longTermWeights).some(k=>!factors.includes(k))||Object.values(p.longTermWeights).some(v=>!finite(v,0,100)))throw Error('Invalid long-term weights');
  }
  if((p.longTermShare??0)>0&&Object.values(p.longTermWeights??{}).reduce((a,b)=>a+b,0)===0)throw Error('Long-term preferences required');
  return a;
}
export function searchHomes(a,units,{query='',sort='balanced',asOf=new Date().toISOString().slice(0,10)}={}){
  validateProfile(a);units.forEach(validateSupply);date(asOf);
  if(typeof query!=='string'||query.length>200||!['balanced','shortTerm','longTerm'].includes(sort))throw Error('Invalid search');
  const tokens=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const pool=units.filter(u=>u.supply&&u.supply.verifiedOn<=asOf&&tokens.every(t=>`${u.id} ${u.project} ${u.type} ${u.supply.reference}`.toLocaleLowerCase().includes(t)));
  const base=recommend(a,pool),profile=a.profile??{},share=profile.longTermShare??0;
  const weights=profile.longTermWeights??{},weight=Object.values(weights).reduce((n,v)=>n+v,0);
  const results=base.results.map(row=>{
    const u=pool.find(u=>u.id===row.unitId),blocked=[...row.blocked],unknown=[...row.unknown],evidence=[],future=[];
    if(profile.needsFurnished){if(u.furnished==null)unknown.push('furnishing');else if(!u.furnished)blocked.push('furnishing_required');}
    if(profile.maxSetupCost!==undefined){if(u.setupCost==null)unknown.push('setup_cost');else if(u.setupCost>profile.maxSetupCost)blocked.push('setup_budget');}
    let sum=0,complete=weight>0;
    for(const [key,w]of Object.entries(weights))if(w>0){
      const f=u.factors?.[key];
      if(!f||f.verifiedOn>asOf){complete=false;continue;}
      if(f.status==='planned'){future.push({factor:key,...f});complete=false;continue;}
      sum+=f.score*w;evidence.push({factor:key,...f});
    }
    const longTerm=complete?Math.round(sum/weight*100)/100:null;
    if(share>0&&longTerm===null)unknown.push('long_term_evidence');
    const state=blocked.length?'excluded':unknown.length?'needs_verification':'matched';
    const score=state==='matched'?Math.round((row.score*(1-share)+(longTerm??0)*share)*100)/100:null;
    return {...row,state,blocked,unknown,score,shortTerm:row.score,longTerm,evidence,future,setupCost:u.setupCost??null,furnished:u.furnished??null,supply:u.supply,location:u.location??null};
  });
  const key=sort==='balanced'?'score':sort;
  const rank={matched:0,needs_verification:1,excluded:2};
  results.sort((x,y)=>rank[x.state]-rank[y.state]||(y[key]??-1)-(x[key]??-1)||x.unitId.localeCompare(y.unitId));
  return {...base,version:'talent-housing-search-v2',scope:'government_and_university',asOf,sort,results};
}
