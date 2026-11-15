import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const root=process.argv[2]||'C:/Users/Lenovo/Desktop/安客实景采集_20261112/';
const rows=JSON.parse(await readFile(root+'photo-samples.json','utf8'));
function inspectExif(buffer){
 const result={exif:false,gpsDirectory:false,dateTimeOriginal:false,cameraMake:false,cameraModel:false,focalLength:false};
 if(buffer.readUInt16BE(0)!==0xffd8)return {...result,format:'non-JPEG; EXIF not inspected'};
 let p=2;
 while(p+4<buffer.length){
  if(buffer[p]!==255)break;const marker=buffer[p+1];p+=2;
  if(marker===0xda||marker===0xd9)break;
  if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
  const length=buffer.readUInt16BE(p);if(length<2||p+length>buffer.length)throw Error('Malformed JPEG segment');
  if(marker===0xe1&&buffer.subarray(p+2,p+8).toString('binary')==='Exif\0\0'){
   result.exif=true;const t=buffer.subarray(p+8,p+length);
   const little=t.toString('ascii',0,2)==='II';
   const u16=o=>little?t.readUInt16LE(o):t.readUInt16BE(o),u32=o=>little?t.readUInt32LE(o):t.readUInt32BE(o);
   assert.equal(u16(2),42,'Invalid TIFF header');
   const walk=(offset,nested=false)=>{
    const count=u16(offset);assert(count<4096,'Unexpected IFD size');
    for(let j=0;j<count;j++){
     const entry=offset+2+j*12;const tag=u16(entry);
     if(tag===0x8825)result.gpsDirectory=true;
     if(tag===0x010f)result.cameraMake=true;if(tag===0x0110)result.cameraModel=true;
     if(tag===0x9003)result.dateTimeOriginal=true;if(tag===0x920a)result.focalLength=true;
     if(tag===0x8769&&!nested)walk(u32(entry+8),true);
    }
   };walk(u32(4));
  }
  p+=length;
 }
 return {...result,format:'JPEG'};
}
const audit=[];
for(const row of rows){
 if(row.state!=='downloaded')continue;
 const bytes=await readFile(root+row.file);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256,'Source hash mismatch');
 let metadata;try{metadata=inspectExif(bytes);}catch(error){metadata={error:error.message};}
 audit.push({file:row.file,target:row.target,sha256:row.sha256,metadata,cameraPose:'not supplied',captureSequence:'not established',trainingPermission:'not established',readyForReconstruction:false});
}
const report={checkedAt:new Date().toISOString(),samples:audit.length,exifBlocks:audit.filter(r=>r.metadata.exif).length,gpsDirectories:audit.filter(r=>r.metadata.gpsDirectory).length,dates:audit.filter(r=>r.metadata.dateTimeOriginal).length,readyForReconstruction:0,results:audit};
await writeFile(root+'影像输入审计.json',JSON.stringify(report,null,2),'utf8');
const require=createRequire(import.meta.url);const{request}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright-core');
const api=await request.newContext({timeout:20000});
try{
 const url='https://saliteta.github.io/CUHKSZ_SMBU/static/pdfs/GauUscene_license.pdf';
 const response=await api.get(url);assert(response.ok(),'License download failed');
 const data=await response.body();assert.equal(data.subarray(0,5).toString(),'%PDF-');
 await writeFile(root+'GauUscene_license.pdf',data);
 await writeFile(root+'GauUscene_license.provenance.json',JSON.stringify({url,accessedAt:new Date().toISOString(),sha256:createHash('sha256').update(data).digest('hex'),bytes:data.length,terms:'Academic research only; signed agreement must be returned before dataset access; not a product integration license'},null,2),'utf8');
}finally{await api.dispose();}
console.log(JSON.stringify({samples:report.samples,exifBlocks:report.exifBlocks,gpsDirectories:report.gpsDirectories,dates:report.dates,readyForReconstruction:report.readyForReconstruction}));
