import {readFile, mkdir, writeFile, rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {vector} from '@electric-sql/pglite-pgvector';
import pg from 'pg';

export const root = path.dirname(fileURLToPath(import.meta.url));
export const districts = ['南山','福田','罗湖','盐田','宝安','龙华','龙岗','坪山','光明','大鹏新区'];

export async function connect({memory = false} = {}) {
  let db;
  if (process.env.ANKE_RENT_DATABASE_URL && !memory) {
    const client = new pg.Client({connectionString: process.env.ANKE_RENT_DATABASE_URL});
    await client.connect();
    db = {query: client.query.bind(client), exec: client.query.bind(client), close: client.end.bind(client)};
  } else {
    db = new PGlite(memory ? {extensions:{vector}} : {dataDir:path.join(root,'data/postgres'),extensions:{vector}});
  }
  await db.exec(await readFile(path.join(root,'schema.sql'),'utf8'));
  return db;
}

function positive(value, ceiling) {
  if (!String(value ?? '').trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number < ceiling ? number : null;
}

export function normalize(row, sourceId) {
  const date = row['观测日期'];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date).toISOString().slice(0,10) !== date) throw Error('Invalid observation date');
  if (!row['统一观测ID'] || !row['平台'] || !row['房源ID']) throw Error('Missing observation identity');
  const url = new URL(row['房源URL']);
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw Error('Invalid source URL');
  // This importer accepts the audited listing CSV only; transactions need their own evidence.
  if (row['数据性质'] !== '当前挂牌，非成交') throw Error('Unsupported evidence type');
  const district = districts.find(d => row['区县'] === d || row['区县'] === `${d}区` || (d === '大鹏新区' && row['区县'] === '大鹏')) ?? null;
  const community = row['小区名称']?.trim() || null;
  return {
    id:row['统一观测ID'], sourceId, platform:row['平台'], listingId:row['房源ID'],
    observedOn:date, dateBasis:row['观测日期口径'] || '未提供日期口径', district, community,
    communityKey: district && community ? `${district}:${community}` : null,
    communityUrl:row['小区URL'] || null, rent:positive(row['月租金_元'],1000000),
    area:positive(row['面积_平方米'],2000), recordType:'挂牌',
    lease:row['出租方式']?.includes('合租') ? '合租' : row['出租方式'] === '整租' ? '整租' : '未知',
    sourceUrl:url.href, raw:row,
  };
}

export async function ingest(db, input) {
  if (!/^[a-f0-9]{64}$/.test(input.sha256) || !Array.isArray(input.rows)) throw Error('Invalid source envelope');
  const rows = input.rows.map(row => normalize(row,input.sha256));
  if (new Set(rows.map(r=>r.id)).size !== rows.length) throw Error('Duplicate observation IDs in source');
  await db.exec('BEGIN');
  try {
    await db.query(`INSERT INTO rent_sources(source_id,path,sha256,usage_terms) VALUES($1,$2,$1,$3)
      ON CONFLICT(source_id) DO NOTHING`,[input.sha256,input.sourceFile,input.usage]);
    for (const r of rows) {
      await db.query(`INSERT INTO rent_observations VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT(id) DO UPDATE SET source_id=excluded.source_id, raw=excluded.raw
        WHERE rent_observations.source_id=excluded.source_id`,
      [r.id,r.sourceId,r.platform,r.listingId,r.observedOn,r.dateBasis,r.district,r.community,r.communityKey,r.communityUrl,r.rent,r.area,r.recordType,r.lease,r.sourceUrl,JSON.stringify(r.raw)]);
      const prior = await db.query('SELECT source_id FROM rent_observations WHERE id=$1',[r.id]);
      if (prior.rows[0].source_id !== r.sourceId) throw Error('Observation identity collides with another source; use a dated revision ID');
    }
    await db.exec('COMMIT');
  } catch(error) { await db.exec('ROLLBACK'); throw error; }
  return {input:rows.length,sourceId:input.sha256};
}

export async function statistics(db) {
  const output=[];
  // Only fixed identifiers are interpolated; user filters never enter SQL text.
  for (const grain of ['year','quarter']) {
    for (const level of ['city','district','community']) {
      const group = level === 'city' ? "'深圳市'" : level === 'district' ? 'district' : 'community_key';
      const result = await db.query(`SELECT '${grain}' AS grain, '${level}' AS level,
        to_char(date_trunc('${grain}',observed_on),'YYYY-MM-DD') AS period_start,
        ${group} AS geography, record_type, lease, count(*)::integer AS observations,
        count(DISTINCT (platform,listing_id))::integer AS platform_listings,
        count(DISTINCT observed_on)::integer AS observed_days,
        min(observed_on)::text AS first_observed, max(observed_on)::text AS last_observed,
        count(*) FILTER(WHERE rent_monthly IS NOT NULL AND area_sqm IS NOT NULL)::integer AS valid_unit_rents,
        avg(rent_monthly/area_sqm) AS mean_unit_rent,
        percentile_cont(0.5) WITHIN GROUP(ORDER BY rent_monthly/area_sqm) AS median_unit_rent,
        sum(rent_monthly) FILTER(WHERE area_sqm IS NOT NULL)/nullif(sum(area_sqm) FILTER(WHERE rent_monthly IS NOT NULL),0) AS area_weighted_unit_rent,
        avg(rent_monthly) AS mean_monthly_rent,
        array_agg(DISTINCT source_id) AS source_ids
        FROM rent_observations WHERE ${group} IS NOT NULL
        GROUP BY date_trunc('${grain}',observed_on),${level === 'city' ? '' : `${group},`}record_type,lease
        ORDER BY period_start,geography,record_type,lease`);
      output.push(...result.rows);
    }
  }
  return output;
}

