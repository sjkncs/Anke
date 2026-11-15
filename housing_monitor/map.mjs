// WGS84 coordinates are projected locally; no inferred building heights.
export function createMap(canvas,onSelect){
 const T=window.THREE;if(!T)throw Error('空间视图加载失败');
 const renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xf1f2f3);
 const scene=new T.Scene(),group=new T.Group();scene.add(group);
 scene.add(new T.AmbientLight(0xffffff,.8));const light=new T.DirectionalLight(0xffffff,.8);light.position.set(-40,100,30);scene.add(light);
 const camera=new T.PerspectiveCamera(40,1,.001,10000);let yaw=-.2,pitch=.75,distance=120,target=new T.Vector3(),mode='map',features=[],homes=[],drag,model=null,style='shaded',edges=true;
 let fittedTarget=new T.Vector3(),fittedDistance=120,view='iso';
 const viewStates=new Map();
 function saveView(){viewStates.set(mode,{target:target.clone(),distance,yaw,pitch,view});}
 const ray=new T.Raycaster(),mouse=new T.Vector2(),layers={district:true,building:true,home:true};
 function xy(c){return [(c[0]-114.06)*101,(c[1]-22.63)*111];}
 function draw(){const w=canvas.parentElement.clientWidth,h=canvas.parentElement.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();const p=mode==='map'||view==='top'?Math.PI/2-.001:view==='front'?.001:pitch;camera.position.set(target.x+Math.sin(yaw)*Math.cos(p)*distance,target.y+Math.sin(p)*distance,target.z+Math.cos(yaw)*Math.cos(p)*distance);camera.lookAt(target);renderer.render(scene,camera);}
 function applyStyle(){for(const o of group.children){if(o.isMesh){o.material.wireframe=style==='wire';o.material.vertexColors=style==='objects'&&Boolean(o.geometry.getAttribute('color'));o.material.color.set(o.material.vertexColors?0xffffff:style==='white'?0xfafafa:o.userData.baseColor??0xadb1b5);o.material.needsUpdate=true;}if(o.userData.edge)o.visible=edges&&style!=='wire';}draw();}
 function addEdges(mesh){const edge=new T.LineSegments(new T.EdgesGeometry(mesh.geometry,25),new T.LineBasicMaterial({color:0x657078,transparent:true,opacity:.65}));edge.userData.edge=true;group.add(edge);}
 function fit(){const box=new T.Box3().setFromObject(group);if(!box.isEmpty()){box.getCenter(fittedTarget);const size=box.getSize(new T.Vector3());const aspect=Math.max(.1,canvas.parentElement.clientWidth/canvas.parentElement.clientHeight);fittedDistance=Math.max(.05,size.length()/Math.min(1,aspect)/ (2*Math.tan(camera.fov*Math.PI/360))*1.25);}target.copy(fittedTarget);distance=fittedDistance;draw();}
 function line(coords,color){const points=coords.map(c=>{const [x,z]=xy(c);return new T.Vector3(x,.015,-z)});return new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color}));}
 function rebuild(){
  while(group.children.length){const o=group.children[0];o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();group.remove(o);}
  if(mode==='model'&&!model){draw();return;}
  if(mode==='model'&&model){
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(model.positions,3));geometry.computeVertexNormals();
   if(model.objectIds){const palette=[0x5c89b7,0xc76d61,0x66a382,0xaa83b4,0xc2a15f,0x59a9b1],colors=new Float32Array(model.positions.length);for(let face=0;face<model.faces;face++){const color=new T.Color(palette[model.objectIds[face]%palette.length]);for(let vertex=0;vertex<3;vertex++)color.toArray(colors,face*9+vertex*3);}geometry.setAttribute('color',new T.BufferAttribute(colors,3));}
   if(model.up==='z')geometry.rotateX(-Math.PI/2);
   const mesh=new T.Mesh(geometry,new T.MeshLambertMaterial({color:0xadb1b5,side:T.DoubleSide}));mesh.userData={name:model.name,baseColor:0xadb1b5};group.add(mesh);addEdges(mesh);applyStyle();return;
  }
  for(const f of features){const g=f.geometry,p=f.properties||{},building=Number.isFinite(p.height)&&p.height>0;if(!layers[building?'building':'district'])continue;
   const polygons=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
   for(const rings of polygons){const shape=new T.Shape();for(const [i,c] of rings[0].entries()){const [x,y]=xy(c);if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);}
    for(const ring of rings.slice(1)){const hole=new T.Path();for(const [i,c] of ring.entries()){const [x,y]=xy(c);if(!i)hole.moveTo(x,y);else hole.lineTo(x,y);}shape.holes.push(hole);}
    const geom=building&&mode==='buildings'?new T.ExtrudeGeometry(shape,{depth:p.height/1000,bevelEnabled:false}):new T.ShapeGeometry(shape);geom.rotateX(-Math.PI/2);
    const mesh=new T.Mesh(geom,new T.MeshLambertMaterial({color:building?0xadb1b5:0xe1e4e7,side:T.DoubleSide}));mesh.userData={name:p.name||p.project||'区域',height:p.height,baseColor:building?0xadb1b5:0xe1e4e7};group.add(mesh);if(building)addEdges(mesh);group.add(line(rings[0],0xaeb5bb));
    if(!building&&p.name){const label=document.createElement('canvas');label.width=256;label.height=64;const ctx=label.getContext('2d');ctx.font='28px Microsoft YaHei, sans-serif';ctx.fillStyle='#555d65';ctx.textAlign='center';ctx.fillText(p.name,128,43);const sprite=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(label),depthTest:false}));new T.Box3().setFromObject(mesh).getCenter(sprite.position);sprite.position.y=.04;sprite.scale.set(7,1.75,1);group.add(sprite);}
   }
   if(g.type==='LineString')group.add(line(g.coordinates,0xbdc9c0));
   if(g.type==='MultiLineString')for(const c of g.coordinates)group.add(line(c,0xbdc9c0));
   if(g.type==='Point'){const [x,z]=xy(g.coordinates);const pin=new T.Mesh(new T.SphereGeometry(.14,12,8),new T.MeshBasicMaterial({color:0x626a72}));pin.position.set(x,.2,-z);pin.userData={name:p.name||p.project||'位置'};group.add(pin);}
  }
  if(layers.home)for(const home of homes){if(home.location?.crs!=='WGS84'||!Number.isFinite(home.location.longitude)||!Number.isFinite(home.location.latitude))continue;const [x,z]=xy([home.location.longitude,home.location.latitude]);const pin=new T.Mesh(new T.SphereGeometry(.14,12,8),new T.MeshBasicMaterial({color:0x475c52}));pin.position.set(x,.2,-z);pin.userData={name:home.project};group.add(pin);}
  applyStyle();
 }
 const observer=new ResizeObserver(draw);observer.observe(canvas.parentElement);
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,moved:false,pan:e.button===2||e.shiftKey,total:0};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.total+=Math.abs(dx)+Math.abs(dy);if(drag.total>2)drag.moved=true;if(mode!=='map'&&!drag.pan){view='iso';yaw-=dx*.007;pitch=Math.max(.15,Math.min(1.45,pitch+dy*.005));}else{target.x-=dx*distance/900;target.z-=dy*distance/900;}drag.x=e.clientX;drag.y=e.clientY;draw();});
 canvas.addEventListener('pointerup',e=>{if(drag&&!drag.moved){const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(group.children).find(h=>h.object.userData.name);if(hit)onSelect(hit.object.userData);}drag=null;});
 canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(.02,Math.min(10000,distance*Math.exp(e.deltaY*.001)));draw();},{passive:false});draw();
 canvas.addEventListener('pointercancel',()=>drag=null);
 window.addEventListener('pagehide',()=>{observer.disconnect();renderer.dispose();while(group.children.length){const o=group.children[0];o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();group.remove(o);}},{once:true});
 return {setData(data){features=data.features;viewStates.delete('map');viewStates.delete('buildings');rebuild();fit();},setModel(data){saveView();model=data;mode='model';view='iso';yaw=-.2;pitch=.75;rebuild();fit();},setHomes(data){homes=data;if(mode!=='model')rebuild();},setMode(value){saveView();mode=value;view='iso';rebuild();fit();const saved=viewStates.get(mode);if(saved){target.copy(saved.target);distance=saved.distance;yaw=saved.yaw;pitch=saved.pitch;view=saved.view;draw();}},setStyle(value){style=value;applyStyle();},setEdges(value){edges=value;applyStyle();},setUp(value){if(model){model.up=value;rebuild();fit();}},setView(value){view=value;yaw=value==='front'?0:-.2;pitch=.75;draw();},setLayer(key,value){layers[key]=value;rebuild();},zoom(factor){distance=Math.max(.02,Math.min(10000,distance*factor));draw();},reset(){yaw=-.2;pitch=.75;view='iso';target.copy(fittedTarget);distance=fittedDistance;draw();}};
}
