import {createChart,exportCSV} from './chart.mjs';
import {installChartTools,addFeaturedStock} from './chart-tools.mjs';
import {installMarketTools} from './market-tools.mjs';
import {installIntraday} from './intraday.mjs';
import {installTraining} from './training.mjs';
import {renderStockFacts} from './stock-facts.mjs';
const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
$('detail').setAttribute('role','dialog');$('detail').setAttribute('aria-modal','true');$('detail').setAttribute('aria-labelledby','stockTitle');
let data,mode='wealth',busy=false,limit=100;
let selected,period='day',chartRevision=0,chartData,watchOnly=false,direction='';
let watch=new Set();try{const saved=JSON.parse(localStorage.getItem('anke.monitor.watch')||'[]');if(Array.isArray(saved))watch=new Set(saved.filter(x=>/^(sh|sz|bj)\d{6}$/.test(x)));}catch{}
let tools,marketTools,training,intraday;
const chart=createChart($('candles'),$('chartReadout'),state=>{tools?.state(state);marketTools?.reset();training?.state(state);intraday?.replay(tools.isReplaying());});
tools=installChartTools($('detail'),chart);
marketTools=installMarketTools({redraw:()=>{limit=100;if(data)draw();},getSelected:()=>selected,getHistory:()=>chartData?{...chartData,bars:chartData.bars.slice(0,tools.exportEnd())}:null});
intraday=installIntraday($('detail'));
training=installTraining($('detail'),tools,()=>chartData);
addFeaturedStock(()=>openStock(data?.rows.find(r=>r.code==='sz300308')||{code:'sz300308',name:'中际旭创'}));
const fmt=n=>n==null?'—':n.toLocaleString('zh-CN',{maximumFractionDigits:2});
function stockButton(r){const button=el('button',r.name);button.onclick=()=>openStock(r);return button;}
function watchState(){$('watchStock').textContent=watch.has(selected?.code)?'移出自选':'加入自选';$('watchStock').setAttribute('aria-pressed',String(watch.has(selected?.code)));}
async function openStock(row){selected=row;intraday.select(row.code);$('detail').hidden=false;document.body.classList.add('stock-open');$('detail').scrollTop=0;$('stockTitle').textContent=row.name+' · '+row.code;watchState();renderStockFacts($('stockFacts'),row);$('closeDetail').focus();await loadHistory();}
async function loadHistory(){
 const revision=++chartRevision;training.reset();tools.reset();marketTools.reset();chartData=null;chart.setBars([]);$('chartReadout').textContent='';$('chartSource').textContent='';$('exportCSV').disabled=true;$('chartStatus').textContent='正在加载历史行情';
 for(const b of document.querySelectorAll('[data-period]'))b.setAttribute('aria-pressed',String(b.dataset.period===period));
 try{const result=await window.pluginBridge.invoke('monitor.history',{code:selected.code,period});if(revision!==chartRevision||mode!=='wealth')return;chartData=result;chart.setBars(result.bars);$('chartSource').textContent=`${result.source} · 前复权 · 截至 ${result.lastDate} · ${result.bars.length} 根`;$('chartStatus').textContent='';$('exportCSV').disabled=false;}catch(e){if(revision===chartRevision)$('chartStatus').textContent=e.message;}
}
function draw(){
 const valid=data.rows.filter(r=>r.pct!=null&&!r.suspended),up=valid.filter(r=>r.pct>0).length,down=valid.filter(r=>r.pct<0).length;
 $('metrics').replaceChildren(...[['行情覆盖',data.rows.length],['上涨',up],['下跌',down],['有效涨跌样本',valid.length]].map(([label,value])=>{const n=el('div');n.className='metric';n.append(el('span',label),el('strong',fmt(value)));return n;}));
 $('source').textContent=`${data.source} · 源端时间 ${data.fetchedAt||'未提供'} · 覆盖 ${fmt(data.coverage?.got)} / ${fmt(data.coverage?.total)}`;
 $('breadth').replaceChildren(...[[up,'#ad7972','up','上涨'],[down,'#7c9780','down','下跌'],[valid.length-up-down,'#d6d8d2','flat','平盘']].map(([count,color,value,label])=>{const n=el('button');n.style.width=(count/Math.max(1,valid.length)*100)+'%';n.style.background=color;n.style.padding='0';n.style.border='0';n.style.minHeight='12px';n.title=label+' '+count+' 只';n.setAttribute('aria-label',label+' '+count+' 只');n.setAttribute('aria-pressed',String(direction===value));n.onclick=()=>{direction=direction===value?'':value;limit=100;draw();};return n;}));
 const q=$('search').value.trim().toLowerCase(),sort=$('sort').value;
 const boards=[...new Set(data.rows.map(r=>r.board))].sort(),current=$('board').value;
 $('board').replaceChildren(el('option','全部板块'),...boards.map(name=>{const o=el('option',name);o.value=name;return o;}));$('board').options[0].value='';$('board').value=current;
 const rows=marketTools.filter(data.rows).filter(r=>(r.name+r.code).toLowerCase().includes(q)&&(!current||r.board===current)&&(!watchOnly||watch.has(r.code))&&(!direction||r.pct!=null&&!r.suspended&&(direction==='up'?r.pct>0:direction==='down'?r.pct<0:r.pct===0))).sort((a,b)=>['amount','turnover'].includes(sort)?(b[sort]??-Infinity)-(a[sort]??-Infinity):a.pct==null?b.pct==null?0:1:b.pct==null?-1:sort==='up'?b.pct-a.pct:a.pct-b.pct);
 $('rows').replaceChildren(...rows.slice(0,limit).map(r=>{const tr=el('tr'),name=el('td');name.append(stockButton(r),el('small',r.code));const pct=el('td',r.pct==null?'—':fmt(r.pct)+'%');pct.className=r.pct>0?'up':r.pct<0?'down':'';tr.append(name,el('td',r.board),el('td',fmt(r.price)),pct,el('td',r.amount==null?'—':fmt(r.amount/100000000)+' 亿'));return tr;}));$('more').hidden=rows.length<=limit;
 $('boardStats').replaceChildren(...boards.map(board=>{const group=data.rows.filter(r=>r.board===board),valid=group.filter(r=>r.pct!=null&&!r.suspended),amount=group.reduce((sum,r)=>sum+(r.amount||0),0),button=el('button');button.append(el('strong',board),el('span',`${group.length} 只 · 涨 ${valid.filter(r=>r.pct>0).length} / 跌 ${valid.filter(r=>r.pct<0).length}`),el('span',fmt(amount/1e8)+' 亿'));button.onclick=()=>{$('board').value=board;draw();};return button;}));
 const tiles=rows.filter(r=>r.pct!=null&&!r.suspended).sort((a,b)=>(b.amount||0)-(a.amount||0)).slice(0,60);
 $('heatmap').replaceChildren(...tiles.map(r=>{const b=stockButton(r);b.append(el('span',fmt(r.pct)+'%'));b.style.background=r.pct>0?`rgba(168,95,88,${Math.min(.4,.08+Math.abs(r.pct)/30)})`:r.pct<0?`rgba(93,128,105,${Math.min(.4,.08+Math.abs(r.pct)/30)})`:'#f0f1ee';return b;}));$('heatCaption').textContent=`当前筛选 ${rows.length} 只 · 热力图按成交额展示前 ${tiles.length} 只`;
}
async function load(){if(busy)return;const requested=mode;busy=true;$('refresh').disabled=true;try{if(requested==='wealth'){data=await window.pluginBridge.invoke('monitor.market');if(mode===requested){draw();if(!tools.isReplaying())marketTools.quotes(data.rows,data.fetchedAt||data.receivedAt||new Date().toISOString());}}else{const result=await window.pluginBridge.invoke('monitor.housing');if(!/^http:\/\/127\.0\.0\.1:(47831|47834)\/housing_monitor\/$/.test(result.url))throw Error('住房地址无效');if(mode===requested)$('housingFrame').src=result.url;}if(mode===requested)$('status').textContent='';}catch(e){if(mode===requested)$('status').textContent=e.message;}finally{busy=false;$('refresh').disabled=false;if(mode!==requested)void load();}}
async function select(value){mode=value;++chartRevision;tools.pause();training.pause();intraday.active(mode==='wealth'&&!!selected);for(const id of ['wealth','housing'])$(id).setAttribute('aria-pressed',String(id===mode));$('market').hidden=mode!=='wealth';$('housingView').hidden=mode!=='housing';if(mode==='wealth'){$('housingFrame').removeAttribute('src');if(selected&&!$('detail').hidden)void loadHistory();}await load();}
for(const id of ['wealth','housing'])$(id).onclick=()=>select(id);$('refresh').onclick=()=>{void load();if(mode==='wealth'&&selected&&!$('detail').hidden&&!tools.isReplaying())void loadHistory();};$('search').oninput=()=>{limit=100;if(data)draw();};$('sort').onchange=()=>{if(data)draw();};$('more').onclick=()=>{limit+=100;draw();};
for(const b of document.querySelectorAll('[data-period]'))b.onclick=()=>{period=b.dataset.period;void loadHistory();};
 $('closeDetail').onclick=()=>{++chartRevision;training.reset();tools.reset();intraday.select(null);selected=null;chartData=null;$('detail').hidden=true;document.body.classList.remove('stock-open');$('featuredStock').focus();};
 document.addEventListener('keydown',event=>{
  if($('detail').hidden)return;
  if(event.key==='Escape')$('closeDetail').click();
  if(event.key==='Tab'){
   const controls=[...$('detail').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(node=>node.getClientRects().length);
   const first=controls[0],last=controls.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
 });
 $('watchStock').onclick=()=>{if(!selected)return;const next=new Set(watch);if(next.has(selected.code))next.delete(selected.code);else next.add(selected.code);try{localStorage.setItem('anke.monitor.watch',JSON.stringify([...next]));watch=next;watchState();draw();}catch{$('chartStatus').textContent='自选保存失败';}};
 $('watchOnly').onclick=()=>{watchOnly=!watchOnly;$('watchOnly').setAttribute('aria-pressed',String(watchOnly));draw();};$('board').onchange=()=>{limit=100;draw();};$('heatToggle').onclick=()=>{$('heatmap').hidden=!$('heatmap').hidden;$('heatToggle').setAttribute('aria-pressed',String(!$('heatmap').hidden));};$('chartReset').onclick=()=>chart.reset();
 $('exportCSV').onclick=()=>{if(!chartData)return;const url=URL.createObjectURL(new Blob(['\ufeff'+exportCSV(chartData.bars.slice(0,tools.exportEnd()))],{type:'text/csv;charset=utf-8'}));const a=el('a');a.href=url;a.download=chartData.code+'-'+chartData.period+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
const timer=setInterval(()=>{if(!document.hidden&&mode==='wealth'&&!tools.isReplaying())load();},60000);window.addEventListener('pagehide',()=>{++chartRevision;clearInterval(timer);training.reset();intraday.dispose();tools.dispose();chart.dispose();$('housingFrame').removeAttribute('src');});window.pluginBridge.invoke('monitor.state').then(state=>select(state.tab==='housing'?'housing':'wealth')).catch(()=>load());
