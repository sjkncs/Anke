import {districts,validateGeoJSON} from './model.mjs';
import {createMap} from './map.mjs';
import {installDashboard} from './dashboard.mjs';
import {parseOBJ} from './obj.mjs';
import {renderRentBands} from './rent-colors.mjs';
const dashboard=installDashboard();
const $=id=>document.getElementById(id),node=(tag,text)=>{const el=document.createElement(tag);if(text!=null)el.textContent=text;return el;};
const token=document.querySelector('meta[name=anke-service-token]')?.content;
let data,revision=0,mode='map',map,customMap=false,modelName='';
function selectView(value){mode=value;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===mode));$('mapTitle').textContent=mode==='model'?'SU 模型':mode==='map'?'深圳平面':'建筑 3D';$('selection').textContent=mode==='model'?modelName||'选择 OBJ 模型':'深圳';map?.setMode(mode);$('mapEmpty').hidden=mode==='model'?Boolean(modelName):customMap;$('importMap').hidden=mode==='model';$('mapEmpty').querySelector('strong').textContent=mode==='model'?'导入 SU 模型':'深圳，住有所向';$('mapEmpty').querySelector('span').textContent=mode==='model'?'选择 SketchUp 导出的 OBJ 文件':'接入街区与建筑图层，展开住房全景';}
let modelImport=0;
$('modelFile').onchange=async event=>{
 const file=event.target.files[0],current=++modelImport;if(!file)return;
 try{
  if(!map)throw Error('空间视图加载失败');if(file.size>20000000)throw Error('OBJ 文件过大');
  const model=parseOBJ(await file.text());if(current!==modelImport)return;
  model.name=model.name||file.name;model.up=$('modelUp').value;
  map.setModel(model);modelName=file.name;mode='model';$('mapEmpty').hidden=true;
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===mode));
  $('mapTitle').textContent='SU 模型';$('selection').textContent=file.name;
  $('modelInfo').textContent=model.faces.toLocaleString()+' 三角面';$('modelInfo').title=model.objects.map((name,i)=>(i+1)+'. '+name).join('\n');$('status').textContent='';
 }catch(e){if(current===modelImport)$('status').textContent=e.message;}
};
$('modelStyle').onchange=e=>map?.setStyle(e.target.value);
const objectStyle=node('option','对象分色');objectStyle.value='objects';$('modelStyle').append(objectStyle);
$('modelEdges').onchange=e=>map?.setEdges(e.target.checked);
$('modelUp').onchange=e=>map?.setUp(e.target.value);
document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>map?.setView(b.dataset.camera));
try{map=createMap($('mapCanvas'),item=>{$('selection').textContent=item.name+(item.height?' · '+item.height+' m':'');});}catch(e){console.error(e);$('status').textContent='空间视图加载失败';}
for(const d of districts){const o=node('option',d);o.value=d;$('district').append(o);}
const filters=()=>({district:$('district').value,category:$('category').value,query:$('search').value.trim()});
async function api(action,extra={}){const r=await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json','X-Anke-Token':token},body:JSON.stringify({action,...extra})});const value=await r.json();if(!r.ok)throw Error(value.error||'加载失败');return value;}
const states={active:'生效中',upcoming:'即将生效',expired:'已结束',date_unconfirmed:'已发布'};
function empty(el,text){el.replaceChildren(node('div',text));el.firstChild.className='empty';}
function row(el,label,value){const r=node('div');r.className='statrow';r.append(node('span',label),node('strong',value??'—'));el.append(r);}
function render(){
 dashboard.render(data.events);
 const m=data.metrics;$('metrics').replaceChildren(...[['城市动态',m.events],['正在生效',m.active],['住房供应',m.homes],['租金观测',m.listings]].map(([label,value])=>{const d=node('div');d.className='metric';d.append(node('span',label),node('strong',value.toLocaleString()));return d;}));
 $('newsCount').textContent=data.events.length+' 条';$('news').replaceChildren();
 for(const e of data.events){const c=node('article');c.className='news-card';const meta=node('div');meta.className='news-meta';meta.append(node('span',e.category||'城市动态'),node('span',states[e.status]||'已发布'));c.append(meta,node('h3',e.title));const body=node('p',String(e.body||e.evidence?.[0]||'').slice(0,130));body.className='news-body';c.append(body);const source=node('div');source.className='news-meta';source.append(node('span',(e.districts||[]).join(' · ')||'深圳'),node('span',e.publishedAt||e.published||e.effectiveStart||''));c.append(source);try{const u=new URL(e.url);if(u.protocol==='https:'&&!u.username&&!u.password){const a=node('a','阅读原文');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';a.onclick=event=>event.stopPropagation();c.append(a);}}catch{}c.onclick=()=>{document.querySelectorAll('.news-card').forEach(n=>n.classList.remove('active'));c.classList.add('active');$('selection').textContent=e.title;};$('news').append(c);}
 if(!data.events.length)empty($('news'),'暂无新消息');
 $('market').replaceChildren();row($('market'),'单位租金中位数',data.market.unitRentMedian==null?'—':data.market.unitRentMedian.toLocaleString()+' 元/㎡·月');row($('market'),'观测房源',data.market.count||0);row($('market'),'覆盖项目',data.market.projectCount||0);
 let bands=$('rentBands');if(!bands){bands=node('div');bands.id='rentBands';$('market').after(bands);}renderRentBands(bands,data.market);
 $('homes').replaceChildren();for(const h of data.homes.slice(0,5))row($('homes'),h.project,h.rent==null?'—':h.rent.toLocaleString()+' 元/月');
 $('topics').replaceChildren();for(const [title,count] of data.topics){const r=node('div');r.className='topic';const track=node('div');track.className='topic-track';const fill=node('div');fill.className='topic-fill';fill.style.width=(count/Math.max(1,m.events)*100)+'%';track.append(fill);r.append(node('span',title),track,node('span',count));$('topics').append(r);}if(!data.topics.length)empty($('topics'),'等待城市动态');
 $('sourceList').replaceChildren(...data.sources.map(s=>node('div',s.name||s.id)));
 $('updated').textContent=data.generatedAt?new Date(data.generatedAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})+' 更新':'';
 map?.setHomes(data.homes);renderInsights();
}
function renderInsights(){ $('insights').replaceChildren();for(const b of data.brief.slice(0,3)){const el=node('article');el.className='insight';el.append(node('h3',b.title),node('p',b.count+' 条消息 · '+data.events.filter(e=>b.eventIds.includes(e.id)).map(e=>e.title).slice(0,2).join('；')));$('insights').append(el);}if(!data.brief.length)empty($('insights'),'从城市动态，发现居住线索');}
async function refresh(){const current=++revision;try{const next=await api('housing_monitor',{filters:filters()});if(current!==revision)return;data=next;const selected=$('category').value;for(const [name] of data.topics){if(![...$('category').options].some(o=>o.value===name)){const option=node('option',name);option.value=name;$('category').append(option);}}$('category').value=selected;$('status').textContent='';render();}catch(e){if(current===revision)$('status').textContent=e.message;}}
async function importMap(file){if(!file)return;const current=++modelImport;try{if(!map)throw Error('空间视图加载失败');if(file.size>15000000)throw Error('图层文件过大');const geo=validateGeoJSON(JSON.parse(await file.text()));if(current!==modelImport)return;map.setData(geo);customMap=true;selectView('buildings');$('selection').textContent=file.name;try{localStorage.setItem('anke.monitor.geo',JSON.stringify(geo));}catch{}$('status').textContent='';}catch(e){if(current===modelImport)$('status').textContent=e.message;}}
$('geoFile').onchange=e=>importMap(e.target.files[0]);$('importMap').onclick=()=>$('geoFile').click();$('layersButton').onclick=()=>$('layers').hidden=!$('layers').hidden;
for(const key of ['district','building','home'])$(key+'Layer').onchange=e=>map?.setLayer(key,e.target.checked);
document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>selectView(button.dataset.view));
$('zoomIn').onclick=()=>map?.zoom(.75);$('zoomOut').onclick=()=>map?.zoom(1.3);$('resetMap').onclick=()=>map?.reset();$('refresh').onclick=refresh;$('district').onchange=refresh;$('category').onchange=refresh;
let searchTimer;$('search').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(refresh,200);};
$('prepareInsight').onclick=()=>{if(data){renderInsights();$('insightState').textContent='线索已整理';}};
$('askAgent').onclick=async()=>{if(!data?.events.length){$('insightState').textContent='请先接入城市动态';return;}const button=$('askAgent');button.disabled=true;$('insightState').textContent='Anke 正在分析';try{const result=await api('monitor_analyze',{eventIds:data.events.slice(0,15).map(e=>e.id)});const output=node('div',result.text);output.id='insightResult';$('insights').replaceChildren(output);$('insightState').textContent='分析完成';}catch(e){$('insightState').textContent=e.message;}finally{button.disabled=false;}};
try{const geo=localStorage.getItem('anke.monitor.geo');if(geo&&map){map.setData(validateGeoJSON(JSON.parse(geo)));customMap=true;$('mapEmpty').hidden=true;}}catch{}
if(map&&!customMap)fetch('boundary.json').then(r=>{if(!r.ok)throw Error('Boundary unavailable');return r.json();}).then(validateGeoJSON).then(geo=>{if(customMap)return;customMap=true;map.setData(geo);if(mode!=='model')$('mapEmpty').hidden=true;}).catch(()=>{});
refresh();const timer=setInterval(()=>{if(!document.hidden)refresh();},30000);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
