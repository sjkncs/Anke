let stop;
export function onLoad(pi){
 const open=event=>{if(!['wealth','housing'].includes(event.detail))return;pi.dispatch('plugin.call',{method:'monitor.open',args:{tab:event.detail}}).catch(error=>console.error('[Anke Monitor]',error));};
 window.addEventListener('anke:monitor-open',open);stop=()=>window.removeEventListener('anke:monitor-open',open);
}
export function onUnload(){stop?.();stop=undefined;}
