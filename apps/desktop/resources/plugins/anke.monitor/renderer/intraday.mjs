const zh=document.documentElement.lang.startsWith('zh');
export function installIntraday(container){
 const panel=document.createElement('details');panel.className='market-tools';panel.id='intraday';
 const title=document.createElement('summary');title.textContent=zh?'当日分时':'Intraday';
 const refresh=document.createElement('button');refresh.id='intradayRefresh';refresh.textContent=zh?'刷新分时':'Refresh intraday';
 const status=document.createElement('p');status.id='intradayStatus';status.setAttribute('role','status');
 const canvas=document.createElement('canvas');canvas.id='intradayChart';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',zh?'分时价格与逐笔时段成交量':'Intraday price and interval volume');
 const readout=document.createElement('p');readout.id='intradayReadout';
 panel.append(title,refresh,status,canvas,readout);container.append(panel);
 let code,revision=0,data,hover=null,active=true,replaying=false;
 function draw(){
  const width=canvas.clientWidth||800,height=260,ratio=devicePixelRatio||1;canvas.width=width*ratio;canvas.height=height*ratio;
  const c=canvas.getContext('2d');c.scale(ratio,ratio);c.clearRect(0,0,width,height);if(!data)return;
  const points=data.points,pad=50,w=Math.max(1,width-pad-18),prices=points.map(p=>p.price);if(data.previousClose)prices.push(data.previousClose);
  let min=Math.min(...prices),max=Math.max(...prices);const range=max-min||max*.01;min-=range*.08;max+=range*.08;
  const minutes=time=>Number(time.slice(0,2))*60+Number(time.slice(3)),first=minutes(points[0].time),last=minutes(points.at(-1).time),x=p=>pad+(minutes(p.time)-first)/Math.max(1,last-first)*w,y=p=>16+(max-p)/(max-min)*158;
  c.font='11px system-ui';c.fillStyle='#727b74';c.strokeStyle='#e7eae4';
  for(let i=0;i<4;i++){const price=min+(max-min)*i/3,yy=y(price);c.fillText(price.toFixed(2),2,yy+4);c.beginPath();c.moveTo(pad,yy);c.lineTo(width-12,yy);c.stroke();}
  if(data.previousClose){c.setLineDash([4,4]);c.strokeStyle='#a59b89';c.beginPath();c.moveTo(pad,y(data.previousClose));c.lineTo(width-12,y(data.previousClose));c.stroke();c.setLineDash([]);}
  c.strokeStyle='#667e76';c.lineWidth=1.5;c.beginPath();points.forEach((p,i)=>i?c.lineTo(x(p),y(p.price)):c.moveTo(x(p),y(p.price)));c.stroke();
  const vmax=Math.max(1,...points.map(p=>p.volume));c.fillStyle='#b8c6bd';for(const p of points){const h=p.volume/vmax*45;c.fillRect(x(p)-1,235-h,2,h);}
  c.fillStyle='#727b74';c.fillText(points[0].time,pad,255);c.fillText(points.at(-1).time,width-50,255);
  const p=points[hover??points.length-1];readout.textContent=`${data.date} ${p.time} · ${zh?'价格':'Price'} ${p.price.toFixed(2)} · ${zh?'时段成交量':'Interval volume'} ${p.volume} ${zh?'手':'lots'}`;
  if(hover!==null){c.strokeStyle='#8c948d';c.beginPath();c.moveTo(x(p),12);c.lineTo(x(p),235);c.stroke();}
 }
 async function load(){if(!code||!active||!panel.open||replaying)return;const current=++revision,requested=code;data=null;hover=null;readout.textContent='';draw();status.textContent=zh?'正在加载分时':'Loading intraday';refresh.disabled=true;
  try{const value=await window.pluginBridge.invoke('monitor.intraday',{code:requested});if(current!==revision||!active||!panel.open)return;if(value.code!==requested||!value.points?.length)throw Error(zh?'分时行情无效':'Invalid intraday data');data=value;status.textContent=`${value.source} · ${value.date} · ${value.points.at(-1).time} · ${value.points.length} ${zh?'个观测点':'observations'}`;draw();}
  catch(e){if(current===revision)status.textContent=e.message;}finally{if(current===revision)refresh.disabled=false;}
 }
 panel.ontoggle=()=>{if(panel.open)void load();else{++revision;data=null;readout.textContent='';refresh.disabled=false;draw();}};refresh.onclick=()=>void load();
 canvas.onpointermove=e=>{if(!data)return;const rect=canvas.getBoundingClientRect(),fraction=Math.max(0,Math.min(1,(e.clientX-rect.left-50)/Math.max(1,rect.width-68))),minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3)),start=minutes(data.points[0].time),target=start+fraction*(minutes(data.points.at(-1).time)-start);hover=data.points.reduce((best,p,i)=>Math.abs(minutes(p.time)-target)<Math.abs(minutes(data.points[best].time)-target)?i:best,0);draw();};canvas.onpointerleave=()=>{hover=null;draw();};
 const observer=new ResizeObserver(draw);observer.observe(canvas);
 return {select(value){++revision;code=value;active=!!value;data=null;hover=null;readout.textContent='';status.textContent='';refresh.disabled=false;draw();void load();},replay(value){if(replaying===value)return;replaying=value;panel.hidden=value;++revision;refresh.disabled=false;if(value){data=null;readout.textContent='';status.textContent='';draw();}else void load();},active(value){active=value;++revision;refresh.disabled=false;if(value)void load();},dispose(){active=false;++revision;observer.disconnect();}};
}
