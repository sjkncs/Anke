// Load the existing district meshes without replacing residential pin state.
(() => {
 const base=new URL('.',document.currentScript.src),T=window.THREE,spatial=window.ankeSpatial;
 if(!spatial)return;
 const group=new T.Group();spatial.scene.add(group);
 spatial.scene.add(new T.AmbientLight(0xffffff,.85));const light=new T.DirectionalLight(0xffffff,.65);light.position.set(-30,80,20);spatial.scene.add(light);
 const select=document.createElement('select');select.setAttribute('aria-label','深圳建筑区域');
 const control=document.getElementById('spatialMap');if(!control)return;control.before(select);select.style.width='auto';select.style.maxWidth='160px';
 const reset=document.createElement('button');reset.textContent='复位';reset.onclick=()=>spatial.reset();control.before(reset);
 let active='',sequence=0;const loaded=new Map(),pending=new Map();
 function script(file){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=new URL(file,base);el.onload=()=>{el.remove();resolve();};el.onerror=()=>{el.remove();reject(Error('建筑图层加载失败'));};document.head.append(el);});}
 function decode(value,Type){const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));return new Type(bytes.buffer);}
 function show(){for(const [id,mesh] of loaded)mesh.visible=id===active;const visible=loaded.has(active);window.ankeCityVisible=visible;document.getElementById('spatialEmpty').hidden=visible;if(visible)spatial.fit(loaded.get(active));else spatial.draw();}
 window.AnkeCity={receive(data){if(loaded.has(data.id))return;const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(decode(data.positions,Float32Array),3));geometry.setIndex(new T.BufferAttribute(decode(data.indices,Uint32Array),1));geometry.computeVertexNormals();const mesh=new T.Mesh(geometry,new T.MeshLambertMaterial({color:0xd2d5d7,side:T.DoubleSide}));group.add(mesh);loaded.set(data.id,mesh);if(data.id===active)show();},start(manifest){for(const d of manifest.districts){const o=document.createElement('option');o.value=d.id;o.textContent=d.name;select.append(o);}select.onchange=async()=>{active=select.value;const id=active,current=++sequence;show();document.getElementById('spatialSelection').textContent='';if(loaded.has(id))return;try{if(!pending.has(id))pending.set(id,script('city/'+id+'.js').finally(()=>pending.delete(id)));await pending.get(id);}catch(e){if(current===sequence)document.getElementById('spatialSelection').textContent=e.message;}};select.value='nanshan';void select.onchange();}};
 void script('city/manifest.js').catch(()=>{select.remove();});
})();
