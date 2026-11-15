(() => {
 const style=document.createElement('style');
 style.textContent='#eventTable .event-tone-positive{color:#b4232c!important}#eventTable .event-tone-other{color:#247347!important}.event-tone-label{display:block;font-size:12px;margin:5px 0;font-weight:600}#eventTable .event-tone-explanation{font-size:12px;color:var(--muted,#666);margin:8px 0}.event-sources{display:none!important}';
 document.head.append(style);
 const readerStyle=document.createElement('style');
 readerStyle.textContent='.event-reader{box-sizing:border-box;width:min(1100px,94vw);max-height:90vh;padding:0;border:1px solid #ddd;border-radius:16px;background:var(--background,#fff);color:var(--foreground,#242424);box-shadow:0 20px 80px #0003}.event-reader::backdrop{background:#0005}.event-reader-header{position:sticky;top:0;display:flex;gap:20px;align-items:flex-start;justify-content:space-between;padding:24px 32px;background:inherit;border-bottom:1px solid #e6e6e6;z-index:1}.event-reader h2{font-size:20px;line-height:1.5;margin:0}.event-reader button{flex:none;border:1px solid #ddd;border-radius:8px;background:transparent;color:inherit;padding:7px 14px;cursor:pointer}.event-reader-content{max-width:840px;margin:auto;padding:24px 32px 40px;font-size:16px;line-height:1.9;overflow-wrap:anywhere}.event-reader-content p{margin:0 0 1.1em;white-space:pre-wrap}.event-reader-content h3{font-size:17px;margin:1.7em 0 .7em;line-height:1.6}.event-reader-content ul,.event-reader-content ol{padding-left:1.6em;margin:0 0 1.2em}.event-reader-content li{margin:.55em 0}.event-reader-meta{border-top:1px solid #e5e5e5;padding-top:20px;margin-top:30px;font-size:13px;color:#666}.event-reader-launch{display:block;margin:8px 0;border:0;background:transparent;color:inherit;padding:2px 0;cursor:pointer;text-decoration:underline;text-underline-offset:4px}@media(max-width:600px){.event-reader-header,.event-reader-content{padding:18px}.event-reader{width:96vw}}';
 document.head.append(readerStyle);
 // Build semantic HTML with textContent only; source HTML/scripts never execute.
 function renderArticle(target,text){
  const lines=String(text).replace(/\r\n?/g,'\n').split(/\n+/).map(s=>s.trim()).filter(Boolean);
  for(let line of lines){
   line=line.replace(/^#{1,6}\s+/,'').replace(/\*\*([^*]+)\*\*/g,'$1');
   const heading=/^(?:[一二三四五六七八九十]+[、．.]|[（(][一二三四五六七八九十]+[）)])/;
   const item=line.match(/^\s*(?:[-*+]\s+|\d+[.)、]\s*)(.*)$/);
   const tag=heading.test(line)&&line.length<100?'h3':item?'li':'p';
   const node=document.createElement(tag);highlight(node,item?item[1]:line);
   if(item){let list=target.lastElementChild;if(list?.tagName!=='UL'){list=document.createElement('ul');target.append(list);}list.append(node);}else target.append(node);
  }
 }
 function highlight(node,text){
  // Highlight literal source spans only; never rewrite amounts or infer deadlines.
  const pattern=/(?:\d{4}年\d{1,2}月\d{1,2}日(?:\s*\d{1,2}[:：]\d{2})?|\d{4}-\d{2}-\d{2}|\d+(?:\.\d+)?\s*(?:万元|元\/平方米\/月|元\/㎡\/月|元|%|％)|申请条件|申请资格|截止时间|受理时间|申请时间|租金标准|优先保障|不得申请|不符合条件)/g;
  let end=0;for(const match of text.matchAll(pattern)){node.append(document.createTextNode(text.slice(end,match.index)));const strong=document.createElement('strong');strong.textContent=match[0];if(/时间|截止|不得|不符合|年.*月.*日/.test(match[0]))strong.style.color='#b4232c';node.append(strong);end=match.index+match[0].length;}node.append(document.createTextNode(text.slice(end)));
 }
 function openReader({title,body,details,sourceUrl}){
  const previous=document.querySelector('.event-reader');previous?.close();previous?.remove();
  const dialog=document.createElement('dialog');dialog.className='event-reader';dialog.setAttribute('aria-label',title);
  const header=document.createElement('div');header.className='event-reader-header';const h=document.createElement('h2');h.textContent=title;
  const close=document.createElement('button');close.textContent='关闭';close.onclick=()=>dialog.close();header.append(h,close);
  const content=document.createElement('article');content.className='event-reader-content';renderArticle(content,body);
  const meta=document.createElement('footer');meta.className='event-reader-meta';
  for(const node of [...details.querySelectorAll('p')].slice(1)){const p=document.createElement('p');p.textContent=node.textContent;meta.append(p);}
  if(sourceUrl){try{const url=new URL(sourceUrl);if(url.protocol==='https:'){const a=document.createElement('a');a.href=url.href;a.textContent='查看原文';a.target='_blank';a.rel='noopener noreferrer';meta.append(a);}}catch{}}
  content.append(meta);dialog.append(header,content);document.body.append(dialog);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.showModal();
 }
 const table=document.getElementById('eventTable'),provenance=document.getElementById('rentProvenance');
 function present(){
  if(provenance)for(const item of provenance.querySelectorAll('.source-badge')){
   if(/\s·\s\d+\s条$/.test(item.textContent))item.textContent=item.textContent.replace(/\s·\s\d+\s条$/,'');
  }
  for(const row of table?.querySelectorAll('tbody tr')||[]){
   row.lastElementChild?.querySelector('a')?.classList.remove('source-badge');
   const cell=row.firstElementChild;if(!cell||cell.dataset.toneReady)continue;
   const title=[...cell.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' ');
   const excerpt=cell.querySelector('details p')?.textContent||'';
   const result=window.ankeEventTone.analyze(title+'。'+excerpt);
   cell.dataset.toneReady='true';row.dataset.polarity=result.polarity;
   const color=result.polarity==='positive'?'event-tone-positive':'event-tone-other';
   // Color the headline and label; retain ordinary source/date contrast.
   const headline=document.createElement('span');headline.className=color;headline.textContent=title;
   for(const n of [...cell.childNodes])if(n.nodeType===Node.TEXT_NODE)n.remove();
   cell.prepend(headline);
   const label=document.createElement('span');label.className='event-tone-label '+color;label.textContent=result.label+' · 租客视角';headline.after(label);
   const details=cell.querySelector('details');if(details){const p=document.createElement('p');p.className='event-tone-explanation';p.textContent=result.evidence.length?'文本倾向依据：'+result.evidence.map(e=>e.text+'（'+e.reason+'）').join('；'):'尚无足够文本依据判断正负性';p.title='中文分句、词组与否定/条件识别；不是租金涨跌预测';details.append(p);
    const semantic=window.ankeEventSemantics?.records.find(record=>record.title.trim()===title.trim()&&record.excerpt===excerpt);
    if(semantic){const topic=document.createElement('p');topic.className='event-semantic-explanation';const relevant=semantic.topics.filter(t=>t.similarity>=0.4);topic.textContent=relevant.length?'语义关联：'+relevant.map(t=>t.topic+' '+t.similarity.toFixed(2)).join('；'):'语义关联尚不明确';topic.title='本地 MiniLM 语义相似度，不是概率、事实核验或利好判断';details.append(topic);row.dataset.semanticMethod=window.ankeEventSemantics.method;}
    const launch=document.createElement('button');launch.type='button';launch.className='event-reader-launch';launch.textContent='展开正文与来源';
    const show=()=>openReader({title,body:semantic?.body||excerpt,details,sourceUrl:semantic?.url});
    launch.onclick=show;details.before(launch);details.hidden=true;
    // Retain the original summary as a keyboard-accessible fallback for callers.
    details.addEventListener('toggle',()=>{if(details.open){details.open=false;show();}});
   }
  }
 }
 let queued=false;const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;present();});});
 if(table)observer.observe(table,{childList:true,subtree:true});
 if(provenance)observer.observe(provenance,{childList:true,subtree:true});
 present();window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
})();