export async function refreshDocuments(db, stats) {
  await db.exec('BEGIN');
  try {
    // Stable cards retain embeddings until their body changes.
    for (const s of stats) {
      const id=`derived:${s.grain}:${s.level}:${s.period_start}:${s.geography}:${s.record_type}:${s.lease}`;
      const title=`深圳市 ${s.geography} ${s.period_start} ${s.grain === 'quarter' ? '季度' : '年度'}租金观测`;
      const body=`${title}；${s.record_type}；${s.lease}；挂牌观测${s.observations}条，观测${s.observed_days}天，日期${s.first_observed}至${s.last_observed}。有效单位租金样本${s.valid_unit_rents}条，算术平均${s.mean_unit_rent ?? '缺失'}，中位数${s.median_unit_rent ?? '缺失'}，单位元/平方米/月。小区按区名和原始小区名归组，未进行跨平台房屋去重。`;
      await db.query(`INSERT INTO rent_documents(id,title,body,source_url,source_id,metadata)
        VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET
        title=excluded.title, body=excluded.body, metadata=excluded.metadata,
        embedding=CASE WHEN rent_documents.body=excluded.body THEN rent_documents.embedding ELSE NULL END,
        embedding_model=CASE WHEN rent_documents.body=excluded.body THEN rent_documents.embedding_model ELSE NULL END`,[id,title,body,'anke://rent-statistics',s.source_ids[0],JSON.stringify(s)]);
    }
    await db.exec('COMMIT');
  } catch(error) {await db.exec('ROLLBACK'); throw error;}
}

export async function exportSnapshot(db, destination) {
  const stats=await statistics(db);
  await refreshDocuments(db,stats);
  const sources=(await db.query('SELECT * FROM rent_sources ORDER BY source_id')).rows;
  const counts=(await db.query(`SELECT count(*)::integer AS observations,
    count(*) FILTER(WHERE district IS NULL)::integer AS missing_district,
    count(DISTINCT community_key)::integer AS community_groups,
    min(observed_on)::text AS first_observed,max(observed_on)::text AS last_observed FROM rent_observations`)).rows[0];
  const citations=(await db.query('SELECT id,source_id,source_url,district,community,record_type,lease,observed_on::text AS observed_on FROM rent_observations ORDER BY id')).rows;
  const documents=(await db.query('SELECT id,title,body,source_url,source_id,metadata FROM rent_documents ORDER BY id')).rows;
  const snapshot={schemaVersion:1,city:'深圳市',generatedAt:new Date().toISOString(),
    historicalRange:{start:2016,end:2025},currentYear:2026,counts,sources,stats,documents,citations,
    retrieval:'lexical; vector search requires model-labelled embeddings',
    unit:'元/平方米/月',metricBasis:'挂牌观测样本；按观测日期归期；不代表全季、全市或全部小区普查'};
  await mkdir(path.dirname(destination),{recursive:true});
  const temporary=destination+'.tmp';
  await writeFile(temporary,JSON.stringify(snapshot,null,2),'utf8');
  await rename(temporary,destination);
  // The detail tool and statistics tool must expose the same imported observations.
  const detailFile=path.join(path.dirname(destination),'records.json');
  let demo=[];
  try {demo=JSON.parse(await readFile(detailFile,'utf8')).records.filter(r=>r.dataset==='demo');}
  catch(error){if(error.code!=='ENOENT')throw error;}
  const observed=(await db.query('SELECT * FROM rent_observations ORDER BY id')).rows;
  const records=observed.map(r=>({dataset:'imported',observationId:r.id,platform:r.platform,
    listingId:r.listing_id,project:r.community||'未知小区',district:r.district||'',
    area:r.area_sqm===null?null:Number(r.area_sqm),rent:r.rent_monthly===null?null:Number(r.rent_monthly),
    date:r.observed_on instanceof Date?r.observed_on.toISOString().slice(0,10):String(r.observed_on).slice(0,10),record_type:r.record_type,lease:r.lease,
    fee:null,fee_mode:'未知',address:r.raw?.['详细地址']||'',source:r.platform,url:r.source_url,
    lon:null,lat:null}));
  await writeFile(detailFile+'.tmp',JSON.stringify({city:'深圳',updatedAt:snapshot.generatedAt,
    source:'rental PostgreSQL observations',records:[...demo,...records]}),'utf8');
  await rename(detailFile+'.tmp',detailFile);
  return {counts,statisticalGroups:stats.length,documents:documents.length};
}

export async function setEmbedding(db, id, embedding, model) {
  if (!Array.isArray(embedding) || !embedding.length || embedding.length>4096 || !embedding.every(Number.isFinite) || !embedding.some(v=>v!==0) || typeof model!=='string' || !model.trim()) throw Error('Invalid embedding or model');
  const result=await db.query('UPDATE rent_documents SET embedding=$2::vector, embedding_model=$3 WHERE id=$1 RETURNING id',[id,JSON.stringify(embedding),model]);
  if (!result.rows.length) throw Error('Unknown document');
}

export async function vectorSearch(db, embedding, model, limit=5) {
  if (!Array.isArray(embedding) || !embedding.length || !embedding.every(Number.isFinite) || !embedding.some(v=>v!==0) || typeof model!=='string' || !model.trim() || !Number.isInteger(limit) || limit<1 || limit>20) throw Error('Invalid vector query');
  return (await db.query(`SELECT id,title,body,source_url,metadata,embedding <=> $1::vector AS distance
    FROM rent_documents WHERE embedding_model=$2 AND vector_dims(embedding)=$3
    ORDER BY embedding <=> $1::vector,id LIMIT $4`,[JSON.stringify(embedding),model,embedding.length,limit])).rows;
}
