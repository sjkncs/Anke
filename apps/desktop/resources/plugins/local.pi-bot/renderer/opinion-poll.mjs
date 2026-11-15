export function observationLoop({query,visible=()=>!document.hidden,delay=60000,set=setTimeout,clear=clearTimeout,onState=()=>{}}){
 let enabled=false,timer,busy=false,generation=0;
 async function tick(){if(!enabled||busy)return;const ticket=generation;if(!visible()){timer=set(tick,delay);return;}busy=true;onState('更新中');try{await query();if(ticket===generation)onState('已更新 '+new Date().toLocaleTimeString());}catch(error){if(ticket===generation){enabled=false;onState('观测已暂停：'+error.message);}}finally{busy=false;if(enabled&&ticket===generation)timer=set(tick,delay);}}
 return {start(){if(enabled)return;enabled=true;generation++;timer=set(tick,delay);onState('观测中 · 每分钟更新');},stop(){enabled=false;generation++;clear(timer);onState('观测已停止');}};
}
