import {PGlite} from '../rent-knowledge/node_modules/@electric-sql/pglite/dist/index.js';
import {validateApplication,validateUnit,recommend,simulate,progress} from './core.mjs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
import {preferenceCatalog} from './preference-catalog.mjs';
import {surveyTemplate} from './survey-template.mjs';
import {validateSupply,validateProfile,searchHomes} from './matching.mjs';
import {createOrder,advanceOrder} from './workorders.mjs';
import {policy} from './policy.mjs';
import {compareAllocation} from './allocation-comparison.mjs';
export async function openStore(location=path.join(path.dirname(fileURLToPath(import.meta.url)),'data/postgres')) {
  await mkdir(location,{recursive:true});
  const db=new PGlite(location);
  await db.exec(`CREATE TABLE IF NOT EXISTS talent_schema(version integer PRIMARY KEY); INSERT INTO talent_schema VALUES(1) ON CONFLICT DO NOTHING;
    CREATE TABLE IF NOT EXISTS talent_records(kind text NOT NULL CHECK(kind IN ('application','unit')),id text NOT NULL,revision integer NOT NULL,data jsonb NOT NULL,PRIMARY KEY(kind,id));
    CREATE TABLE IF NOT EXISTS talent_audit(sequence bigserial PRIMARY KEY,at timestamptz NOT NULL DEFAULT now(),kind text NOT NULL,id text NOT NULL,revision integer NOT NULL,data jsonb NOT NULL);
    CREATE TABLE IF NOT EXISTS talent_orders(id text PRIMARY KEY,data jsonb NOT NULL);
    INSERT INTO talent_schema VALUES(2) ON CONFLICT DO NOTHING;`);
  // One process owns this store. Serialize writes so optimistic revisions stay atomic.
  let queue=Promise.resolve();
  const all=async kind=>(await db.query('SELECT data,revision FROM talent_records WHERE kind=$1 ORDER BY id',[kind])).rows.map(r=>({...r.data,revision:r.revision}));
  async function save(kind,input){
    const run=async()=>{
      if(!['application','unit'].includes(kind))throw Error('Invalid record kind');
      const {revision=0,...data}=input;
      if(!Number.isInteger(revision)||revision<0)throw Error('Invalid revision');
      if(kind==='application'){validateApplication(data);validateProfile(data);}else validateSupply(data);
      await db.exec('BEGIN');
      try{
        const old=(await db.query('SELECT revision FROM talent_records WHERE kind=$1 AND id=$2',[kind,data.id])).rows[0];
        if((old?.revision??0)!==revision)throw Error('Revision conflict; refresh the record');
        const next=revision+1;
        await db.query('INSERT INTO talent_records VALUES($1,$2,$3,$4) ON CONFLICT(kind,id) DO UPDATE SET revision=excluded.revision,data=excluded.data',[kind,data.id,next,JSON.stringify(data)]);
        await db.query('INSERT INTO talent_audit(kind,id,revision,data) VALUES($1,$2,$3,$4)',[kind,data.id,next,JSON.stringify(data)]);
        await db.exec('COMMIT');return {...data,revision:next};
      }catch(e){await db.exec('ROLLBACK');throw e;}
    };
    const next=queue.then(run);queue=next.catch(()=>{});return next;
  }
  async function workbench(input){
    const allowed=['action','applicationId','query','sort','provider','minRating','minReviewCount','asOf','order','id','revision','on','actor','materials','decision','receipt','unitId','records','execution'];
    if(Object.keys(input).some(k=>!allowed.includes(k)))throw Error('Unknown workbench field');
    const mutate=['create_order','advance_order','import_supply'].includes(input.action);
    const run=async()=>{
      const applications=await all('application'),units=await all('unit');
      const orders=async()=>(await db.query('SELECT data FROM talent_orders ORDER BY id')).rows.map(r=>r.data);
      if(input.action==='workspace')return {applications,units:units.filter(u=>u.supply),orders:await orders()};
      const a=applications.find(a=>a.id===input.applicationId);
      if(input.action==='search_homes'){if(!a)throw Error('Application not found');return searchHomes(a,units,input);}
      if(input.action==='import_supply'){
        if(!Array.isArray(input.records)||!input.records.length||input.records.length>300)throw Error('Supply batch must contain 1-300 units');
        const batch=input.records.map(u=>{validateSupply(u);if(!u.supply)throw Error('Government or university provenance required');return u;});
        if(new Set(batch.map(u=>u.id)).size!==batch.length)throw Error('Duplicate supply IDs');
        await db.exec('BEGIN');
        try{
          for(const inputUnit of batch){
            const {revision=0,...data}=inputUnit,old=units.find(u=>u.id===data.id);
            if(!Number.isInteger(revision)||revision<0||(old?.revision??0)!==revision)throw Error('Revision conflict; refresh supply');
            const next=revision+1;
            await db.query('INSERT INTO talent_records VALUES($1,$2,$3,$4) ON CONFLICT(kind,id) DO UPDATE SET revision=excluded.revision,data=excluded.data',['unit',data.id,next,JSON.stringify(data)]);
            await db.query('INSERT INTO talent_audit(kind,id,revision,data) VALUES($1,$2,$3,$4)',['unit',data.id,next,JSON.stringify(data)]);
          }
          await db.exec('COMMIT');return {imported:batch.length};
        }catch(e){await db.exec('ROLLBACK');throw e;}
      }
      if(input.action==='create_order'){
        const app=applications.find(a=>a.id===input.order?.applicationId);if(!app)throw Error('Application not found');
        const record=createOrder(input.order,app);
        await db.query('INSERT INTO talent_orders VALUES($1,$2)',[record.id,JSON.stringify(record)]);return record;
      }
      if(input.action==='advance_order'){
        const old=(await orders()).find(o=>o.id===input.id);if(!old)throw Error('Work order not found');
        const application=applications.find(a=>a.id===old.applicationId);if(!application)throw Error('Application not found');
        const record=advanceOrder(old,input,{application,units,matches:searchHomes(application,units,{asOf:input.on})});
        await db.query('UPDATE talent_orders SET data=$1 WHERE id=$2',[JSON.stringify(record),record.id]);return record;
      }
      throw Error('Unsupported workbench operation');
    };
    if(!mutate){await queue;return run();}
    const next=queue.then(run);queue=next.catch(()=>{});return next;
  }
  async function execute(input){
    if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid request');
    if(['policy_search','policy_answer','policy_coverage','policy_route'].includes(input.action))return policy(input);
    if(['workspace','search_homes','create_order','advance_order','import_supply'].includes(input.action))return workbench(input);
    if(Object.keys(input).some(k=>!['action','applicationId','asOf'].includes(k)))throw Error('Unknown request field');
    await queue;
    if(input.action==='preference_catalog')return structuredClone(preferenceCatalog);
    if(input.action==='survey_template')return structuredClone(surveyTemplate);
    const apps=await all('application');
    if(input.action==='coverage')return {applications:apps.length,units:(await all('unit')).length};
    if(input.action==='simulate')return simulate(apps,await all('unit'));
    if(input.action==='compare_allocation')return compareAllocation(apps,await all('unit'));
    const a=apps.find(x=>x.id===input.applicationId);if(!a)throw Error('Application not found');
    if(input.action==='recommend')return recommend(a,await all('unit'));
    if(input.action==='progress')return progress(a,input.asOf??new Date().toISOString().slice(0,10));
    throw Error('Unsupported action');
  }
  return {db,all,save,execute,close:async()=>{await queue;await db.close();}};
}
