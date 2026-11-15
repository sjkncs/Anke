export function rentBands(market){
 const reference=market?.unitRentMedian;
 if(!Number.isFinite(reference)||reference<=0)return [];
 return (market.districts||[]).filter(d=>Number.isFinite(d.unitRentMedian)&&d.unitRentMedian>0&&d.count>0).map(d=>({
  ...d,name:d.name||'区县待核实',relative:(d.unitRentMedian/reference-1)*100,
  tone:d.unitRentMedian>reference*1.005?'higher':d.unitRentMedian<reference*.995?'lower':'neutral'
 }));
}
export function renderRentBands(container,market){
 container.replaceChildren();const bands=rentBands(market);if(!bands.length)return;
 const head=document.createElement('div');head.className='rent-band-head';head.textContent='片区租金 · 相对当前样本中位数';
 const legend=document.createElement('div');legend.className='rent-legend';legend.textContent='红 高于基准　绿 低于基准　灰 接近基准';container.append(head,legend);
 const grid=document.createElement('div');grid.className='rent-heatmap';
 for(const band of bands){const card=document.createElement('div');card.className='rent-cell '+band.tone;
  for(const text of [band.name,band.unitRentMedian.toFixed(2)+' 元/㎡·月',(band.relative>=0?'+':'')+band.relative.toFixed(1)+'% · '+band.count+' 条']){const line=document.createElement('span');line.textContent=text;card.append(line);}grid.append(card);
 }container.append(grid);
}
