const messages={zh:{style:'图表样式',candles:'蜡烛图',line:'收盘线',overlay:'主图指标',none:'无叠加',period:'指标周期',indicator:'副图指标',tool:'绘图工具',pan:'平移',horizontal:'水平线',trend:'趋势线（点击两点）',clear:'清除画线',drawings:'画线',replay:'历史回放',step:'下一根',play:'播放',pause:'暂停',exit:'返回最新',position:'回放位置',open:'中际旭创 · 专业图表'},en:{style:'Chart style',candles:'Candles',line:'Close line',overlay:'Overlay',none:'None',period:'Indicator period',indicator:'Indicator',tool:'Drawing tool',pan:'Pan',horizontal:'Horizontal line',trend:'Trend line (two points)',clear:'Clear drawings',drawings:'Drawings',replay:'Replay',step:'Next bar',play:'Play',pause:'Pause',exit:'Latest',position:'Replay position',open:'Zhongji Innolight · Chart'}};
const t=key=>(messages[document.documentElement.lang.startsWith('zh')?'zh':'en'])[key];
export function installChartTools(container,chart){
 const make=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const toolbar=make('div');toolbar.className='chart-tools';
 const visibleRange=make('span');visibleRange.id='chartVisibleRange';visibleRange.setAttribute('aria-live','polite');const canvas=container.querySelector('canvas'),rangeObserver=new MutationObserver(()=>{visibleRange.textContent=canvas.dataset.visibleRange||'';});rangeObserver.observe(canvas,{attributes:true,attributeFilter:['data-visible-range']});toolbar.append(visibleRange);
 const zoomOut=make('button','−'),zoomIn=make('button','＋');zoomOut.type=zoomIn.type='button';zoomOut.setAttribute('aria-label','缩小图表');zoomIn.setAttribute('aria-label','放大图表');zoomOut.onclick=()=>chart.zoom(1.2);zoomIn.onclick=()=>chart.zoom(.8);toolbar.append(zoomOut,zoomIn);
 function select(id,label,items){const wrap=make('label',t(label)),input=make('select');input.id=id;input.setAttribute('aria-label',t(label));for(const [value,text] of items){const option=make('option',text);option.value=value;input.append(option);}wrap.append(input);toolbar.append(wrap);return input;}
 const style=select('chartStyle','style',[['candles',t('candles')],['line',t('line')]]),overlay=select('overlay','overlay',['MA','EMA','BOLL'].map(x=>[x,x]).concat([['none',t('none')]]));
 const label=make('label',t('period')),period=make('input');period.id='indicatorPeriod';period.type='number';period.min='2';period.max='120';period.value='20';period.setAttribute('aria-label',t('period'));label.append(period);toolbar.append(label);
 const indicator=select('indicator','indicator',['VOL','MACD','KDJ','RSI'].map(x=>[x,x]));
 const tool=select('drawingTool','tool',['pan','horizontal','trend'].map(x=>[x,t(x)]));
 function button(id,key){const n=make('button',t(key));n.id=id;toolbar.append(n);return n;}
 const clear=button('clearDrawings','clear'),count=make('span');toolbar.append(count);clear.onclick=()=>chart.clearDrawings();
 const configure=()=>{if(!period.checkValidity())return;chart.configure({style:style.value,overlay:overlay.value,indicator:indicator.value,period:Number(period.value),tool:tool.value});};
 for(const n of [style,overlay,period,indicator,tool])n.onchange=configure;
 const replay=button('replayStart','replay'),step=button('replayStep','step'),play=button('replayPlay','play'),exit=button('replayExit','exit'),slider=make('input'),date=make('span');slider.id='replayPosition';slider.type='range';slider.min='1';slider.setAttribute('aria-label',t('position'));toolbar.append(slider,date);
 let total=0,end=0,replaying=false,timer;
 function stop(){clearInterval(timer);timer=undefined;play.textContent=t('play');}
 function controls(){slider.hidden=!replaying;step.hidden=play.hidden=exit.hidden=!replaying;slider.max=String(total);slider.value=String(end);replay.disabled=total<2;date.textContent=replaying?`${end} / ${total} · ${date.dataset.date||''}`:'';}
 function advance(){if(end>=total){stop();return;}chart.setEnd(end+1);}
 replay.onclick=()=>{stop();replaying=true;chart.setEnd(Math.max(1,Math.floor(total*.6)));controls();};step.onclick=advance;
 play.onclick=()=>{if(timer){stop();return;}if(end>=total)return;play.textContent=t('pause');timer=setInterval(()=>{if(!document.hidden)advance();},700);};exit.onclick=()=>{stop();replaying=false;chart.setEnd(total);controls();};slider.oninput=()=>{stop();chart.setEnd(Number(slider.value));};
 container.querySelector('.ma-legend')?.remove();container.querySelector('#chartSource').before(toolbar);controls();
 return {state(value){end=value.end;total=value.total;count.textContent=t('drawings')+' '+value.drawings;date.dataset.date=value.date||'';controls();},startAt(index){stop();replaying=true;chart.setEnd(index);controls();},latest(){stop();replaying=false;chart.setEnd(total);controls();},reset(){stop();replaying=false;controls();},pause:stop,isReplaying:()=>replaying,exportEnd:()=>replaying?end:total,dispose(){stop();rangeObserver.disconnect();}};
}
export function addFeaturedStock(onOpen){const b=document.createElement('button');b.id='featuredStock';b.textContent=t('open');b.onclick=onOpen;document.querySelector('.intro').append(b);}
