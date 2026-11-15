const catalog = require('./data/capabilities.json');
function time(value) {
  if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value)))throw Error('Timezone-qualified timestamp required');
  return Date.parse(value);
}
function text(value) { if(typeof value!=='string'||!value.trim()||value.length>300)throw Error('Invalid text');return value.trim(); }
function list(value,max) { if(!Array.isArray(value)||value.length>max)throw Error('Invalid bounded list');return value; }
function provenance(record, cutoff) {
  if(!record||typeof record!=='object'||Array.isArray(record))return 'invalid_record';
  try {
    const url=new URL(record.sourceUrl);
    if(url.protocol!=='https:'||url.username||url.password)return 'invalid_source';
    if(time(record.publishedAt)>cutoff||time(record.observedAt)>cutoff)return 'not_visible_at_cutoff';
  } catch { return 'invalid_provenance'; }
  return null;
}
function labels(value) { return list(value??[],100).map(text); }
function coverage(args) {
  const cutoff=time(args.asOf), required=[...new Set(list(args.required,100).map(text))];
  if(!required.length)throw Error('Required fields cannot be empty');
  const records=list(args.records,500), missing=[],selected=[], excluded=[];
  for(const [index,r] of records.entries()) { const reason=provenance(r,cutoff);if(reason)excluded.push({index,reason}); }
  for(const key of required) {
    const rows=records.filter(r=>r?.key===key&&!provenance(r,cutoff));
    if(!rows.length){missing.push({key,reason:'no_visible_evidence'});continue;}
    const latest=Math.max(...rows.map(r=>time(r.observedAt)));
    const candidates=rows.filter(r=>time(r.observedAt)===latest);
    const unique=new Set(candidates.map(r=>JSON.stringify([r.value,r.revision??null,r.sourceUrl,r.publishedAt])));
    if(unique.size!==1){missing.push({key,reason:'conflicting_revision'});continue;}
    const r=candidates[0];
    if(r.value===null||r.value===undefined||typeof r.value==='number'&&!Number.isFinite(r.value)||typeof r.value==='object') {missing.push({key,reason:'missing_value'});continue;}
    selected.push({key,value:r.value,revision:r.revision??null,sourceUrl:r.sourceUrl,publishedAt:r.publishedAt,observedAt:r.observedAt});
  }
  const mode=args.mode??'strict';if(!['strict','return_available'].includes(mode))throw Error('Invalid coverage mode');
  return {schemaVersion:1,algorithm:'anke.visible-evidence.v1',asOf:args.asOf,mode,status:missing.length?'incomplete':'complete',data:mode==='strict'&&missing.length?[]:selected,missing,excluded,verification:'caller_supplied_evidence_not_independently_verified'};
}
function eventLinks(args) {
  const cutoff=time(args.asOf),events=list(args.events,200),projects=list(args.projects,200),links=[],excluded=[];
  const ids=new Set();for(const p of projects){const id=text(p.id);if(ids.has(id))throw Error('Duplicate project ID');ids.add(id);labels(p.places);labels(p.districts);}
  const eventIds=new Set();
  for(const e of events){const id=text(e.id);if(eventIds.has(id))throw Error('Duplicate event ID');eventIds.add(id);const reason=provenance(e,cutoff);if(reason){excluded.push({id,reason});continue;}
    const places=labels(e.places),districts=labels(e.districts);
    for(const p of projects){const sharedPlaces=labels(p.places).filter(x=>places.includes(x)),sharedDistricts=labels(p.districts).filter(x=>districts.includes(x));
      if(!sharedPlaces.length&&!sharedDistricts.length)continue;
      links.push({eventId:id,projectId:p.id,relation:'candidate_context',basis:sharedPlaces.length?'exact_place':'district_only',matchedLabels:sharedPlaces.length?sharedPlaces:sharedDistricts,sourceUrl:e.sourceUrl,publishedAt:e.publishedAt,observedAt:e.observedAt,rentEffect:null,causality:'not_estimated'});
    }
  }
  return {schemaVersion:1,algorithm:'anke.event-context.v1',asOf:args.asOf,links,excluded,verification:'caller_supplied_evidence_not_independently_verified'};
}
function evaluate(args) {
  if(!args||typeof args!=='object'||Array.isArray(args))throw Error('Invalid request');
  const allowed={capabilities:['action','query'],coverage:['action','asOf','required','records','mode'],event_links:['action','asOf','events','projects']}[args.action];
  if(!allowed||Object.keys(args).some(k=>!allowed.includes(k)))throw Error('Invalid action or field');
  if(args.action==='coverage')return coverage(args);
  if(args.action==='event_links')return eventLinks(args);
  const q=args.query??'';if(typeof q!=='string'||q.length>200)throw Error('Invalid query');
  return {...catalog,verification:'static_contract_only',entries:catalog.entries.filter(x=>`${x.name} ${x.label} ${x.group}`.toLowerCase().includes(q.toLowerCase()))};
}
module.exports={evaluate};
