import {el} from './dom.mjs';
export const VISUAL_WORKSPACES=[
  {id:'niulai',name:'财富看板',tab:'wealth',art:'wealth'},
  {id:'worldmonitor',name:'住房监测',tab:'housing',art:'operations'}
];
export function createVisualWorkspace(app,openNative){
  let dialog=null;
  function close(){if(!dialog)return;dialog.querySelector('iframe')?.remove();dialog.remove();dialog=null;}
  function open(id){
    const workspace=VISUAL_WORKSPACES.find(w=>w.id===id);if(!workspace)return;
    if(workspace.tab){close();window.dispatchEvent(new CustomEvent('anke:monitor-open',{detail:workspace.tab}));return;}
    if(workspace.native&&openNative){close();return openNative(workspace);}
    close();dialog=el('dialog','','anke-visual-workspace');dialog.setAttribute('aria-label',workspace.name);
    Object.assign(dialog.style,{width:'calc(100vw - 48px)',maxWidth:'none',height:'calc(100vh - 48px)',maxHeight:'none',padding:'0',border:'1px solid #dededb',borderRadius:'16px',background:'#fafaf8',color:'#303332',overflow:'hidden'});
    const bar=el('div'),title=el('strong',workspace.name),reload=el('button','刷新'),exit=el('button','关闭'),link=el('a','浏览器打开');
    Object.assign(bar.style,{display:'flex',alignItems:'center',gap:'16px',padding:'12px 18px',height:'30px',borderBottom:'1px solid #e4e4e1'});title.style.marginRight='auto';
    link.href=workspace.url;link.target='_blank';link.rel='noopener noreferrer';link.style.color='inherit';
    for(const button of [reload,exit]){button.type='button';Object.assign(button.style,{border:'1px solid #ddd',background:'#fff',padding:'6px 12px',borderRadius:'8px',color:'inherit',cursor:'pointer'});}
    const frame=el('iframe');frame.title=workspace.name;frame.src=workspace.url;frame.referrerPolicy='no-referrer';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads');
    Object.assign(frame.style,{display:'block',width:'100%',height:'calc(100% - 55px)',border:'0',background:'#fff'});
    reload.onclick=()=>{frame.src=workspace.url;};exit.onclick=close;dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    bar.append(title,reload,link,exit);dialog.append(bar,frame);app.append(dialog);dialog.showModal();
  }
  return {open,close,dispose:close};
}
