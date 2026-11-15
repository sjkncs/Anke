(() => {
 const style=document.createElement('style');style.textContent='.anke-ai-launch{display:inline-flex;align-items:center;gap:7px;font:inherit;font-size:13px;padding:7px 12px;border:1px solid #ddd;border-radius:9px;background:var(--background,#fff);color:inherit;cursor:pointer;margin:0 0 14px 12px}.anke-ai-launch:hover{background:#f4f4f4}.anke-ai-star{width:19px;height:19px;display:inline-block;background:conic-gradient(#4785ff,#8665e8,#ed6774,#f8bb44,#63bb8c,#4785ff);clip-path:polygon(50% 0,65% 35%,100% 50%,65% 65%,50% 100%,35% 65%,0 50%,35% 35%)}.anke-ai-dialog{width:min(820px,94vw);max-height:85vh;box-sizing:border-box;border:1px solid #ddd;border-radius:16px;padding:24px;color:var(--foreground,#242424);background:var(--background,#fff)}.anke-ai-dialog::backdrop{background:#0005}.anke-ai-dialog header{display:flex;gap:12px;align-items:center;justify-content:space-between;background:none;padding:0 0 16px;border-bottom:1px solid #eee}.anke-ai-dialog h2{font-size:18px;margin:0}.anke-ai-dialog select,.anke-ai-dialog button{font:inherit;font-size:13px;border:1px solid #ddd;border-radius:8px;padding:7px 12px;background:transparent;color:inherit}.anke-ai-answer{white-space:pre-wrap;line-height:1.85;font-size:15px;margin-top:20px}.anke-ai-status{color:#666;font-size:13px;margin-top:12px}';document.head.append(style);
 const labels=Object.fromEntries([...document.querySelectorAll('#tabs [data-tab]')].map(b=>[b.dataset.tab,b.textContent]));
 function launch(section){
  document.querySelector('.anke-ai-dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.className='anke-ai-dialog';dialog.setAttribute('aria-label','AI解读');
  const header=document.createElement('header'),title=document.createElement('h2');title.textContent=(labels[section.id]||'住房')+' · AI解读';
  const close=document.createElement('button');close.textContent='关闭';close.onclick=()=>dialog.close();header.append(title,close);
  const select=document.createElement('select');select.setAttribute('aria-label','解读模型');
  const start=document.createElement('button');start.textContent='开始解读';start.disabled=true;
  const status=document.createElement('p');status.className='anke-ai-status';status.setAttribute('role','status');status.textContent='正在读取可用模型…';
  const answer=document.createElement('div');answer.className='anke-ai-answer';answer.setAttribute('aria-live','polite');
  dialog.append(header,select,start,status,answer);document.body.append(dialog);dialog.showModal();dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  window.pluginBridge.invoke('rents.analyze',{module:section.id,action:'models'}).then(result=>{
   for(const m of result.models){const option=document.createElement('option');option.value=m.key;option.textContent=m.label||m.modelId;if(m.isDefault)option.selected=true;select.append(option);}
   start.disabled=!select.options.length;status.textContent=select.options.length?'点击开始后调用所选模型解读当前页面。':'请在设置中配置模型后重试。';
  }).catch(error=>{select.hidden=true;const message=String(error.message||error);status.textContent=/Unsupported.*channel|Unsupported.*operation|不支持/i.test(message)?'请在ANKE桌面端打开本页并配置模型后使用AI解读。':'模型列表读取失败：'+message;});
  start.onclick=async()=>{
   start.disabled=true;select.disabled=true;status.textContent='正在解读…';
   const filters=[...document.querySelectorAll('main input,main select')].filter(e=>e.offsetParent&&e.type!=='file').map(e=>({name:e.getAttribute('aria-label')||e.id,value:e.value}));
   try{const result=await window.pluginBridge.invoke('rents.analyze',{module:section.id,modelKey:select.value,context:JSON.stringify({text:section.innerText.slice(0,13000),filters})});if(dialog.isConnected){answer.textContent=result.text;status.textContent='已完成 · '+new Date(result.generatedAt).toLocaleString();}}
   catch(error){if(dialog.isConnected)status.textContent='解读未完成：'+String(error.message||error);}
   finally{start.disabled=false;select.disabled=false;}
  };
 }
 for(const section of document.querySelectorAll('section.page')){
  const button=document.createElement('button');button.type='button';button.className='anke-ai-launch';button.setAttribute('aria-label',(labels[section.id]||section.id)+' AI解读');
  const star=document.createElement('span');star.className='anke-ai-star';star.setAttribute('aria-hidden','true');button.append(star,document.createTextNode('AI解读'));button.onclick=()=>launch(section);section.prepend(button);
 }
})();
