import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const text=(value,name,max=160)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('Invalid '+name);return value.trim();};
const cents=value=>{if(!Number.isSafeInteger(value)||value<0||value>1e13)throw Error('Invalid amount');return value;};
function day(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||new Date(value).toISOString().slice(0,10)!==value)throw Error('Invalid date');return value;}
export function validateAsset(input){
 if(!input||Object.keys(input).some(k=>!['id','name','district','address','status','monthlyRentCents','leaseEnd'].includes(k)))throw Error('Invalid asset');
 const result={id:input.id?text(input.id,'id',64):randomUUID(),name:text(input.name,'name'),district:text(input.district,'district',30),address:text(input.address,'address',300),status:input.status,monthlyRentCents:cents(input.monthlyRentCents)};
 if(!['occupied','vacant','maintenance'].includes(result.status))throw Error('Invalid status');
 if(input.leaseEnd)result.leaseEnd=day(input.leaseEnd);
 return result;
}
export function summarizeAssets(data,{month=new Date().toISOString().slice(0,7),asOf=new Date().toISOString().slice(0,10)}={}){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Invalid month');day(asOf);
 const entries=data.entries.filter(e=>e.month===month),incomeCents=entries.filter(e=>e.kind==='income').reduce((s,e)=>s+e.amountCents,0),expenseCents=entries.filter(e=>e.kind==='expense').reduce((s,e)=>s+e.amountCents,0);
 const occupied=data.assets.filter(a=>a.status==='occupied').length;
 return {...data,month,summary:{assets:data.assets.length,occupied,occupancy:data.assets.length?occupied/data.assets.length:null,incomeCents,expenseCents,netCents:incomeCents-expenseCents,expiring:data.assets.filter(a=>a.status==='occupied'&&a.leaseEnd&&a.leaseEnd>=asOf&&(Date.parse(a.leaseEnd)-Date.parse(asOf))/86400000<=30)}};
}
export function createAssetStore(file){
 let queue=Promise.resolve();
 async function read(){try{const data=JSON.parse(await readFile(file,'utf8'));if(data.version!==1||!Array.isArray(data.assets)||!Array.isArray(data.entries))throw Error('Invalid asset ledger');return data;}catch(e){if(e.code==='ENOENT')return {version:1,assets:[],entries:[]};throw e;}}
 return {async execute(input){
  if(input.action==='assets_list'){await queue;return summarizeAssets(await read(),{month:input.month});}
  const run=async()=>{const data=await read();let result;
   if(input.action==='assets_save'){const asset=validateAsset(input.asset);const i=data.assets.findIndex(a=>a.id===asset.id);if(i<0)data.assets.push(asset);else data.assets[i]=asset;result=asset;}
   else if(input.action==='assets_entry'){
    const e=input.entry;if(!e||Object.keys(e).some(k=>!['id','assetId','month','kind','amountCents','note'].includes(k)))throw Error('Invalid entry');
    if(!data.assets.some(a=>a.id===e.assetId)||!['income','expense'].includes(e.kind)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(e.month))throw Error('Invalid entry');
    const entry={id:e.id?text(e.id,'id',64):randomUUID(),assetId:e.assetId,month:e.month,kind:e.kind,amountCents:cents(e.amountCents),note:e.note?text(e.note,'note',300):''};
    if(data.entries.some(x=>x.id===entry.id))throw Error('Entry already recorded');data.entries.push(entry);result=entry;
   }else throw Error('Unsupported asset action');
   await mkdir(path.dirname(file),{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(data));await rename(temp,file);return result;
  };const next=queue.then(run);queue=next.catch(()=>{});return next;
 }};
}
