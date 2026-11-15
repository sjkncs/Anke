import {readFile,writeFile,rename,readdir,copyFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {listingFields} from './listing-fields.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const file=path.resolve(root,'../anke-agent-source/apps/desktop/resources/plugins/anke.rents/data/records.json');
const snapshot=JSON.parse(await readFile(file,'utf8'));
const original=JSON.parse(await readFile(path.join(root,'data/input.json'),'utf8'));
const byId=new Map(original.rows.map(r=>[r['统一观测ID'],r]));
const batches=path.join(root,'data/listing-sync/batches');
for(const name of await readdir(batches)){if(!name.endsWith('.json'))continue;const batch=JSON.parse(await readFile(path.join(batches,name),'utf8'));for(const r of batch.rows)byId.set(r['统一观测ID'],r);}
let enriched=0;
for(const row of snapshot.records){if(row.dataset!=='imported')continue;const raw=byId.get(row.observationId);if(!raw)continue;Object.assign(row,listingFields(raw));enriched++;}
const backup=path.join(root,'artifacts/field-refresh-'+Date.now());await mkdir(backup,{recursive:true});await copyFile(file,path.join(backup,'records.json'));
await writeFile(file+'.tmp',JSON.stringify(snapshot),'utf8');await rename(file+'.tmp',file);
console.log(JSON.stringify({enriched,backup,layout:snapshot.records.filter(r=>r.dataset==='imported'&&r.layout).length,address:snapshot.records.filter(r=>r.dataset==='imported'&&r.address).length}));
