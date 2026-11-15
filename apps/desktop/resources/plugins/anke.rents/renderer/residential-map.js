(() => {
 const zh=document.documentElement.lang.startsWith('zh'),words=zh?{search:'查找住宅',placeholder:'住宅名称或完整地址',loading:'正在定位住宅',none:'没有找到匹配住宅，请补充名称或地址',choose:'请选择具体住宅',open:'打开住宅地图',street:'查看附近街景',failed:'住宅定位失败',title:'住宅定位'}:{search:'Find residence',placeholder:'Residence name or full address',loading:'Locating residence',none:'No matching residence. Refine the address',choose:'Select a residence',open:'Open residence map',street:'Nearby street view',failed:'Location failed',title:'Residence location'};
 const $=id=>document.getElementById(id),make=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const root=make('article');root.id='residentialResult';const form=make('form'),input=make('input'),submit=make('button',words.search),status=make('p'),results=make('div'),frame=make('iframe');input.id='residentialQuery';input.placeholder=words.placeholder;input.setAttribute('aria-label',words.placeholder);submit.type='submit';form.append(input,submit);status.id='residentialStatus';status.setAttribute('role','status');frame.id='residentialFrame';frame.title=words.title;frame.referrerPolicy='no-referrer';frame.hidden=true;root.append(form,status,results,frame);$('locations').before(root);
 let revision=0,selected,activeUrl;
 const mapLabel=zh?'住宅地图':'Residence map',externalLabel=zh?'在浏览器打开':'Open in browser';
 function present(url,title){activeUrl=url;frame.title=title;frame.src=url;frame.hidden=false;}
 function showTab(){document.querySelectorAll('.page').forEach(p=>p.hidden=p.id!=='map');document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab==='map'));document.querySelector('.filters').hidden=false;}
 async function open(candidate,current){
  if(current!==revision)return;
  ++revision;selected=candidate;
  results.replaceChildren(make('h3',candidate.project),make('p',candidate.address||'地址待核实'));
  const evidence=make('div');evidence.className='profile-summary';for(const text of [candidate.district||'行政区待核实',candidate.source||'定位来源待核实',candidate.location?`${candidate.location.longitude}, ${candidate.location.latitude} · ${candidate.location.crs||'坐标系待核实'}`:'坐标待核实'])evidence.append(make('span',text));results.append(evidence);
  const map=make('button',mapLabel),street=make('button',words.street),external=make('button',externalLabel);
  function mode(button){for(const b of [map,street]){b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));}}
  map.onclick=()=>{++revision;status.textContent='';present(candidate.mapUrl,candidate.project+' · '+mapLabel);mode(map);};
  street.onclick=async()=>{
   const check=++revision;status.textContent=words.loading;
   try{
    let target=candidate;
    if(target.location.crs!=='BD09MC'){
     const d=await window.pluginBridge.invoke('rents.locate',{project:target.project,district:target.district,address:target.address});
     if(check!==revision)return;
     target=d.results.find(r=>r.id===d.selected);if(!target)throw Error(words.choose);
    }
    const d=await window.pluginBridge.invoke('rents.street',target);
    if(check!==revision)return;
    present(d.url,candidate.project+' · '+words.street);mode(street);status.textContent=d.road||'';
   }catch(e){if(check===revision)status.textContent=e.message;}
  };
  external.onclick=()=>{const check=revision;void window.pluginBridge.invoke('rents.openMap',{url:activeUrl}).catch(e=>{if(check===revision)status.textContent=e.message;});};
  results.append(map,street,external);status.textContent='';present(candidate.mapUrl,candidate.project+' · '+mapLabel);mode(map);
 }
 async function locate(home){showTab();const current=++revision;selected=null;frame.hidden=true;frame.removeAttribute('src');results.replaceChildren();status.textContent=words.loading;input.value=home.project||'';try{const data=await window.pluginBridge.invoke('rents.locate',home);if(current!==revision)return;const target=data.results.find(r=>r.id===data.selected&&r.exact);if(target){await open(target,current);return;}status.textContent=data.results.length?words.choose:words.none;for(const c of data.results){const b=make('button',c.project+' · '+c.address);b.onclick=()=>{if(current!==revision)return;window.dispatchEvent(new CustomEvent('anke:residence-selected',{detail:{home,candidate:c}}));void open(c,current);};results.append(b);}}catch(e){if(current===revision)status.textContent=e.message||words.failed;}}
 form.onsubmit=e=>{e.preventDefault();void locate({project:input.value,district:$('district').value});};
 window.locateResidence=locate;
 $('mapOpen').onclick=()=>{if(selected)void window.pluginBridge.invoke('rents.openMap',{url:activeUrl}).catch(e=>status.textContent=e.message);else{showTab();input.focus();}};
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.tab!=='map'){++revision;frame.hidden=true;frame.removeAttribute('src');}else if(selected){present(activeUrl,frame.title);}}));
 window.addEventListener('pagehide',()=>{++revision;frame.removeAttribute('src');});
})();
