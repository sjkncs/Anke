export function eventTimeline(events) {
  const counts=new Map();
  for(const event of events){const day=String(event.publishedAt||event.published||'').slice(0,10);if(/^\d{4}-\d{2}-\d{2}$/.test(day))counts.set(day,(counts.get(day)||0)+1);}
  return [...counts].sort(([a],[b])=>a.localeCompare(b)).slice(-14);
}
export function installDashboard() {
  const make=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;return n;};
  const dashboard=document.querySelector('.dashboard'),controls=make('details'),summary=make('summary','自定义看板');controls.className='dashboard-options';controls.append(summary);
  const panels=[...dashboard.querySelectorAll(':scope > .panel')];
  let hidden=[];try{const saved=JSON.parse(localStorage.getItem('anke.monitor.panels')||'[]');if(Array.isArray(saved))hidden=saved;}catch{}
  const trend=make('section');trend.className='panel timeline-panel';const head=make('div');head.className='panel-head';head.append(make('h2','消息时间线'));const chart=make('div');chart.className='event-timeline';trend.append(head,chart);dashboard.append(trend);panels.push(trend);
  panels.forEach(panel=>{
    const title=panel.querySelector('h1,h2')?.textContent||'看板',key=panel.classList[1],label=make('label'),input=make('input');input.type='checkbox';input.checked=!hidden.includes(key);panel.hidden=!input.checked;label.append(input,document.createTextNode(title));controls.append(label);
    input.onchange=()=>{panel.hidden=!input.checked;hidden=panels.filter(p=>p.hidden).map(p=>p.classList[1]);try{localStorage.setItem('anke.monitor.panels',JSON.stringify(hidden));}catch{}window.dispatchEvent(new Event('resize'));};
  });
  document.querySelector('main').insertBefore(controls,dashboard);
  return {render(events){const timeline=eventTimeline(events),max=Math.max(1,...timeline.map(([,count])=>count));chart.replaceChildren(...timeline.map(([day,count])=>{const column=make('div'),bar=make('div');column.className='timeline-column';bar.className='timeline-bar';bar.style.height=(count/max*100)+'px';column.title=day+' · '+count+' 条';column.append(make('strong',count),bar,make('span',day.slice(5)));return column;}));if(!timeline.length)chart.append(make('span','暂无带发布日期的消息'));}};
}
