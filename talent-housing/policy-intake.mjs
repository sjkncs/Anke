import {createHash} from 'node:crypto';
const categories=new Set(['public_rental','affordable_rental','talent_rental','talent_sale','university','youth_transition','social_affordable']);
const allowed=new Set(['id','question','answer','category','version','effectiveFrom','effectiveTo','sourceIds','owner']);
export function redact(text){return text
 .replace(/(?<!\d)\d{17}[\dXx](?!\d)/g,'[身份证已隐藏]')
 .replace(/(?<!\d)(?:\+?86[- ]?)?1[3-9]\d{9}(?!\d)/g,'[手机号已隐藏]')
 .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[邮箱已隐藏]');}
function date(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
export function prepareIntake(input,catalog){
 if(!input||input.schemaVersion!==1||!Array.isArray(input.records)||!input.records.length||input.records.length>500||Object.keys(input).some(k=>!['schemaVersion','provenance','records'].includes(k)))throw Error('导入格式无效；每批需要1—500条记录');
 const p=input.provenance;
 if(!p||Object.keys(p).some(k=>!['sourceSystem','exportedOn','authorizationReference','useScope'].includes(k))||!['sourceSystem','authorizationReference','useScope'].every(k=>typeof p[k]==='string'&&p[k].trim()&&p[k].length<=300)||!date(p.exportedOn))throw Error('需要来源系统、导出日期、授权依据和使用范围');
 const ids=new Set();const records=[];
 for(const r of input.records){
  if(!r||Object.keys(r).some(k=>!allowed.has(k))||typeof r.id!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(r.id)||ids.has(r.id))throw Error('记录标识无效、重复或包含未知字段');ids.add(r.id);
  if(!['question','answer','version','owner'].every(k=>typeof r[k]==='string'&&r[k].trim()&&r[k].length<=(k==='answer'?12000:500))||!categories.has(r.category))throw Error('问答、版本、住房类型或维护岗位缺失');
  if(!date(r.effectiveFrom)||(r.effectiveTo!==null&&(!date(r.effectiveTo)||r.effectiveTo<r.effectiveFrom)))throw Error('生效与失效日期无效');
  if(!Array.isArray(r.sourceIds)||!r.sourceIds.length||new Set(r.sourceIds).size!==r.sourceIds.length)throw Error('需要对应政策依据');
  const sources=r.sourceIds.map(id=>catalog.documents.find(d=>d.id===id&&d.status==='collected'));
  if(sources.some(d=>!d||d.category!==r.category))throw Error('政策依据不存在或住房类型不一致');
  const sourceChanged=sources.some(d=>d.historicalOnly||d.currentValidity!=='confirmed_current');
  const clean=Object.fromEntries(Object.entries(r).map(([k,v])=>[k,typeof v==='string'?redact(v):v]));
  records.push({...clean,sourceDigests:sources.map(d=>({id:d.id,textSha256:d.textSha256})),reviewStatus:'pending',published:false,privacyStatus:'pattern_redacted_manual_review_required',reviewChecks:['姓名、地址及家庭资料人工脱敏复核','政策依据与答复逐项一致','生效时间与版本核验',...(sourceChanged?['依据效力待业务确认']:[])]});
 }
 const provenance=Object.fromEntries(Object.entries(p).map(([k,v])=>[k,redact(v)]));
 const batchId=createHash('sha256').update(JSON.stringify({provenance,records})).digest('hex').slice(0,20);
 return {schemaVersion:1,batchId,provenance,status:'staged_not_published',internal12345Connection:false,records};
}
