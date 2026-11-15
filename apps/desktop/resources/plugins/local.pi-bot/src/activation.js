'use strict';
// Data/profile migration can outlast PI's 15-second plugin load hook. Keep the
// hook short and expose explicit loading/error states instead of partial teams.
function createActivation(start,stop){
  let phase='idle',value,error='',promise,controller,closing;
  const begin=()=>{
    if(phase==='loading'||phase==='ready'||phase==='closed')return;
    phase='loading';error='';controller=new AbortController();const signal=controller.signal;
    promise=Promise.resolve().then(()=>start(signal)).then(async result=>{
      if(signal.aborted){await stop(result);return;}
      value=result;phase='ready';
    },failure=>{if(!signal.aborted){phase='error';error=failure.message||'Anke Bot 启动失败。';}}).catch(failure=>{if(!signal.aborted){phase='error';error=failure.message||'Anke Bot 启动失败。';}});
  };
  return {
    begin,
    status({retry=false}={}){if(retry&&phase==='error')begin();return {phase,message:error||'正在载入 Anke Bot；首次迁移旧数据可能需要一些时间…'};},
    async ready(){if(phase==='closed')throw Error('Anke Bot 已停止。');if(phase==='idle')begin();await promise;if(phase!=='ready')throw Error(error||'Anke Bot 已停止。');return value;},
    close(){if(closing)return closing;if(phase==='closed')return Promise.resolve();phase='closed';controller?.abort();const active=value;value=null;closing=Promise.resolve().then(()=>active?stop(active):undefined);return closing;}
  };
}
module.exports={createActivation};
