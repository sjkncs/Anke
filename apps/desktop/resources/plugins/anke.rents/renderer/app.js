/* Source metadata is displayed as supplied; absent attributes stay unknown. */
const residenceAddressKey=row=>JSON.stringify([row.dataset||'imported',row.district||'',row.project||'']);
function savedResidence(row){
 try{const saved=JSON.parse(localStorage.getItem('anke.rents.addresses.v1')||'{}')[residenceAddressKey(row)];return saved&&typeof saved.address==='string'&&saved.address.trim()&&saved.address.length<=500?saved:null;}catch{return null;}
}
async function saveResidence(row,candidate){
 if(typeof candidate.address!=='string'||!candidate.address.trim())throw Error('该地点没有具体地址');
 const value={address:candidate.address,location:candidate.location,source:candidate.source||'',selectedAt:new Date().toISOString()};
 const saved=JSON.parse(localStorage.getItem('anke.rents.addresses.v1')||'{}');saved[residenceAddressKey(row)]=value;
 await window.pluginBridge.invoke('rents.saveAddress',{project:row.project,district:row.district,address:value.address,source:value.source,location:value.location});
 localStorage.setItem('anke.rents.addresses.v1',JSON.stringify(saved));return value;
}
function renderMarket(data){
 const root=document.getElementById('ledgerTable');
 const make=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const controls=make('div');controls.className='event-filters';
 const source=make('select');source.setAttribute('aria-label','市场租金信息源');
 for(const name of ['',...(data.sources||[]).map(s=>s.name)]){const option=make('option',name||'全部信息源');option.value=name;source.append(option);}
 const historyButton=make('button','历史成交与小区参考');historyButton.type='button';controls.append(historyButton);
 const historyPanel=make('article');historyPanel.hidden=true;historyPanel.setAttribute('aria-label','历史成交与小区参考');
 historyButton.onclick=()=>{historyPanel.hidden=!historyPanel.hidden;if(!historyPanel.hidden&&!historyPanel.childElementCount)renderHistoryPanel(historyPanel);};
 const coverage=make('div');coverage.className='event-sources';
 for(const item of data.sources||[]){const chip=make('span',item.name+' · '+item.count+' 条');chip.className='event-source';coverage.append(chip);}
 for(const [key,label] of [['address','具体地址'],['street','街道'],['layout','户型']]){if(data.fieldCoverage){const chip=make('span',label+' '+data.fieldCoverage[key]+'/'+data.fieldCoverage.records);chip.className='event-source';coverage.append(chip);}}
 const output=make('div');output.className='table-wrap market-ledger-scroll';output.tabIndex=0;output.setAttribute('role','region');output.setAttribute('aria-label','市场租金明细，左右滚动');root.replaceChildren(controls,historyPanel,coverage,output);controls.append(source);
 function draw(){
  for(const row of data.rows){const saved=!row.address&&savedResidence(row);if(saved){row.address=saved.address;row.location=saved.location;row.addressSource={name:saved.source};}}
  const rows=data.rows.filter(r=>!source.value||r.source===source.value),table=make('table'),head=make('thead'),tr=make('tr');
  ['项目','行政区','具体地址','面积（㎡）','户型','楼层','房龄','装修','朝向','电梯','付款方式','房源标签','月租金（元）','单位租金（元/㎡/月）','类型','租赁方式','物业费','日期','信息源','房源编号','原文地址','建筑年份','总楼层','总户数','车位','地铁配套','周边配套','入住时间','租期','看房','网页字段'].forEach(h=>tr.append(make('th',h)));head.append(tr);table.append(head);const body=make('tbody');
  tr.append(make('th','街道'));
  for(const row of rows){const line=make('tr'),project=make('div',row.project),address=make('div'),addressText=make('span',row.address||'—');address.className='market-address';address.append(addressText);address.title=row.addressSource?.url||row.addressSource?.name||'';if(!row.address){const locate=make('button','补充地址');locate.type='button';locate.className='address-fill';locate.onclick=async()=>{locate.disabled=true;locate.textContent='查询中';try{const result=await window.pluginBridge.invoke('rents.locate',{project:row.project,district:row.district});if(!locate.isConnected)return;const target=result.results.find(r=>r.id===result.selected&&r.exact);if(!target){if(result.results.length){window.locateResidence(row);return;}throw Error('没有匹配住宅');}await saveResidence(row,target);if(locate.isConnected)draw();}catch(e){if(locate.isConnected){locate.title=e.message||'住宅查询失败';document.getElementById('status').textContent=locate.title;}}finally{locate.disabled=false;if(locate.isConnected)locate.textContent='补充地址';}};address.append(locate);}
   const provider=make('div',row.source||'—');
   const listing=row.listingId||row.observationId||'—';
   let url='未提供';try{const parsed=new URL(row.url);if(['http:','https:'].includes(parsed.protocol)&&!parsed.username&&!parsed.password)url=parsed.href;}catch{}
   const values=[project,row.district||'—',address,format(row.area),row.layout||'—',row.floor||'—',row.age||'—',row.decoration||'—',row.orientation||'—',row.elevator||'—',row.payment||'—',row.tags||'—',format(row.rent),row.area>0?format(row.rent/row.area):'—',row.record_type||'—',row.lease||'—',row.fee==null?'—':format(row.fee)+' 元 · '+(row.fee_mode||'—'),row.date||'—',provider,listing,url];
   const fields=make('details'),summary=make('summary','查看详情');fields.append(summary);for(const [key,value] of Object.entries(row.sourceFields||{})){if(value!==''&&value!=null&&!['缺失说明','商品住房核验状态','观测日期口径','面积口径','数据性质','详情采集状态'].includes(key))fields.append(make('div',key+'：'+value));}
   if(row.referenceClue){const clue=make('details'),label=make('summary','2026年8月小区参考 · 同区同名待核验');clue.append(label);for(const [key,value] of Object.entries(row.referenceClue.values))if(value!==''&&value!=null)clue.append(make('div',key+'：'+value));clue.append(make('div','历史月份参考，不代表房源当前状态；不回填早期训练特征'));fields.append(clue);}
   values.push(row.buildingYear||'—',row.totalFloors||'—',row.households||'—',row.parking||'—',row.metro||'—',row.amenities||'—',row.moveIn||'—',row.leaseTerm||'—',row.viewing||'—',fields,row.street||'—');
   for(const value of values){const cell=make('td');if(value instanceof Node)cell.append(value);else cell.textContent=value;line.append(cell);}body.append(line);
  }table.append(body);output.replaceChildren(table);if(!rows.length)output.append(make('p','当前返回记录中没有该来源；可缩小行政区或项目范围'));
 }source.onchange=draw;draw();
 if(root.residenceSelected)window.removeEventListener('anke:residence-selected',root.residenceSelected);
 root.residenceSelected=async({detail})=>{try{await saveResidence(detail.home,detail.candidate);draw();}catch(e){document.getElementById('status').textContent=e.message;}};
 window.addEventListener('anke:residence-selected',root.residenceSelected);
 let stats=document.getElementById('geographicRentStats');if(!stats){stats=make('article');stats.id='geographicRentStats';root.before(stats);}stats.replaceChildren(make('h2','区域租金变化 · 元/㎡/月'));
 const level=make('select');level.setAttribute('aria-label','租金统计层级');for(const [value,label] of [['city','全市'],['district','行政区'],['street','街道']]){const o=make('option',label);o.value=value;level.append(o);}const wrap=make('div');wrap.className='table-wrap';stats.append(level,wrap);
 function drawStats(){const t=make('table'),h=make('tr');for(const x of ['区域','类型','上期','本期','样本量','平均租金','中位数','面积加权','样本均价变化','同房源变化','配对数'])h.append(make('th',x));const thead=make('thead');thead.append(h);t.append(thead);const body=make('tbody');for(const stratum of data.geographicStats||[])for(const g of stratum.groups.filter(g=>g.level===level.value)){const row=make('tr'),values=[g.district&&g.level==='street'?g.district+' · '+g.name:g.name,stratum.recordType+' · '+stratum.lease,g.previousDate||'—',g.currentDate||'—',g.current?.count||0,format(g.current?.meanUnitRent),format(g.current?.medianUnitRent),format(g.current?.areaWeightedUnitRent),g.sampleChange?format(g.sampleChange.percent)+'%':'—',g.pairedChange?format(g.pairedChange.percent)+'%':'—',g.pairedChange?.count||0];for(const v of values)row.append(make('td',v));body.append(row);}t.append(body);wrap.replaceChildren(t);}level.onchange=drawStats;drawStats();
}
function renderHistoryPanel(root){
 const make=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
 const kind=make('select'),year=make('select'),search=make('input'),load=make('button','查询'),next=make('button','下一页'),status=make('p'),output=make('div');
 kind.setAttribute('aria-label','历史数据类型');year.setAttribute('aria-label','历史成交年份');search.setAttribute('aria-label','历史小区名称');search.placeholder='搜索小区';output.className='table-wrap';
 for(const [value,label] of [['history_sales','二手房买卖成交 · 2023—2026'],['reference_202608','小区参考 · 2026年8月']]){const o=make('option',label);o.value=value;kind.append(o);}
 for(const value of ['',2023,2024,2025,2026]){const o=make('option',value||'全部年份');o.value=value;year.append(o);}
 let offset=0,revision=0;next.disabled=true;
 async function run(reset=true){if(reset)offset=0;const current=++revision;load.disabled=true;next.disabled=true;status.textContent='查询中';try{
  const input={dataset:kind.value,query:search.value,district:document.getElementById('district').value,limit:50,offset};if(kind.value==='history_sales'&&year.value)input.year=Number(year.value);
  const result=await window.pluginBridge.invoke('rents.query',input);if(current!==revision||!root.isConnected)return;
  status.textContent=result.recordType+' · '+result.count+' 条 · '+result.priceUnit+(result.missingYears.length?' · 2025、2026年无记录':' · 坐标为来源声明WGS84，待独立核验');
  const table=make('table'),head=make('thead'),tr=make('tr'),body=make('tbody');
  for(const title of ['小区','行政区','日期','面积（㎡）','成交总价（万元）','成交单价（元/㎡）','来源字段'])tr.append(make('th',title));head.append(tr);table.append(head,body);
  for(const row of result.rows){const line=make('tr');for(const value of [row.project,row.district,row.date||result.referenceMonth,row.area??'—',row.total_wan??'—',row.unit_price??'—'])line.append(make('td',String(value)));const cell=make('td'),detail=make('details');detail.append(make('summary','查看原始字段'));detail.append(make('p',row.fields.sourceName+' · 原文件第'+row.fields.sourceRow+'行'));for(const [key,value] of Object.entries(row.fields.values))detail.append(make('div',key+'：'+(value||'—')));cell.append(detail);line.append(cell);body.append(line);}output.replaceChildren(table);if(!result.rows.length)output.append(make('p','没有符合条件的历史记录'));next.disabled=!result.hasMore;
  if(result.fieldCoverage){const coverage=result.fieldCoverage,detail=make('details');detail.append(make('summary','字段覆盖与缺失'));detail.append(make('p','全数据集 '+coverage.total+' 条，未按当前筛选重算；非空不代表已核实。'));detail.append(make('p','原始文件未提供：'+coverage.absentFields.join('、')));detail.append(make('p','坐标系：'+result.coordinateCRS+'；实际位置待核验。'));for(const [key,value] of Object.entries(coverage.fields))detail.append(make('div',key+'：非空 '+value.presentPercent+'%，缺失 '+value.missing+' 条'));output.prepend(detail);}
 }catch(error){status.textContent='历史数据查询失败：'+error.message;output.replaceChildren();}finally{if(current===revision)load.disabled=false;}}
 load.onclick=()=>run();next.onclick=()=>{offset+=50;run(false);};kind.onchange=()=>{year.disabled=kind.value!=='history_sales';run();};year.onchange=()=>run();search.onkeydown=e=>{if(e.key==='Enter')run();};
 root.append(kind,year,search,load,next,status,output);run();
}
const $ = id=>document.getElementById(id);
$('openMonitor').onclick=()=>window.pluginBridge.invoke('rents.openMonitor').catch(()=>{$('status').textContent='住房监测打开失败';});
function applyAppearance(){document.documentElement.dataset.palette='gray-white';}
window.pluginBridge.on('appearance:changed',applyAppearance);
window.pluginBridge.invoke('rents.appearance').then(applyAppearance).catch(()=>{$('status').textContent='主题加载失败';});
const districts=['南山','福田','罗湖','盐田','宝安','龙华','龙岗','坪山','光明','大鹏新区'];
let snapshot,queryRevision=0;
window.addEventListener('anke:rents-ready',()=>{if(snapshot)window.dispatchEvent(new CustomEvent('anke:rents-data',{detail:snapshot}));});
for(const name of districts){const opt=document.createElement('option');opt.textContent=name;opt.value=name;$('district').append(opt);}
function node(tag,text){const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);return el;}
function format(n){return n==null?'—':Number(n).toLocaleString('zh-CN',{maximumFractionDigits:2});}
function metrics(target,items){target.replaceChildren(...items.map(([label,value])=>{const el=node('div');el.className='metric';el.append(node('span',label),node('strong',value));return el;}));}
function table(target,headers,rows){const table=node('table'),head=node('thead'),tr=node('tr');headers.forEach(x=>tr.append(node('th',x)));head.append(tr);const body=node('tbody');for(const row of rows){const line=node('tr');row.forEach(value=>{const cell=node('td');if(value instanceof Node)cell.append(value);else cell.textContent=value??'—';line.append(cell);});body.append(line);}table.append(head,body);target.replaceChildren(table);}
function link(url,label){try{const parsed=new URL(url);if(!['https:','http:'].includes(parsed.protocol))return label;}catch{return label;}const a=node('a',label);a.href='#';a.onclick=async e=>{e.preventDefault();try{await window.pluginBridge.invoke('rents.openMap',{url});}catch{$('status').textContent='地图打开失败';}};return a;}
function render(data){snapshot=data;$('status').textContent='';
  window.dispatchEvent(new CustomEvent('anke:rents-data',{detail:data}));
  metrics($('metrics'),[[`${data.label==='演示数据'?'演示':'市场'}${$('recordType').value}记录`,format(data.count)],['市场项目',format(data.projectCount)],['已知行政区',`${data.coveredDistricts} / 10`],['租金中位数 · 元/㎡/月',format(data.unitRentMedian)]]);
  const max=Math.max(...data.districts.map(x=>x.unitRentMedian),1);$('bars').replaceChildren(...data.districts.filter(r=>districts.includes(r.name)).map(r=>{const row=node('div');row.className='bar-row';const track=node('div');track.className='bar-track';const fill=node('div');fill.className='bar-fill';fill.style.width=`${r.unitRentMedian/max*100}%`;track.append(fill);row.append(node('span',r.name),track,node('span',format(r.unitRentMedian)));return row;}));
  $('coverage').replaceChildren(...[['数据集',data.label],['记录类型',$('recordType').value],['租赁方式',$('lease').value],['起始日期',data.dateStart||'—'],['结束日期',data.dateEnd||'—']].map(([a,b])=>{const row=node('div');row.className='coverage-row';row.append(node('span',a),node('span',b));return row;}));
  renderMarket(data);
  table($('projectsTable'),['项目','样本数量','单位租金中位数'],data.projects.map(r=>[r.name,format(r.count),format(r.unitRentMedian)]));
  table($('locations'),['项目','行政区','地址','坐标与坐标系','信息来源','地图与街景'],[...new Map(data.rows.map(r=>[r.project+'|'+r.district+'|'+r.address,r])).values()].map(r=>{const b=node('button','定位住宅');b.onclick=()=>window.locateResidence(r);const provider=node('div'),badge=node('span',r.source||'来源待核实');badge.className='source-badge';provider.append(badge,node('small','记录日期：'+(r.date||'待核实')));const location=r.location;const coordinate=location&&Number.isFinite(location.longitude)&&Number.isFinite(location.latitude)&&location.crs?`${location.longitude}, ${location.latitude} · ${location.crs}`:'坐标待核实';const action=node('div');action.append(b,node('small','定位后查询附近街景'));return [r.project||'项目待核实',r.district||'行政区待核实',r.address||'原始记录未提供地址',coordinate,provider,action];}));
  if(!data.rows.length){const empty=node('p','当前筛选没有住宅记录');empty.className='empty-state';$('locations').append(empty);}
}
async function refresh(){const revision=++queryRevision;try{const filters=Object.fromEntries(['dataset','district','recordType','lease','query'].map(k=>[k,$(k).value]));const data=await window.pluginBridge.invoke('rents.query',filters);if(revision===queryRevision)render(data);}catch{if(revision===queryRevision){snapshot=null;for(const id of ['metrics','bars','coverage','ledgerTable','projectsTable','locations'])$(id).replaceChildren();$('status').textContent='租金数据加载失败';window.dispatchEvent(new CustomEvent('anke:rents-data',{detail:{label:'加载失败',count:0,districts:[],visual:{projects:[],months:[],quarters:[],scatter:[]}}}));}}}
function estimate(){const values=Object.fromEntries(['market','current','area','ratio','cap','income','fee'].map(k=>[k,Number($(k).value)]));if(Object.values(values).some(x=>!Number.isFinite(x))||values.market<=0||values.current<0||values.area<=0||values.income<=0||values.fee<0||values.ratio<0||values.ratio>100||values.cap<0||values.cap>100){$('estimate').replaceChildren(node('p','请填写有效的测算参数'));return;}const target=values.market*values.ratio/100,unit=target>values.current?Math.min(target,values.current*(1+values.cap/100)):target,expense=unit*values.area+values.fee;metrics($('estimate'),[['目标单位租金',format(target)],['调整后单位租金',format(unit)],['每户每月支出',format(expense)],['收入负担比例',format(expense/values.income*100)+'%']]);}
$('tabs').onclick=e=>{const tab=e.target.closest('[data-tab]');if(!tab)return;document.querySelectorAll('.page').forEach(p=>p.hidden=p.id!==tab.dataset.tab);document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===tab));};
for(const id of ['dataset','district','recordType','lease','query'])$(id).addEventListener('change',refresh);
let searchTimer;$('query').addEventListener('input',()=>{++queryRevision;clearTimeout(searchTimer);searchTimer=setTimeout(refresh,220);});window.addEventListener('pagehide',()=>clearTimeout(searchTimer));
document.querySelectorAll('.scenario-grid input').forEach(x=>x.addEventListener('input',estimate));
$('refresh').onclick=refresh;
refresh();estimate();
const eventFilters=node('div');eventFilters.className='event-filters';
const eventSource=node('select'),eventCategory=node('select'),eventSources=node('div'),eventQuery=node('input');eventQuery.placeholder='搜索政策、公告、项目';eventQuery.setAttribute('aria-label','动态搜索');eventSources.className='event-sources';eventSource.setAttribute('aria-label','动态信息源');eventCategory.setAttribute('aria-label','动态分类');eventFilters.append(eventSource,eventCategory,eventQuery);$('eventTable').before(eventFilters,eventSources);
let eventSnapshot,eventRevision=0;
function eventSourceName(url){try{const host=new URL(url).hostname;return ({'zjj.sz.gov.cn':'深圳市住房和建设局','www.sz.gov.cn':'深圳政府在线','sz.gov.cn':'深圳政府在线','szjj.sz.gov.cn':'深圳交警','news.qq.com':'腾讯新闻'})[host]||host;}catch{return '来源待核实';}}
function eventOptions(select,values,label){const current=select.value;select.replaceChildren();for(const value of ['',...new Set(values.filter(Boolean))]){const option=node('option',value||label);option.value=value;select.append(option);}if([...select.options].some(o=>o.value===current))select.value=current;}
function renderEvents(){if(!eventSnapshot)return;const data=eventSnapshot,status={active:'生效中',upcoming:'即将生效',date_unconfirmed:'公告已发布',expired:'已结束'};
 for(const event of data.events){event.publisher=event.publisher||eventSourceName(event.url);}
 const seen=new Set(),rows=data.events.filter(e=>{const key=e.url||e.id;if(key&&seen.has(key))return false;if(key)seen.add(key);return (!eventSource.value||(e.publisher||'来源未标注')===eventSource.value)&&(!eventCategory.value||(e.categories||[]).includes(eventCategory.value));});
 $('eventState').textContent=data.status==='not_loaded'?'正在等待首轮采集':`${rows.length} 项动态 · 更新 ${data.generatedAt?new Date(data.generatedAt).toLocaleString('zh-CN'):'时间待确认'} · ${data.sources.filter(s=>s.status==='ok').length}/${data.sources.length} 来源正常`;
 eventSources.replaceChildren(...data.sources.map(s=>{const reason={URLError:'网络连接失败',TimeoutError:'请求超时',HTTPError:'服务响应异常',not_configured:'未配置'};const label=s.status==='ok'?'正常':reason[s.error]||reason[s.status]||'待恢复';const chip=node('span',s.name+' · '+label);chip.className='event-source';chip.dataset.status=s.status==='ok'?'ok':'failed';chip.title='最近采集：'+(s.checkedAt?new Date(s.checkedAt).toLocaleString('zh-CN'):'时间未标注');return chip;}));
 table($('eventTable'),['动态','分类','范围','状态与生效时间','来源与日期'],rows.map(e=>{const source=node('div'),a=node('a',e.publisher||'来源未标注');a.href='#';a.onclick=async ev=>{ev.preventDefault();try{await window.pluginBridge.invoke('rents.openEvent',{url:e.url});}catch{$('eventState').textContent='原文打开失败';}};source.append(a,node('small',e.publishedAt||'发布时间未标注'));const state=node('div',status[e.status]||'状态待核实');state.append(node('small',e.phase||'阶段待核实'),node('small',[e.effectiveStart,e.effectiveEnd].filter(Boolean).join(' — ')||'生效时间待确认'));return [e.title,(e.categories||[]).join('、')||'未分类',(e.districts||[]).join('、')||(e.places||[]).join('、')||'范围待定位',state,source];}));
 const lines=$('eventTable').querySelectorAll('tbody tr');rows.forEach((event,index)=>{const details=node('details'),summary=node('summary','查看依据与采集记录');details.append(summary,node('p',(event.evidence||[]).join('；')||'未提供原文摘录'),node('p','首次采集：'+(event.firstSeen||'未提供')+' · 最近修订：'+(event.changedAt||'未提供')+' · 版本：'+(event.version??'未提供')),node('p','原文：'+(event.url||'未提供')));lines[index].firstElementChild.append(details);});
 for(const line of lines){const cell=line.lastElementChild;cell.querySelector('a')?.classList.add('source-badge');const date=cell.querySelector('small');if(date)date.textContent='发布时间：'+date.textContent;}
 if(!rows.length){const empty=node('p','当前筛选没有动态；可清空动态搜索或切换行政区');empty.className='empty-state';$('eventTable').append(empty);}
}
eventSource.onchange=eventCategory.onchange=renderEvents;
async function refreshEvents(){const revision=++eventRevision;
  try{
    const data=await window.pluginBridge.invoke('rents.events',{district:$('district').value,query:eventQuery.value});
    if(revision!==eventRevision)return;eventSnapshot=data;for(const event of data.events)event.publisher=event.publisher||eventSourceName(event.url);eventOptions(eventSource,data.events.map(e=>e.publisher),'全部信息源');eventOptions(eventCategory,data.events.flatMap(e=>e.categories||[]),'全部分类');renderEvents();
  }catch{if(revision===eventRevision){eventSnapshot=null;$('eventTable').replaceChildren();eventSources.replaceChildren();$('eventState').textContent='动态读取失败';}}
}
$('eventNotify').onclick=async()=>{try{const r=await window.pluginBridge.invoke('rents.enableEventNotifications');$('eventState').textContent=r.permission==='granted'?'系统推送已开启':'系统暂未允许通知';}catch{$('eventState').textContent='系统推送开启失败';}};
$('district').addEventListener('change',refreshEvents);eventQuery.addEventListener('change',refreshEvents);
$('refresh').onclick=()=>{refresh();refreshEvents();};
refreshEvents();const eventTimer=setInterval(refreshEvents,30000);window.addEventListener('pagehide',()=>clearInterval(eventTimer));
window.pluginBridge.invoke('rents.module').then(id=>document.querySelector(`[data-tab="${id}"]`)?.click()).catch(()=>{$('status').textContent='模块加载失败';});
