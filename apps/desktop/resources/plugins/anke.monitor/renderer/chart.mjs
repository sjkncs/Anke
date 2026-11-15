import {overlays,macd,rsi,kdj} from './indicators.mjs';
export function movingAverage(bars, period) {
  let sum = 0;
  return bars.map((bar,i) => {sum += bar.close;if(i>=period)sum-=bars[i-period].close;return i>=period-1?sum/period:null;});
}
export function exportCSV(bars) {
  return 'date,open,high,low,close,volume\r\n'+bars.map(b=>[b.date,b.open,b.high,b.low,b.close,b.volume].join(',')).join('\r\n');
}
export function createChart(canvas, readout, onState=()=>{}) {
  let bars=[],count=80,end=0,ceiling=0,hover=-1,pointerY=null,drag,geometry,anchor,drawings=[];
  let settings={overlay:'MA',indicator:'VOL',style:'candles',period:20,tool:'pan'};
  const colors={up:'#a85f58',down:'#5d8069'};
  function draw(){
    const rect=canvas.getBoundingClientRect(),w=Math.max(320,rect.width),h=360,dpr=window.devicePixelRatio||1;
    canvas.width=w*dpr;canvas.height=h*dpr;const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
    if(!bars.length)return;
    const start=Math.max(0,end-count),visible=bars.slice(start,end),left=12,right=w-70,top=22,bottom=260,volumeBottom=325;
    const series=overlays(bars.slice(0,end),settings.overlay,settings.period),overlayValues=series.flatMap(s=>s.values.slice(start,end).filter(v=>v!=null));
    const low=Math.min(...visible.map(b=>b.low),...overlayValues),high=Math.max(...visible.map(b=>b.high),...overlayValues),pad=(high-low)*.07||Math.abs(high)*.01||.01;
    const y=value=>bottom-(value-low+pad)/(high-low+pad*2)*(bottom-top),step=(right-left)/visible.length;
    geometry={left,right,top,bottom,start,step,value:py=>low-pad+(bottom-py)/(bottom-top)*(high-low+pad*2)};
    ctx.font='11px system-ui';ctx.textBaseline='middle';
    for(let i=0;i<=4;i++){const value=low-pad+(high-low+pad*2)*i/4,py=y(value);ctx.strokeStyle='#e9ece8';ctx.beginPath();ctx.moveTo(left,py);ctx.lineTo(right,py);ctx.stroke();ctx.fillStyle='#7c847e';ctx.fillText(value.toFixed(2),right+8,py);}
    const maxVolume=Math.max(1,...visible.map(b=>b.volume));
    visible.forEach((b,i)=>{const x=left+(i+.5)*step;ctx.strokeStyle=ctx.fillStyle=b.close>=b.open?colors.up:colors.down;if(settings.style==='candles'){ctx.beginPath();ctx.moveTo(x,y(b.high));ctx.lineTo(x,y(b.low));ctx.stroke();ctx.fillRect(x-step*.3,Math.min(y(b.open),y(b.close)),Math.max(1,step*.6),Math.max(1,Math.abs(y(b.open)-y(b.close))));}if(settings.indicator==='VOL'){ctx.globalAlpha=.6;ctx.fillRect(x-step*.3,volumeBottom-b.volume/maxVolume*45,Math.max(1,step*.6),b.volume/maxVolume*45);ctx.globalAlpha=1;}});
    function line(values,color,project=y){ctx.strokeStyle=color;ctx.beginPath();let started=false;for(let i=start;i<end;i++){if(values[i]==null)continue;const x=left+(i-start+.5)*step;if(!started){ctx.moveTo(x,project(values[i]));started=true;}else ctx.lineTo(x,project(values[i]));}ctx.stroke();}
    if(settings.style==='line')line(bars.map(b=>b.close),'#667e87');
    for(const s of series)line(s.values,s.color);
    const prefix=bars.slice(0,end);
    let sub=[];
    if(settings.indicator==='MACD'){const m=macd(prefix.map(b=>b.close));sub=[m.dif,m.dea,m.histogram];}
    if(settings.indicator==='RSI')sub=[rsi(prefix.map(b=>b.close))];
    if(settings.indicator==='KDJ'){const k=kdj(prefix);sub=[k.k,k.d,k.j];}
    if(sub.length){const values=sub.flatMap(a=>a.slice(start,end).filter(v=>v!=null));const lo=Math.min(0,...values),hi=Math.max(settings.indicator==='RSI'?100:0,...values),sy=v=>325-(v-lo)/(hi-lo||1)*40;sub.forEach((a,i)=>{if(settings.indicator==='MACD'&&i===2){for(let j=start;j<end;j++){ctx.fillStyle=a[j]>=0?colors.up:colors.down;ctx.fillRect(left+(j-start+.2)*step,Math.min(sy(0),sy(a[j])),Math.max(1,step*.6),Math.max(1,Math.abs(sy(0)-sy(a[j]))));}}else line(a,['#b69a58','#7792ad','#9c829f'][i],sy);});}
    ctx.save();ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();ctx.strokeStyle='#687b91';ctx.setLineDash([5,3]);
    for(const item of drawings){if(item.a.index>=ceiling||item.b?.index>=ceiling)continue;ctx.beginPath();if(item.type==='horizontal'){ctx.moveTo(left,y(item.a.value));ctx.lineTo(right,y(item.a.value));}else{ctx.moveTo(left+(item.a.index-start+.5)*step,y(item.a.value));ctx.lineTo(left+(item.b.index-start+.5)*step,y(item.b.value));}ctx.stroke();}ctx.restore();
    ctx.fillStyle='#7c847e';ctx.fillText(visible[0].date,left,345);ctx.fillText(visible.at(-1).date,Math.max(left,right-72),345);ctx.fillText(settings.indicator==='VOL'?'成交量 / 手':settings.indicator,left,276);
    const index=hover>=start&&hover<end?hover:end-1,b=bars[index];
    const legend=series.map(s=>`${s.name||s.label||settings.overlay} ${s.values[index]==null?'—':s.values[index].toFixed(2)}`).join('　');
    const cursorValue=pointerY!=null&&pointerY>=top&&pointerY<=bottom?geometry.value(pointerY):b.close;
    readout.textContent=`${b.date}　开 ${b.open.toFixed(2)}　高 ${b.high.toFixed(2)}　低 ${b.low.toFixed(2)}　收 ${b.close.toFixed(2)}　量 ${b.volume.toLocaleString()} 手　${legend}`;
    canvas.dataset.visibleRange=`${visible[0].date} — ${visible.at(-1).date} · ${visible.length}/${ceiling} 根`;
    canvas.dataset.crosshair=JSON.stringify({date:b.date,price:cursorValue,index,visible:visible.length,indicators:series.map(s=>({name:s.name||s.label||settings.overlay,value:s.values[index]}))});
    if(hover>=start&&hover<end){const x=left+(hover-start+.5)*step,yy=y(cursorValue);ctx.strokeStyle='#9aa19b';ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,volumeBottom);ctx.moveTo(left,yy);ctx.lineTo(right,yy);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#39413d';ctx.fillRect(right,yy-10,69,20);ctx.fillRect(Math.max(left,Math.min(right-86,x-43)),332,86,20);ctx.fillStyle='#fff';ctx.fillText(cursorValue.toFixed(2),right+5,yy);ctx.fillText(b.date,Math.max(left,Math.min(right-86,x-43))+5,342);}
  }
  const observer=new ResizeObserver(draw);observer.observe(canvas);
  canvas.onpointermove=e=>{const rect=canvas.getBoundingClientRect(),width=rect.width-82;pointerY=(e.clientY-rect.top)*360/rect.height;if(drag){const shift=Math.round((drag.x-e.clientX)/width*count);end=Math.max(Math.min(count,ceiling),Math.min(ceiling,drag.end+shift));}else hover=Math.min(end-1,Math.max(0,Math.max(0,end-count)+Math.floor((e.clientX-rect.left-12)/width*Math.min(count,end))));draw();};
  canvas.onpointerleave=()=>{hover=-1;pointerY=null;draw();};
  canvas.onpointerdown=e=>{if(!bars.length||!geometry)return;const g=geometry;if(settings.tool!=='pan'){if(e.offsetY<g.top||e.offsetY>g.bottom)return;const point={index:Math.min(end-1,Math.max(g.start,g.start+Math.floor((e.offsetX-g.left)/g.step))),value:g.value(e.offsetY)};if(settings.tool==='horizontal')drawings.push({type:'horizontal',a:point});else if(anchor){drawings.push({type:'trend',a:anchor,b:point});anchor=null;}else anchor=point;draw();onState({end:ceiling,total:bars.length,drawings:drawings.length,date:bars[ceiling-1]?.date});return;}drag={x:e.clientX,end};canvas.setPointerCapture(e.pointerId);};
  canvas.onpointerup=()=>{drag=null;};canvas.onpointercancel=()=>{drag=null;};
  canvas.addEventListener('wheel',e=>{e.preventDefault();count=Math.min(320,Math.max(20,Math.round(count*(e.deltaY>0?1.2:.8))));draw();},{passive:false});
  function zoom(factor){count=Math.min(320,Math.max(20,Math.round(count*factor)));draw();}
  canvas.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','+','-','0'].includes(e.key))return;e.preventDefault();pointerY=null;if(e.key==='+'||e.key==='-')zoom(e.key==='+'?.8:1.2);else if(e.key==='0'){count=80;end=ceiling;hover=-1;}else{hover=Math.max(0,Math.min(ceiling-1,(hover<0?end-1:hover)+(e.key==='ArrowLeft'?-1:1)));if(hover<Math.max(0,end-count))end=Math.min(ceiling,hover+count);if(hover>=end)end=hover+1;}draw();};
  return {zoom,setBars(value){bars=value;end=ceiling=bars.length;hover=-1;pointerY=null;delete canvas.dataset.crosshair;delete canvas.dataset.visibleRange;drawings=[];anchor=null;draw();onState({end,total:bars.length,drawings:0,date:bars[end-1]?.date});},configure(value){settings={...settings,...value};anchor=null;draw();},setEnd(value){end=ceiling=Math.max(1,Math.min(bars.length,value));hover=-1;pointerY=null;draw();onState({end,total:bars.length,drawings:drawings.length,date:bars[end-1]?.date});},clearDrawings(){drawings=[];anchor=null;draw();onState({end:ceiling,total:bars.length,drawings:0,date:bars[ceiling-1]?.date});},reset(){count=80;end=ceiling;hover=-1;pointerY=null;draw();},dispose(){observer.disconnect();}};
}
