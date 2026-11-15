import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export function localSegment(env){
 if(!env.ANKE_SEGMENT_PYTHON||!env.ANKE_SEGMENT_MODEL)return undefined;
 return image=>new Promise((resolve,reject)=>{
  if(typeof image!=='string'||image.length>7000000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)){reject(Error('Invalid image'));return;}
  const child=spawn(env.ANKE_SEGMENT_PYTHON,[fileURLToPath(new URL('./segment_local.py',import.meta.url))],{env,windowsHide:true,stdio:['pipe','pipe','pipe']});
  let output='',size=0;const timeout=setTimeout(()=>{child.kill();reject(Error('Local segmentation timed out'));},60000);
  child.on('error',error=>{clearTimeout(timeout);reject(error);});
  child.stdin.on('error',()=>{});child.stderr.on('data',()=>{});
  child.stdout.on('data',chunk=>{size+=chunk.length;if(size>8000000){child.kill();reject(Error('Segmentation response too large'));}else output+=chunk;});
  child.on('close',code=>{clearTimeout(timeout);try{const value=JSON.parse(output);if(code!==0||value.error)throw Error(value.error||'Local segmentation failed');resolve(value);}catch(error){reject(error);}});
  child.stdin.end(JSON.stringify({image}));
 });
}
