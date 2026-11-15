export function renderStockFacts(container,row){
 const format=(value,suffix='')=>typeof value==='number'&&Number.isFinite(value)?value.toLocaleString('zh-CN',{maximumFractionDigits:2})+suffix:'—';
 const groups=[['行情',[
  ['最新价',format(row.price)],['涨跌幅',format(row.pct,'%')],['昨收',format(row.previousClose)],['今开',format(row.open)],['最高',format(row.high)],['最低',format(row.low)],['成交额',format(row.amount==null?null:row.amount/1e8,' 亿')],['换手率',format(row.turnover,'%')]
 ]],['估值与股本',[
  ['总市值',format(row.marketCap==null?null:row.marketCap/1e8,' 亿')],['流通市值',format(row.floatCap==null?null:row.floatCap/1e8,' 亿')],['市盈率',format(row.pe)],['市净率',format(row.pb)],['量比',format(row.volumeRatio)],['行业',row.industry||'—']
 ]],['价格限幅',[
  ['涨停价',format(row.upLimit)],['跌停价',format(row.downLimit)],['涨停状态',row.atUp==null?'—':row.atUp?'已触及':'未触及'],['跌停状态',row.atDown==null?'—':row.atDown?'已触及':'未触及']
 ]]];
 container.replaceChildren(...groups.map(([title,items])=>{
  const section=document.createElement('section'),heading=document.createElement('h3'),grid=document.createElement('dl');heading.textContent=title;
  for(const [label,value] of items){const item=document.createElement('div'),term=document.createElement('dt'),description=document.createElement('dd');term.textContent=label;description.textContent=value;item.append(term,description);grid.append(item);}
  section.append(heading,grid);return section;
 }));
}
