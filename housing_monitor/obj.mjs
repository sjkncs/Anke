// Geometry-only OBJ import. Never resolve mtllib, textures or external resources.
export function parseOBJ(text){
 if(typeof text!=='string'||text.length>20000000)throw Error('OBJ 文件过大');
 const vertices=[],triangles=[],objectIds=[],objects=[],objectMap=new Map();let name='',object='未分组';
 for(const raw of text.split(/\r?\n/)){
  const parts=raw.split('#')[0].trim().split(/\s+/),kind=parts.shift();
  if(kind==='v'){
   const v=parts.slice(0,3).map(Number);
   if(v.length!==3||!v.every(Number.isFinite)||v.some(n=>Math.abs(n)>1e10))throw Error('OBJ 顶点无效');
   vertices.push(v);if(vertices.length>300000)throw Error('OBJ 顶点过多');
  }else if(kind==='o'||kind==='g'||kind==='usemtl'){object=parts.join(' ').slice(0,200)||'未分组';if(kind==='o'&&!name)name=object;
  }else if(kind==='f'){
   if(parts.length!==3)throw Error('请在 SketchUp 导出 OBJ 时开启三角化');
   const face=parts.map(p=>{
    const value=p.split('/')[0];if(!/^-?\d+$/.test(value))throw Error('OBJ 面索引无效');
    const index=Number(value),resolved=index<0?vertices.length+index:index-1;
    if(!index||resolved<0||resolved>=vertices.length)throw Error('OBJ 面索引越界');return resolved;
   });
   triangles.push(face);let objectId=objectMap.get(object);if(objectId===undefined){objectId=objects.length;objects.push(object);objectMap.set(object,objectId);}objectIds.push(objectId);if(triangles.length>300000)throw Error('OBJ 面数过多');
  }
 }
 if(!triangles.length)throw Error('OBJ 中没有三角面');
 // Bound only referenced vertices; unused export helpers must not distort fit.
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const face of triangles)for(const i of face)for(let k=0;k<3;k++){min[k]=Math.min(min[k],vertices[i][k]);max[k]=Math.max(max[k],vertices[i][k]);}
 const size=max.map((n,k)=>n-min[k]),span=Math.max(...size);
 if(!span||!Number.isFinite(span))throw Error('OBJ 几何范围无效');
 const center=min.map((n,k)=>(n+max[k])/2),positions=new Float32Array(triangles.length*9);
 let offset=0;for(const face of triangles)for(const i of face)for(let k=0;k<3;k++)positions[offset++]=(vertices[i][k]-center[k])/span*10;
 return {positions,name,faces:triangles.length,size,objects,objectIds};
}
