(() => {
  const canvas=document.getElementById('spatialCanvas'),container=document.getElementById('spatial'),empty=document.getElementById('spatialEmpty');
  let renderer,scene,camera,points,units=[],angle=-0.45,elevation=0.9,distance=90,drag;
  const THREE=window.THREE;
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(42,1,0.1,1000);
    const grid=new THREE.GridHelper(120,24,0xc8cdd0,0xdde1e3);scene.add(grid);
    points=new THREE.Group();scene.add(points);
  }catch{empty.textContent='三维视图不可用';window.updateHousingSpatial=()=>{};return;}
  function draw(){
    const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    camera.position.set(Math.sin(angle)*distance,Math.sin(elevation)*distance,Math.cos(angle)*distance);camera.lookAt(0,0,0);renderer.render(scene,camera);
  }
  new ResizeObserver(draw).observe(container);
  window.updateHousingSpatial=records=>{
    units=records.filter(u=>u.location?.crs==='BD09'&&Number.isFinite(u.location.longitude)&&Number.isFinite(u.location.latitude));
    while(points.children.length){const p=points.children[0];p.geometry.dispose();p.material.dispose();points.remove(p);}
    empty.hidden=units.length>0;
    for(const u of units){
      const color=u.status==='available'?0x4e6674:0xb8bec2;
      const pin=new THREE.Mesh(new THREE.SphereGeometry(0.75,12,10),new THREE.MeshBasicMaterial({color}));
      pin.position.set((u.location.longitude-114.05)*90,1.3,-(u.location.latitude-22.65)*100);pin.userData=u;points.add(pin);
      const line=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,1.3,6),new THREE.MeshBasicMaterial({color}));line.position.copy(pin.position);line.position.y=0.65;points.add(line);
    }
    document.getElementById('spatialSelection').textContent='';draw();
  };
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved ||=Math.abs(dx)+Math.abs(dy)>3;angle-=dx*0.008;elevation=Math.max(0.25,Math.min(1.4,elevation+dy*0.005));drag.x=e.clientX;drag.y=e.clientY;draw();});
  canvas.addEventListener('pointerup',e=>{
    if(drag&&!drag.moved){const r=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=ray.intersectObjects(points.children).find(h=>h.object.userData.id);if(hit){const u=hit.object.userData;document.getElementById('spatialSelection').textContent=`${u.project}　${u.rent==null?'租金待核实':u.rent+' 元/月'}`;}}
    drag=null;
  });
  canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(25,Math.min(180,distance+e.deltaY*0.04));draw();},{passive:false});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)draw();});draw();
})();
