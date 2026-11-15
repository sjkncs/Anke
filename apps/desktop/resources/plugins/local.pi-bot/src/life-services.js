'use strict';
const {StateEdit}=require('./state-edit');
const {randomUUID}=require('node:crypto');
const TOPICS=['科技','教育','文化','体育','生活','国际'];
const DEFAULTS={enabled:false,topics:['科技','文化'],remember:false,lowStimulus:false,dailyLimit:6,quietStart:'22:00',quietEnd:'07:00',priority:'ask',care:false,morning:'07:30',noon:'12:00',evening:'18:00',breakfast:false,coffee:false,taxi:false,tutoring:false};
const clocks=['quietStart','quietEnd','morning','noon','evening'];
function validate(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!Object.hasOwn(DEFAULTS,k)))throw Error('无效的生活服务设置。');
 const p={...DEFAULTS,...value};
 for(const key of ['enabled','remember','lowStimulus','care','breakfast','coffee','taxi','tutoring'])if(typeof p[key]!=='boolean')throw Error('无效的开关。');
 if(!Array.isArray(p.topics)||!p.topics.length||p.topics.length>6||new Set(p.topics).size!==p.topics.length||p.topics.some(t=>!TOPICS.includes(t)))throw Error('请选择有效的新闻板块。');
 for(const k of clocks)if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(p[k]))throw Error('请输入有效时间。');
 if(!Number.isInteger(p.dailyLimit)||p.dailyLimit<1||p.dailyLimit>20||!['ask','foreground','care'].includes(p.priority))throw Error('无效的频次或优先级。');
 return p;
}
function prefs(team){return {...DEFAULTS,...team.state.prefs?.lifeServices};}
function ensureLifeServices(state){
 if(state.ankeLifeServicesVersion>=1)return false;
 for(const [key,name,rule] of [['for-you','猜您想看','Use current Tencent news through the configured connector or local feed. Respect explicitly selected sections and low-stimulation preference. Never infer mental health from other services; preserve important housing, policy, health and account notices.'],['care','日常关怀','Offer encouragement and optional breakfast, coffee or commute help. Confirm product, price, time, address and user consent before external ordering. Use education service for voice tutoring, feedback and parent-signature reminders; never sign for a parent. Resume uncertain external actions only after checking receipts, never blindly replay.']]){
  let bot=state.bots.find(b=>b.ankeServicePreset===key);
  if(!bot){bot={id:randomUUID(),name,role:'Worker',roleLabel:'服务成员',instructions:'Respond in Chinese. '+rule,modelKey:'',workDir:'',agentMode:'planner',memory:'',sessions:{},capabilities:[],avatar:{shape:'anke-house'},color:'gray',ankeServicePreset:key};state.bots.push(bot);}
  if(Array.isArray(state.prefs?.serviceShortcuts)&&!state.prefs.serviceShortcuts.some(s=>s.id===bot.id))state.prefs.serviceShortcuts.push({kind:'bot',id:bot.id,group:'living'});
 }
 state.ankeLifeServicesVersion=1;return true;
}
function localClock(now){const f=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(now));return {date:f.slice(0,10),time:f.slice(11,16)};}
function quiet(p,time){return p.quietStart===p.quietEnd?false:p.quietStart<p.quietEnd?time>=p.quietStart&&time<p.quietEnd:time>=p.quietStart||time<p.quietEnd;}
function rank(items,p,history={},now=Date.now()){
 const seen=new Set(),result=[];
 for(const item of items){
  if(!item||typeof item.title!=='string'||!item.title.trim()||typeof item.url!=='string')continue;
  let u;try{u=new URL(item.url);}catch{continue;}
  if(u.protocol!=='https:'||u.username||u.password||u.port||!['news.qq.com','new.qq.com','view.inews.qq.com'].includes(u.hostname))continue;
  const text=item.title+' '+(item.abstract||'');if(/住房|租金|配租|公租房|人才房|住房政策/.test(text)||seen.has(item.url))continue;
  if(!p.topics.includes(item.topic))continue;seen.add(item.url);
  const stamp=Date.parse(item.publishedAt),age=Number.isFinite(stamp)?Math.max(0,now-stamp)/3600000:168;
  const stimulus=/惨|血腥|暴力|惊悚|恐怖/.test(text)?1:0;
  result.push({...item,title:item.title.slice(0,300),abstract:String(item.abstract||'').slice(0,1200),score:(p.remember?Math.min(3,history[item.topic]||0)*.2:0)+1/(1+age/24)-(p.lowStimulus?stimulus*2:0),reason:p.lowStimulus&&stimulus?'低刺激偏好降低排序':'所选板块 · 时效与来源',confidence:null});
 }
 result.sort((a,b)=>b.score-a.score||a.url.localeCompare(b.url));
 const diverse=[],counts={};for(const r of result){const n=counts[r.topic]||0;r.score-=n*.15;counts[r.topic]=n+1;diverse.push(r);}return diverse.sort((a,b)=>b.score-a.score).slice(0,p.dailyLimit);
}
const gates=new WeakMap();
async function edit(team,mutate){const e=new StateEdit();try{await team.save(()=>e.rollback(),()=>mutate(e));}catch(err){e.rollback();throw err;}}
async function operation(team,input={},options={}){
 const previous=gates.get(team)||Promise.resolve(),next=previous.catch(()=>{}).then(()=>perform(team,input,options));gates.set(team,next);return next;
}
async function perform(team,input,options){
 const now=options.now??Date.now(),p=prefs(team),life=team.state.ankeLife||{history:{},offers:[],news:[],lastRefresh:0},clock=localClock(now);
 if(input.action==='status')return {config:p,topics:TOPICS,offers:life.offers,news:rank(life.news,p,life.history,now),lastRefresh:life.lastRefresh,source:'腾讯新闻',timezone:'Asia/Shanghai'};
 if(input.action==='configure'){
  const config=validate(input.config);await edit(team,e=>{if(!team.state.prefs)e.set(team.state,'prefs',{});e.set(team.state.prefs,'lifeServices',config);if(!config.remember)e.set(team.state,'ankeLife',{...life,history:{}});});return {config};
 }
 if(input.action==='clearHistory'){await edit(team,e=>e.set(team.state,'ankeLife',{...life,history:{}}));return {cleared:true};}
 if(input.action==='feedback'){
  if(!p.remember)return {recorded:false};if(!TOPICS.includes(input.topic)||!['more','less'].includes(input.value))throw Error('无效的偏好反馈。');
  await edit(team,e=>e.set(team.state,'ankeLife',{...life,history:{...life.history,[input.topic]:Math.max(-3,Math.min(3,(life.history[input.topic]||0)+(input.value==='more'?1:-1)))}}));return {recorded:true};
 }
 if(input.action==='refresh'){
  if(!p.enabled)throw Error('请先开启猜您想看。');if(now-life.lastRefresh<60000)return {news:rank(life.news,p,life.history,now),cached:true};
  const load=options.loadNews||require('./life-news').loadNews;const news=await load(p.topics);if(!Array.isArray(news))throw Error('资讯源格式无效。');
  await edit(team,e=>e.set(team.state,'ankeLife',{...life,news:news.slice(0,100),lastRefresh:now}));return {news:rank(news,p,life.history,now),cached:false};
 }
 if(input.action==='poll'){
  if(!p.care||quiet(p,clock.time))return {offers:[],quiet:true};
  const active=team.state.jobs?.some(j=>['queued','launching','running','waiting'].includes(j.status));
  const slots=[['morning','早上好，新的一天慢慢开始。',p.breakfast?'需要为您准备一份麦麦早餐吗？':''],['noon','中午好，忙完也记得休息。',p.coffee?'需要为您准备一杯咖啡吗？':''],['evening','今天辛苦了。',p.taxi?'需要整理下班或出差的打车安排吗？':'']];
  const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
  const candidates=slots.filter(([slot])=>clock.time>=p[slot]&&minutes(clock.time)-minutes(p[slot])<=15&&!life.offers.some(o=>o.id===clock.date+':'+slot));
  if(active&&p.priority==='foreground')return {offers:[],deferred:true};
  const offers=candidates.map(([slot,text,offer])=>({id:clock.date+':'+slot,slot,text:text+offer,at:new Date(now).toISOString(),status:active&&p.priority==='ask'?'priority_required':'pending',service:slot==='evening'?'itinerary':'food'}));
  if(offers.length)await edit(team,e=>e.set(team.state,'ankeLife',{...life,offers:[...life.offers,...offers].slice(-60)}));return {offers};
 }
 if(input.action==='resolve'){
  if(!['continue','later','dismiss'].includes(input.choice))throw Error('请选择处理方式。');const old=life.offers.find(o=>o.id===input.id);if(!old)throw Error('提醒已不存在。');
  if(!['pending','priority_required','deferred'].includes(old.status))return {offer:old};
  const offer={...old,status:input.choice==='continue'?'draft':input.choice==='later'?'deferred':'dismissed'};
  await edit(team,e=>e.set(team.state,'ankeLife',{...life,offers:life.offers.map(o=>o.id===old.id?offer:o)}));return {offer,externalAction:false};
 }
 throw Error('未知生活服务操作。');
}
module.exports={DEFAULTS,TOPICS,validate,rank,quiet,localClock,ensureLifeServices,operation};
