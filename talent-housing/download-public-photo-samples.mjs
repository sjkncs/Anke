import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {request}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright-core');
const root=process.argv[2]||'C:/Users/Lenovo/Desktop/安客实景采集_20261112';
const api=await request.newContext({timeout:20000});
const samples=[];
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
try{
 for(const id of ['ocean-developer','bolin-design','yifu-report']){
  const record=JSON.parse(await readFile(path.join(root,id,'record.json'),'utf8'));
  if(record.state!=='inspected')continue;
  const selected=record.media.filter(m=>m.tag==='img'&&(
   id==='ocean-developer'?/入户风景/.test(m.alt):
   id==='bolin-design'?/Shenzhen-Bolin-Tinerry/.test(m.url)&&!/-472x/.test(m.url):
   /\/pic\/2023-11\/03\//.test(m.url))).slice(0,6);
  await mkdir(path.join(root,id,'photos'),{recursive:true});
  for(const [i,media]of selected.entries()){
   const item={target:record.target,sourcePage:record.url,sourceImage:media.url,alt:media.alt,accessedAt:new Date().toISOString(),license:'unknown; local source inspection only; not approved for training or redistribution',captureTime:null,coordinates:null,continuousSequence:false,state:'pending'};
   try{
    const response=await api.get(media.url,{headers:{Referer:record.url}});
    item.httpStatus=response.status();
    const type=response.headers()['content-type']||'';
    if(!response.ok()||!/^image\/(jpeg|png|webp)/i.test(type))throw Error('Non-image response '+response.status()+' '+type);
    const data=await response.body();if(data.length>8*1024*1024)throw Error('Image exceeds 8 MB limit');
    const ext=type.includes('png')?'png':type.includes('webp')?'webp':'jpg';
    item.file=id+'/photos/'+String(i+1).padStart(2,'0')+'.'+ext;
    item.sha256=createHash('sha256').update(data).digest('hex');item.bytes=data.length;
    await writeFile(path.join(root,item.file),data);item.state='downloaded';
   }catch(error){item.state='failed';item.error=error.message;}
   samples.push(item);await writeFile(path.join(root,'photo-samples.json'),JSON.stringify(samples,null,2),'utf8');
   console.log(item.target+': '+item.state);
  }
 }
 const html='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>安客实景资料核验</title><style>body{font:14px system-ui;margin:24px;background:#f5f5f5;color:#333}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}article{background:white;padding:14px;border-radius:10px}img{width:100%;height:230px;object-fit:contain}a{color:#444}p{line-height:1.7}</style><h1>安客实景资料核验</h1><p>以下为公开页面的本地核验样本。拍摄时间、精确坐标、相机位姿和复用授权尚未核实，不构成连续采集或重建成果。</p><main>'+samples.filter(s=>s.state==='downloaded').map(s=>'<article><img src="'+escape(s.file)+'"><p>'+escape(s.target)+'</p><a href="'+escape(s.sourcePage)+'">查看原始出处</a><p>用途：来源核验；尚未用于模型训练与产品展示</p></article>').join('')+'</main></html>';
 await writeFile(path.join(root,'实景资料核验.html'),html,'utf8');
 const counts={downloaded:samples.filter(s=>s.state==='downloaded').length,failed:samples.filter(s=>s.state==='failed').length};
 console.log(JSON.stringify(counts));if(counts.failed)process.exitCode=1;
}finally{await api.dispose();}
