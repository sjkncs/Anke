const $ = id=>document.getElementById(id);
function applyAppearance(){document.documentElement.dataset.palette='gray-white';}
window.pluginBridge.on('appearance:changed',applyAppearance);
window.pluginBridge.invoke('rents.appearance').then(applyAppearance).catch(()=>{$('status').textContent='主题加载失败';});
const districts=['南山','福田','罗湖','盐田','宝安','龙华','龙岗','坪山','光明','大鹏新区'];
let snapshot;
for(const name of districts){const opt=document.createElement('option');opt.textContent=name;opt.value=name;$('district').append(opt);}
function node(tag,text){const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);return el;}
function format(n){return n==null?'—':Number(n).toLocaleString('zh-CN',{maximumFractionDigits:2});}
function metrics(target,items){target.replaceChildren(...items.map(([label,value])=>{const el=node('div');el.className='metric';el.append(node('span',label),node('strong',value));return el;}));}
function table(target,headers,rows){const table=node('table'),head=node('thead'),tr=node('tr');headers.forEach(x=>tr.append(node('th',x)));head.append(tr);const body=node('tbody');for(const row of rows){const line=node('tr');row.forEach(value=>{const cell=node('td');if(value instanceof Node)cell.append(value);else cell.textContent=value??'—';line.append(cell);});body.append(line);}table.append(head,body);target.replaceChildren(table);}
function link(url,label){try{const parsed=new URL(url);if(!['https:','http:'].includes(parsed.protocol))return label;}catch{return label;}const a=node('a',label);a.href='#';a.onclick=async e=>{e.preventDefault();try{await window.pluginBridge.invoke('rents.openMap',{url});}catch{$('status').textContent='地图打开失败';}};return a;}
function render(data){snapshot=data;$('status').textContent='';
  metrics($('metrics'),[[`${data.label==='演示数据'?'演示':'市场'}${$('recordType').value}记录`,format(data.count)],['市场项目',format(data.projectCount)],['已知行政区',`${data.coveredDistricts} / 10`],['租金中位数 · 元/㎡/月',format(data.unitRentMedian)]]);
  const max=Math.max(...data.districts.map(x=>x.unitRentMedian),1);$('bars').replaceChildren(...data.districts.filter(r=>districts.includes(r.name)).map(r=>{const row=node('div');row.className='bar-row';const track=node('div');track.className='bar-track';const fill=node('div');fill.className='bar-fill';fill.style.width=`${r.unitRentMedian/max*100}%`;track.append(fill);row.append(node('span',r.name),track,node('span',format(r.unitRentMedian)));return row;}));
  $('coverage').replaceChildren(...[['数据集',data.label],['记录类型',$('recordType').value],['租赁方式',$('lease').value],['起始日期',data.dateStart||'—'],['结束日期',data.dateEnd||'—']].map(([a,b])=>{const row=node('div');row.className='coverage-row';row.append(node('span',a),node('span',b));return row;}));
  table($('ledgerTable'),['项目','行政区','面积（㎡）','月租金（元）','单位租金','日期','来源'],data.rows.map(r=>[r.project,r.district,format(r.area),format(r.rent),format(r.rent/r.area),r.date,r.source]));
  table($('projectsTable'),['项目','样本数量','单位租金中位数'],data.projects.map(r=>[r.name,format(r.count),format(r.unitRentMedian)]));
  table($('locations'),['项目','行政区','地址','地图'],[...new Map(data.rows.map(r=>[r.project,r])).values()].map(r=>[r.project,r.district,r.address,link(`https://map.baidu.com/search/${encodeURIComponent('深圳'+r.project)}`,'查看地图')]));
}
async function refresh(){try{const filters=Object.fromEntries(['dataset','district','recordType','lease','query'].map(k=>[k,$(k).value]));render(await window.pluginBridge.invoke('rents.query',filters));}catch{$('status').textContent='租金数据加载失败';}}
function estimate(){const values=Object.fromEntries(['market','current','area','ratio','cap','income','fee'].map(k=>[k,Number($(k).value)]));if(Object.values(values).some(x=>!Number.isFinite(x))||values.market<=0||values.current<0||values.area<=0||values.income<=0||values.fee<0||values.ratio<0||values.ratio>100||values.cap<0||values.cap>100){$('estimate').replaceChildren(node('p','请填写有效的测算参数'));return;}const target=values.market*values.ratio/100,unit=target>values.current?Math.min(target,values.current*(1+values.cap/100)):target,expense=unit*values.area+values.fee;metrics($('estimate'),[['目标单位租金',format(target)],['调整后单位租金',format(unit)],['每户每月支出',format(expense)],['收入负担比例',format(expense/values.income*100)+'%']]);}
$('tabs').onclick=e=>{const tab=e.target.closest('[data-tab]');if(!tab)return;document.querySelectorAll('.page').forEach(p=>p.hidden=p.id!==tab.dataset.tab);document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===tab));};
for(const id of ['dataset','district','recordType','lease','query'])$(id).addEventListener('change',refresh);
document.querySelectorAll('.scenario-grid input').forEach(x=>x.addEventListener('input',estimate));
$('refresh').onclick=refresh;$('mapOpen').onclick=async()=>{try{await window.pluginBridge.invoke('rents.openMap',{url:'https://map.baidu.com'});}catch{$('status').textContent='地图打开失败';}};
refresh();estimate();
async function refreshEvents(){
  try{
    const data=await window.pluginBridge.invoke('rents.events',{district:$('district').value,query:$('query').value});
    const status={active:'生效中',upcoming:'即将生效',date_unconfirmed:'公告已发布',expired:'已结束'};
    $('eventState').textContent=data.status==='not_loaded'?'正在等待首轮采集':`${data.events.length} 项动态 · ${data.generatedAt} · ${data.sources.filter(s=>s.status==='ok').length}/${data.sources.length} 来源正常`;
    table($('eventTable'),['动态','范围','状态','阶段','生效时间','来源'],data.events.map(e=>{
      const a=node('a','原文');a.href='#';a.onclick=async ev=>{ev.preventDefault();await window.pluginBridge.invoke('rents.openEvent',{url:e.url});};
      return [e.title,e.districts.join('、')||e.places.join('、')||'范围待定位',status[e.status],e.phase,[e.effectiveStart,e.effectiveEnd].filter(Boolean).join(' — ')||'待确认',a];
    }));
  }catch{$('eventState').textContent='动态读取失败';}
}
$('eventNotify').onclick=async()=>{try{const r=await window.pluginBridge.invoke('rents.enableEventNotifications');$('eventState').textContent=r.permission==='granted'?'系统推送已开启':'系统暂未允许通知';}catch{$('eventState').textContent='系统推送开启失败';}};
for(const id of ['district','query'])$(id).addEventListener('change',refreshEvents);
refreshEvents();setInterval(refreshEvents,30000);
window.pluginBridge.invoke('rents.module').then(id=>document.querySelector(`[data-tab="${id}"]`)?.click()).catch(()=>{$('status').textContent='模块加载失败';});
