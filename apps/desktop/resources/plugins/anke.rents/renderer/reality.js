(() => {
  const base=new URL('.',document.currentScript.src);
  const button=document.createElement('button');button.textContent='实景';button.style.whiteSpace='nowrap';
  document.getElementById('spatialMap').before(button);
  const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','实景模型');
  dialog.style.cssText='border:1px solid #ddd;border-radius:12px;padding:24px;width:400px;max-width:85vw;color:#333';
  dialog.innerHTML='<form method="dialog"><div style="display:flex;justify-content:space-between;align-items:center"><strong>实景模型</strong><button>关闭</button></div></form><form id="realityForm" style="display:grid;gap:12px;margin-top:16px"><label>本地高斯模型<input id="realityFile" type="file" accept=".splat,.ply,.ksplat" required></label><label>经度<input id="realityLon" type="number" min="113.5" max="115" step="any" required></label><label>纬度<input id="realityLat" type="number" min="22.3" max="23" step="any" required></label><label>坐标系<select id="realityCrs"><option>WGS84</option><option>GCJ02</option><option>BD09</option></select></label><label>模型单位<select id="realityScale"><option value="0.001">米</option><option value="0.00001">厘米</option></select></label><label>朝向角度<input id="realityHeading" type="number" min="-360" max="360" value="0" required></label><button id="realityLoad">加载</button><button id="realityRemove" type="button" disabled>移除</button><p id="realityState" role="status" style="margin:0"></p></form>';
  document.body.append(dialog);button.onclick=()=>dialog.showModal();
  const field=id=>dialog.querySelector('#'+id),form=field('realityForm'),state=field('realityState');
  let model,url,busy=false,timer,library;
  window.ankeRealityStatus={state:'empty'};
  function loadLibrary(){
    return library??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('splats.js',base);script.onload=resolve;script.onerror=()=>{library=null;script.remove();reject(Error('渲染库加载失败'));};document.head.append(script);});
  }
  function running(value){busy=value;field('realityLoad').disabled=value;field('realityRemove').disabled=value||!model;}
  async function clear(){
    cancelAnimationFrame(timer);
    if(model){window.ankeSpatial.scene.remove(model);await model.dispose();model=null;}
    if(url){URL.revokeObjectURL(url);url=null;}
    field('realityRemove').disabled=true;window.ankeSpatial.draw();window.ankeRealityStatus={state:'empty'};
  }
  field('realityRemove').onclick=async()=>{if(busy)return;running(true);try{await clear();state.textContent='已移除';}finally{running(false);}};
  form.onsubmit=async event=>{
    event.preventDefault();if(busy||!form.reportValidity())return;
    const file=field('realityFile').files[0],extension=file?.name.split('.').pop().toLowerCase();
    if(!['splat','ply','ksplat'].includes(extension)){state.textContent='请选择 SPLAT、PLY 或 KSPLAT 模型';return;}
    if(file.size>250*1024*1024){state.textContent='模型超过 250 MB，请先裁剪或压缩';return;}
    const spatial=window.ankeSpatial,position=spatial?.project({longitude:Number(field('realityLon').value),latitude:Number(field('realityLat').value),crs:field('realityCrs').value});
    if(!position){state.textContent='请等待城市模型就绪并填写深圳范围内坐标';return;}
    running(true);state.textContent='加载中';
    try{
      await loadLibrary();await clear();
      const GS=window['Gaussian Splats 3D'];
      model=new GS.DropInViewer({sharedMemoryForWorkers:false,gpuAcceleratedSort:false,enableSIMDInSort:false,integerBasedSort:false,dynamicScene:true,logLevel:0});
      spatial.scene.add(model);url=URL.createObjectURL(file);
      const scale=Number(field('realityScale').value),rotation=new window.THREE.Quaternion().setFromAxisAngle(new window.THREE.Vector3(0,1,0),Number(field('realityHeading').value)*Math.PI/180);
      await model.addSplatScene(url,{format:GS.SceneFormat[{splat:'Splat',ply:'Ply',ksplat:'KSplat'}[extension]],showLoadingUI:false,progressiveLoad:false,position:[position[0],0,position[1]],scale:[scale,scale,scale],rotation:rotation.toArray()});
      spatial.focusAt(position[0],position[1],.06);
      function animate(){spatial.draw();timer=requestAnimationFrame(animate);}animate();
      state.textContent='已加载 · 位置待校准';window.ankeRealityStatus={state:'loaded',name:file.name};
    }catch(error){await clear();state.textContent='加载失败，请检查模型格式';window.ankeRealityStatus={state:'error',error:String(error)};}
    finally{running(false);}
  };
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(timer);if(url)URL.revokeObjectURL(url);},{once:true});
})();
