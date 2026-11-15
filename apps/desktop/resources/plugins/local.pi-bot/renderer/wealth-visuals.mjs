import {el} from './dom.mjs';
import {addOpinionLabels,installOpinionFilters} from './opinion-view.mjs';

const NS='http://www.w3.org/2000/svg';
const labels={date:'日期',trade_date:'交易日期',report_date:'报告期',datetime:'时间',time:'时间',name:'名称',code:'代码',symbol:'代码',close:'收盘价',open:'开盘价',high:'最高价',low:'最低价',price:'价格',nav:'净值',value:'数值',revenue:'营业收入',net_profit:'净利润',profit:'利润',eps:'每股收益',roe:'净资产收益率',pe:'市盈率',pb:'市净率',net_inflow:'净流入',net_flow:'净流入',main_net_inflow:'主力净流入',inflow:'流入',outflow:'流出',amount:'金额',volume:'成交量',weight:'权重',market_value:'市值',quantity:'数量',return_pct:'收益率',total_return:'累计收益',drawdown:'回撤',remaining:'剩余',limit:'上限',total:'总量',used:'已使用',title:'标题',source:'来源',published_at:'发布时间',summary:'摘要',remaining_points:'剩余额度',total_points:'总额度',unit:'单位',currency:'币种',period:'期间'};
const label=key=>labels[key]||key;
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const text=value=>value==null?'—':finite(value)?value.toLocaleString('zh-CN',{maximumFractionDigits:4}):typeof value==='object'?JSON.stringify(value):String(value);
const action=(name,run)=>{const b=el('button',name);b.type='button';b.onclick=run;return b;};
const svgNode=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
export function safeLink(value){try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;}catch{return null;}}
export function unpackWealth(value){
 if(value?.structuredContent)return value.structuredContent;
 if(Array.isArray(value?.content)){
  const messages=value.content.filter(c=>c.type==='text'&&typeof c.text==='string').map(c=>c.text);
  const parsed=messages.map(s=>{try{return JSON.parse(s);}catch{return {text:s};}});
  return parsed.length===1?parsed[0]:{responses:parsed};
 }
 return value;
}
export function datasetsFrom(value){
 const sets=[];
 function visit(node,path,depth){
  if(depth>6||!node||typeof node!=='object')return;
  if(Array.isArray(node)){
   if(node.length&&node.every(r=>r&&typeof r==='object'&&!Array.isArray(r))){sets.push({name:path||'数据',rows:node});return;}
   node.slice(0,20).forEach((item,i)=>visit(item,path+'['+i+']',depth+1));return;
  }
  // Preserve providers' matrix-column contracts instead of guessing positions.
  if(Array.isArray(node.columns)&&Array.isArray(node.data)&&node.columns.every(c=>typeof c==='string')&&node.data.every(r=>Array.isArray(r))){sets.push({name:path||'数据',rows:node.data.map(row=>Object.fromEntries(node.columns.map((c,i)=>[c,row[i]??null])))});return;}
  for(const [key,item] of Object.entries(node))visit(item,path?path+'.'+key:key,depth+1);
 }
 visit(value,'',0);return sets;
}
export function numericKeys(rows){return [...new Set(rows.slice(0,500).flatMap(Object.keys))].filter(k=>!/(^id$|code|symbol|timestamp|year$)/i.test(k)&&rows.some(r=>finite(r[k]))&&rows.every(r=>r[k]==null||finite(r[k])));}
function readable(host,value){
 if(typeof value==='string'){host.append(el('p',value,'wv-readable'));return;}
 const grid=el('div','','wv-cards');let count=0;
 function visit(node,path='',depth=0){if(depth>4||!node||typeof node!=='object')return;for(const [key,v] of Object.entries(node)){
  if(count>=36)return;
  if(v!==null&&typeof v==='object'&&!Array.isArray(v)){visit(v,path?path+' · '+label(key):label(key),depth+1);continue;}
  if(Array.isArray(v))continue;
  const card=el('div','','wv-card');card.append(el('span',path?path+' · '+label(key):label(key)),el(finite(v)?'strong':'p',text(v)));grid.append(card);count++;
 }}
 visit(value);host.append(grid);if(!count)host.append(el('p','暂无可展示数据','wv-empty'));
}
function newsView(rows){
 const feed=el('div','','wv-feed'),opinionItems=[];for(const row of rows){
  const item=el('details','','wv-news'),summary=el('summary'),heading=el('strong',row.title||row.headline||row.name||'未提供标题'),meta=el('span',[row.source||row.publisher,row.published_at||row.publish_time||row.date].filter(Boolean).join(' · '));summary.append(heading,meta);item.append(summary);
  const body=el('div','','wv-news-body');for(const [key,name] of [['summary','摘要'],['core_facts','核心事实'],['analysis','来源解读'],['content','正文'],['text','正文']])if(row[key]){const section=el('section');section.append(el('h4',name),el('p',typeof row[key]==='object'?JSON.stringify(row[key]):String(row[key])));body.append(section);}
  if(!body.children.length)body.append(el('p','该条目未提供正文或摘要。'));
  const url=safeLink(row.url||row.link||row.source_url||row.pdf_url);if(url){const link=el('a','查看原文 ↗');link.href=url;link.target='_blank';link.rel='noopener noreferrer';body.append(link);}
  const info=addOpinionLabels(row,summary,body);opinionItems.push({node:item,info});item.append(body);feed.append(item);
 }const host=el('section'),search=el('input');search.placeholder='搜索资讯标题、来源和摘要';search.setAttribute('aria-label','搜索资讯');host.append(search,feed);installOpinionFilters(host,feed,search,opinionItems);return host;
}
function chartView(rows,kind){
 const host=el('section','','wv-chart'),keys=numericKeys(rows),select=el('select'),control=el('label','图表指标');select.setAttribute('aria-label','图表指标');
 for(const key of keys){const option=el('option',label(key));option.value=key;select.append(option);}
 const preferred=keys.find(k=>/net_inflow|net_flow|main_net|close|nav|revenue|market_value|remaining|equity|value/.test(k));if(preferred)select.value=preferred;
 const graphic=svgNode('svg',{viewBox:'0 0 760 270',role:'img',tabindex:0}),readout=el('p','','wv-chart-readout');readout.setAttribute('role','status');
 let visibleRows=rows.slice(0,160),active=0;const windowLabel=el('label','图表范围'),windowSlider=el('input'),windowText=el('span');windowSlider.type='range';windowSlider.min='0';windowSlider.max=String(Math.max(0,rows.length-160));windowSlider.value='0';windowSlider.setAttribute('aria-label','图表范围');windowLabel.append(windowSlider,windowText);windowLabel.hidden=rows.length<=160;
 const timeKey=Object.keys(rows[0]||{}).find(k=>/^(date|trade_date|report_date|datetime|time|period)$/.test(k));
 if(timeKey&&visibleRows.every(r=>typeof r[timeKey]==='string'&&/^\d{4}-\d{2}-\d{2}/.test(r[timeKey])))visibleRows.sort((a,b)=>String(a[timeKey]).localeCompare(String(b[timeKey])));
 const category=r=>text(r[timeKey]??r.name??r.symbol??r.code??r.indicator??r.metric??'');
 function draw(){
  graphic.replaceChildren();const key=select.value,values=visibleRows.map(r=>r[key]).filter(finite);if(!values.length)return;
  const bars=kind==='flow'||!timeKey,lo=Math.min(...values,bars?0:Infinity),hi=Math.max(...values,bars?0:-Infinity),span=hi-lo||Math.max(Math.abs(hi)*.05,1),x=i=>65+i*665/Math.max(1,visibleRows.length-1),y=v=>220-(v-lo)/span*190;
  for(let i=0;i<=4;i++){const v=lo+span*i/4,yy=y(v);graphic.append(svgNode('line',{x1:65,y1:yy,x2:735,y2:yy,stroke:'#e5e7e5'}));const tick=svgNode('text',{x:58,y:yy+4,'text-anchor':'end',fill:'#727873','font-size':11});tick.textContent=Number(v.toPrecision(4)).toLocaleString();graphic.append(tick);}
  let segment=[];const flush=()=>{if(segment.length)graphic.append(svgNode('polyline',{points:segment.join(' '),fill:'none',stroke:'#607e83','stroke-width':2}));segment=[];};
  visibleRows.forEach((r,i)=>{const v=r[key];if(!finite(v)){flush();return;}if(bars){const width=Math.min(32,600/visibleRows.length);graphic.append(svgNode('rect',{x:x(i)-width/2,y:Math.min(y(0),y(v)),width,height:Math.max(1,Math.abs(y(v)-y(0))),fill:v<0?'#769482':'#ad7671'}));}else{segment.push(x(i)+','+y(v));graphic.append(svgNode('circle',{cx:x(i),cy:y(v),r:2,fill:'#607e83'}));}});flush();
  for(const i of [...new Set([0,Math.floor((visibleRows.length-1)/2),visibleRows.length-1])]){const tick=svgNode('text',{x:x(i),y:247,'text-anchor':i===0?'start':i===visibleRows.length-1?'end':'middle',fill:'#727873','font-size':11});tick.textContent=category(visibleRows[i]).slice(0,20);graphic.append(tick);}
  graphic.setAttribute('aria-label',label(key)+(timeKey?'趋势图':'对比图'));active=Math.min(active,visibleRows.length-1);show(active);
 }
 function show(index){active=index;const row=visibleRows[index];readout.textContent=category(row)+' · '+label(select.value)+' '+text(row[select.value])+(row.unit?' '+row.unit:'');graphic.querySelector('.wv-crosshair')?.remove();graphic.append(svgNode('line',{class:'wv-crosshair',x1:65+index*665/Math.max(1,visibleRows.length-1),x2:65+index*665/Math.max(1,visibleRows.length-1),y1:25,y2:225,stroke:'#a1aaa4','stroke-dasharray':'4 4'}));}
 graphic.onpointermove=e=>{const rect=graphic.getBoundingClientRect();show(Math.max(0,Math.min(visibleRows.length-1,Math.round(((e.clientX-rect.left)/rect.width*760-65)/665*(visibleRows.length-1)))));};
 graphic.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();show(Math.max(0,Math.min(visibleRows.length-1,active+(e.key==='ArrowRight'?1:-1))));}};
 windowSlider.oninput=()=>{const start=Number(windowSlider.value);visibleRows=rows.slice(start,start+160);active=0;windowText.textContent=(start+1)+'–'+Math.min(rows.length,start+160)+' / '+rows.length;draw();};windowText.textContent='1–'+visibleRows.length+' / '+rows.length;
 select.onchange=draw;control.append(select);host.append(control,windowLabel,graphic,readout);draw();return host;
}
function quotaView(rows){
 const list=el('div','','wv-quotas');for(const row of rows){const remaining=row.remaining??row.remaining_points,total=row.total??row.limit??row.total_points;const card=el('section','','wv-quota');card.append(el('strong',row.name||row.pool||row.key||'额度池'));
  card.append(el('p',text(remaining)+' / '+text(total)));if(finite(remaining)&&finite(total)&&total>0){const meter=el('meter');meter.min=0;meter.max=total;meter.value=Math.min(total,Math.max(0,remaining));meter.setAttribute('aria-label',String(row.name||row.pool||'额度池')+'剩余额度');card.append(meter);}list.append(card);
 }return list;
}
function quotaRows(value){
 const found=[];function visit(node,path='',depth=0){if(depth>6||!node||typeof node!=='object')return;
  if(!Array.isArray(node)&&('remaining' in node||'remaining_points' in node||('limit' in node&&'used' in node))){const total=node.total??node.limit??node.total_points,remaining=node.remaining??node.remaining_points??(finite(total)&&finite(node.used)?total-node.used:null);found.push({...node,name:node.label||node.name||path,total,remaining});return;}
  for(const [key,child] of Object.entries(node))visit(child,key,depth+1);
 }visit(value);return found;
}
function holdingsView(rows){
 const list=el('div','','wv-holdings');const key=['weight','market_value','amount'].find(k=>rows.some(r=>finite(r[k])));if(!key)return list;
 const valid=rows.filter(r=>finite(r[key])),scale=Math.max(1,...valid.map(r=>Math.abs(r[key])));
 for(const row of valid.slice(0,40)){const item=el('div','','wv-holding'),bar=el('span','','wv-bar');bar.style.width=Math.max(1,Math.abs(row[key])/scale*100)+'%';bar.style.background=row[key]<0?'#769482':'#929eaa';item.append(el('strong',row.name||row.symbol||row.code||'未命名持仓'),el('span',label(key)+' '+text(row[key])),bar);list.append(item);}return list;
}
function tableView(rows){
 const host=el('details','','wv-table'),summary=el('summary','明细数据'),tools=el('div','','wv-table-tools'),search=el('input'),sort=el('select'),direction=action('降序',()=>{descending=!descending;direction.textContent=descending?'降序':'升序';draw();}),pageLabel=el('span'),previous=action('上一页',()=>{page--;draw();}),next=action('下一页',()=>{page++;draw();}),table=el('table');
 const keys=[...new Set(rows.slice(0,500).flatMap(Object.keys))].slice(0,40);let page=0,descending=true;
 search.placeholder='搜索明细';search.setAttribute('aria-label','搜索明细');sort.setAttribute('aria-label','明细排序');const original=el('option','返回顺序');original.value='';sort.append(original);for(const key of keys){const option=el('option',label(key));option.value=key;sort.append(option);}
 const wrap=el('div','','wv-table-scroll');wrap.append(table);tools.append(search,sort,direction,previous,pageLabel,next);host.append(summary,tools,wrap);
 function draw(){const q=search.value.trim().toLowerCase(),filtered=rows.filter(row=>Object.values(row).some(value=>text(value).toLowerCase().includes(q)));if(sort.value)filtered.sort((a,b)=>{const av=a[sort.value],bv=b[sort.value];if(av==null)return bv==null?0:1;if(bv==null)return -1;return (finite(av)&&finite(bv)?av-bv:String(av).localeCompare(String(bv)))*(descending?-1:1);});page=Math.max(0,Math.min(page,Math.ceil(filtered.length/25)-1));pageLabel.textContent=(page+1)+' / '+Math.max(1,Math.ceil(filtered.length/25))+' · '+filtered.length+' 条';previous.disabled=page===0;next.disabled=(page+1)*25>=filtered.length;
  const head=el('thead'),tr=el('tr'),body=el('tbody');keys.forEach(key=>tr.append(el('th',label(key))));head.append(tr);for(const row of filtered.slice(page*25,page*25+25)){const tr=el('tr');keys.forEach(key=>tr.append(el('td',text(row[key]))));body.append(tr);}table.replaceChildren(head,body);
 }search.oninput=sort.onchange=()=>{page=0;draw();};draw();return host;
}
export function renderWealthVisuals(result,operation={}){
 const host=el('div','','wealth-result wv-result'),payload=unpackWealth(result.data),sets=datasetsFrom(payload),content=el('section','','wv-content');
 if(/entitlement/.test(operation.id||'')){const quotas=quotaRows(payload);if(quotas.length)sets.unshift({name:'能力额度',rows:quotas});}
 host.append(el('p',[result.retrievedAt,result.source].filter(Boolean).join(' · '),'wv-provenance'));
 const kind=/news|announcement|research|library/.test(operation.id||'')?'news':/money.flow/.test(operation.id||'')?'flow':/portfolio/.test(operation.id||'')?'portfolio':'data';
 function show(set){content.replaceChildren();if(!set){readable(content,payload);return;}const rows=set.rows,keys=numericKeys(rows),isNews=kind==='news'&&rows.some(r=>r.title||r.headline),isQuota=rows.some(r=>r.remaining!==undefined||r.remaining_points!==undefined);
  const stats=el('div','','wv-cards'),card=el('div','','wv-card');card.append(el('span','返回记录'),el('strong',String(rows.length)));stats.append(card);
  for(const key of keys.slice(0,3)){const available=rows.filter(r=>finite(r[key]));if(!available.length)continue;const card=el('div','','wv-card');card.append(el('span',label(key)+' · 返回末条'),el('strong',text(available.at(-1)[key])));stats.append(card);}content.append(stats);
  if(isNews)content.append(newsView(rows));else if(isQuota)content.append(quotaView(rows));else{if(kind==='portfolio')content.append(holdingsView(rows));if(keys.length)content.append(chartView(rows,kind));if(!keys.length)readable(content,rows[0]);}
  content.append(tableView(rows));
 }
 if(sets.length>1){const select=el('select');select.setAttribute('aria-label','数据分组');for(const [i,set] of sets.entries()){const option=el('option',set.name+' · '+set.rows.length+' 条');option.value=String(i);select.append(option);}select.onchange=()=>show(sets[Number(select.value)]);host.append(select);}
 host.append(content);show(sets[0]);
 const raw=el('details');raw.append(el('summary','完整数据'),el('pre',JSON.stringify(result.data,null,2)));host.append(raw);
 host.append(action('导出 JSON',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download='anke-wealth-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));return host;
}
