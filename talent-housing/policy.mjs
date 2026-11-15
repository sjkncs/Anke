import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {plainAnswer} from './policy-answers.mjs';
const sourceFile=new URL('./policy-data/sources.json',import.meta.url);
const categories=['all','public_rental','affordable_rental','talent_rental','talent_sale','university','youth_transition','social_affordable'];
const synonyms=[['优才卡','人才卡','人才住房','高层次人才'],['公租房','公共租赁住房'],['保租房','保障性租赁住房'],['补贴','租房补助'],['申请','认租','资格'],['退租','退出','腾退'],['租金','费用','价格']];
function day(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)throw Error('Invalid policy date');return value;}
function terms(q){const words=new Set(q.match(/[a-z0-9]+/gi)||[]);for(const group of synonyms)if(group.some(w=>q.includes(w)))group.forEach(w=>words.add(w));const cn=q.match(/[\u4e00-\u9fff]+/g)||[];for(const s of cn)for(let i=0;i<s.length-1;i++)words.add(s.slice(i,i+2));return [...words];}
export function buildPolicyIndex(raw){
  const chunks=[];const documents=[];
  for(const source of raw.documents??[]){
    const {text,...meta}=source;documents.push(meta);
    if(source.status!=='collected'||source.kind==='index'||!text)continue;
    if(createHash('sha256').update(text).digest('hex')!==source.textSha256)throw Error('Policy text hash mismatch');
    const lines=text.split(/\n+/).map(x=>x.trim()).filter(Boolean);let section=source.title;let buffer='';let ordinal=0;
    const flush=()=>{if(!buffer)return;ordinal++;if(!source.scopeSections||source.scopeSections.includes(section))chunks.push({...meta,id:source.id+':'+ordinal,sourceId:source.id,section,text:buffer});buffer='';};
    for(const line of lines){const heading=/^(第[一二三四五六七八九十百零]+条|[一二三四五六七八九十]+、)/.test(line);if(heading){flush();section=line.length<80?line:line.slice(0,60);}if(buffer.length+line.length>900)flush();buffer+=(buffer?'\n':'')+line;}
    flush();
  }
  return {documents,chunks,internal12345:raw.internal12345,version:raw.version};
}
export function retrieve(index,input){
  const allowed=['action','query','category','asOf','includeHistorical','limit','batchId'];
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!allowed.includes(k)))throw Error('Invalid policy request');
  if(!['policy_search','policy_answer','policy_coverage','policy_route'].includes(input.action))throw Error('Unknown policy action');
  const category=input.category??'all';if(!categories.includes(category))throw Error('Invalid housing category');
  const asOf=day(input.asOf??new Date().toISOString().slice(0,10));
  if(input.includeHistorical!==undefined&&typeof input.includeHistorical!=='boolean')throw Error('Invalid historical switch');
  const limit=input.limit??5;if(!Number.isInteger(limit)||limit<1||limit>10)throw Error('Invalid policy limit');
  if(input.batchId!==undefined&&(typeof input.batchId!=='string'||!index.documents.some(d=>d.id===input.batchId)))throw Error('Unknown policy batch');
  if(input.action==='policy_coverage')return {version:index.version,documents:index.documents,chunks:index.chunks.length,internal12345:index.internal12345,semanticEmbeddings:'not_loaded',modelDistillation:'not_performed',departmentReview:'pending'};
  if(typeof input.query!=='string'||!input.query.trim()||input.query.length>500)throw Error('Policy query must contain 1-500 characters');
  const query=input.query.trim();
  if(input.action==='policy_route'){
    const routes=[];
    if(/申请|资格|政策|优才|续租|退租|租金/.test(query))routes.push({tool:'anke_official_policy',action:'policy_answer',purpose:'查询官方依据'});
    if(/推荐|匹配|选房|房源/.test(query))routes.push({tool:'talent_housing',action:'search_homes',required:['applicationId'],purpose:'按已核验资格和本人条件检索真实房源'});
    if(/测算|价差|合理|调租/.test(query))routes.push({tool:'ShenzhenRents',purpose:'调用结构化租金数据与测算工具',required:['priceBasis','observedOn','area','qualityControls']});
    const human=/担保|豁免|申诉|投诉|审批|签约|提交|学校证明|证明.*替代|替代.*证明/.test(query);
    return {routes:human?[...routes,{purpose:'业务人员确认资格例外或办理事项',action:'human_review'}]:routes,requiresHuman:human,executesWrites:false,reason:routes.length?'按问题类型调用最少必要工具':'请补充住房类型和办理问题'};
  }
  const tokens=terms(query),eligible=index.chunks.filter(c=>
    (category==='all'||c.category===category)&&(!input.batchId||c.sourceId===input.batchId)&&(!c.publishedOn||c.publishedOn<=asOf)&&(!c.effectiveFrom||c.effectiveFrom<=asOf)&&
    (input.includeHistorical||!c.historicalOnly)&&
    (input.includeHistorical||!c.applicationEndsOn||c.applicationEndsOn>=asOf));
  const scored=eligible.map(c=>{const hay=c.title+' '+c.section+' '+c.text;let relevance=tokens.reduce((n,t)=>n+(hay.includes(t)?Math.min(t.length,6):0),0);if(hay.includes(query))relevance+=20;return {c,relevance};}).filter(x=>x.relevance>=4).sort((a,b)=>b.relevance-a.relevance||(b.c.publishedOn??'').localeCompare(a.c.publishedOn??'')||a.c.id.localeCompare(b.c.id));
  const plain=input.action==='policy_answer'?plainAnswer(index,{query,category,asOf,batchId:input.batchId,limit}):null;
  const selected=plain?plain.refs.map(c=>({c,relevance:null})):scored.slice(0,limit);
  const candidates=selected.map(({c,relevance})=>({chunkId:c.id,sourceId:c.sourceId,title:c.title,url:c.url,section:c.section,excerpt:c.text,category:c.category,publishedOn:c.publishedOn,applicationEndsOn:c.applicationEndsOn,historicalOnly:!!c.historicalOnly,historicalBatch:!!c.applicationEndsOn&&c.applicationEndsOn<asOf,sha256:c.sha256,currentValidity:c.currentValidity,retrievalScore:relevance}));
  const notices=[];if(category==='all')notices.push('请确认住房类型；不同制度和批次的条件不能合并使用。');
  if(candidates.some(c=>c.historicalBatch))notices.push('以下批次认租期已结束，仅用于历史查询。');
  if(candidates.some(c=>c.historicalOnly))notices.push('包含旧制度施行期间的问答，仅供历史查阅，不能直接作为当前办理依据。');
  const missingReview=candidates.length>0;
  if(missingReview)notices.push('原文已采集；现行有效性及适用范围待业务部门复核。');
  const requiresHuman=!candidates.length||category==='all'||/担保|豁免|申诉|审批|学校证明|替代|我.*符合|能否申请/.test(query);
  const result={query,category,asOf,citations:candidates,notices,requiresHuman,confidence:null,confidenceReason:'检索分值不是答案正确率，尚无标注集校准',closedBatchesExcluded:!input.includeHistorical,answerMode:'source_extracts',currentEligibilityDecision:false};
  if(plain){const {refs,...card}=plain;result.plainLanguage=card;result.answerMode='sourced_editorial_draft';}
  if(input.action==='policy_answer')result.answer=candidates.length?candidates.map((c,i)=>`[${i+1}] ${c.title}\n${c.excerpt}`).join('\n\n'):'现有公开资料不足以回答此问题，请补充住房类型、批次或转业务人员核实。';
  return result;
}
export async function policy(input){const raw=JSON.parse(await readFile(sourceFile,'utf8'));return retrieve(buildPolicyIndex(raw),input);}
