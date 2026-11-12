import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {connect,ingest} from '../store.mjs';
import {importEnvironment} from './import.mjs';

const db=await connect({memory:true});
try{
  await ingest(db,JSON.parse(await readFile(new URL('../data/input.json',import.meta.url),'utf8')));
  const first=await importEnvironment(db);
  assert.deepEqual(first,{assets:59,feature_records:56,match_candidates:7,accepted_matches:0});
  assert.deepEqual(await importEnvironment(db),first);
  const orphan=await db.query(`SELECT count(*)::int AS n FROM rent_environment_match_candidates m
    LEFT JOIN rent_observations r ON r.id=m.observation_id WHERE r.id IS NULL`);
  assert.equal(orphan.rows[0].n,0);
  console.log(JSON.stringify({status:'PASS',...first,checks:['idempotent import','source linkage','no accepted candidate joins']}));
}finally{await db.close();}
