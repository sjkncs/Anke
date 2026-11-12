import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {connect} from '../store.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const read=async p=>JSON.parse(await readFile(path.join(root,p),'utf8'));

export async function importEnvironment(db){
  const inventory=await read('inventory.json');
  const summary=await read('vision-results/summary.json');
  const factors=await read('factor_summary.json');
  const matches=await read('rental_match_candidates.json');
  if(factors.accepted_matches!==0 || factors.rental_effect_estimated!==false)
    throw Error('This acquisition has no validated rental effect');
  await db.exec(await readFile(path.join(root,'schema.sql'),'utf8'));
  await db.exec('BEGIN');
  try{
    for(const item of inventory.rasters){
      await db.query(`INSERT INTO rent_environment_assets VALUES($1,$2,$3,'regional_raster',$4)
        ON CONFLICT(asset_id) DO UPDATE SET metadata=excluded.metadata`,
        [item.sha256,item.path,item.sha256,JSON.stringify(item)]);
    }
    for(const file of summary.results){
      const item=JSON.parse(await readFile(file,'utf8'));
      await db.query(`INSERT INTO rent_environment_assets VALUES($1,$2,$1,'streetview',$3)
        ON CONFLICT(asset_id) DO UPDATE SET metadata=excluded.metadata`,
        [item.image_sha256,item.image,JSON.stringify({village:item.village_name,district:item.district,
          year:item.year,direction:item.direction,coordinateCRS:'unknown',usage:'local research; source redistribution terms unverified'})]);
      const revision=JSON.stringify(item.models);
      const id=item.image_sha256+':yolov8n-mobileSAM-v1';
      await db.query(`INSERT INTO rent_environment_features VALUES($1,$2,$3,$4,$5,'pending')
        ON CONFLICT(feature_id) DO UPDATE SET values_json=excluded.values_json,model_revision=excluded.model_revision,
        validation_status='pending'`,[id,item.image_sha256,'YOLO detection + box-prompted MobileSAM',revision,
        JSON.stringify({counts:item.detected_counts,samUnionPixelFraction:item.sam_union_pixel_fraction,
          detections:item.objects,metricScope:item.metric_scope})]);
    }
    for(const item of matches){
      if(item.accepted!==false) throw Error('Candidate acceptance requires a separate reviewed workflow');
      const id=item.observation_id+':'+item.community+':'+item.image_year;
      await db.query(`INSERT INTO rent_environment_match_candidates VALUES($1,$2,$3,false)
        ON CONFLICT(candidate_id) DO UPDATE SET metadata=excluded.metadata,accepted=false`,
        [id,item.observation_id,JSON.stringify(item)]);
    }
    await db.exec('COMMIT');
  }catch(error){await db.exec('ROLLBACK');throw error;}
  const counts=await db.query(`SELECT
    (SELECT count(*)::int FROM rent_environment_assets) AS assets,
    (SELECT count(*)::int FROM rent_environment_features) AS feature_records,
    (SELECT count(*)::int FROM rent_environment_match_candidates) AS match_candidates,
    (SELECT count(*)::int FROM rent_environment_match_candidates WHERE accepted) AS accepted_matches`);
  return counts.rows[0];
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const db=await connect();
  try{console.log(JSON.stringify(await importEnvironment(db),null,2));}
  finally{await db.close();}
}
