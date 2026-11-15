import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {connect,ingest,root} from './store.mjs';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {knowledge}=require('../anke-agent-source/apps/desktop/resources/plugins/anke.rents/knowledge.cjs');
const db=await connect();
try {
  const before=(await db.query('SELECT count(*)::integer AS n FROM rent_observations')).rows[0].n;
  await ingest(db,JSON.parse(await readFile(path.join(root,'data/input.json'),'utf8')));
  const after=(await db.query('SELECT count(*)::integer AS n FROM rent_observations')).rows[0].n;
  assert.equal(before,1465);assert.equal(after,before);
  const coverage=knowledge({action:'coverage'});
  assert.equal(coverage.periods.filter(p=>p.year<=2025&&p.observations>0).length,0);
  assert.equal(coverage.counts.missing_district,211);
  const answers=knowledge({action:'statistics',grain:'quarter',level:'district',year:2026,quarter:4,district:'南山',lease:'整租'});
  const sql=(await db.query("SELECT avg(rent_monthly/area_sqm) AS mean FROM rent_observations WHERE district='南山' AND lease='整租' AND observed_on >= '2026-10-01' AND observed_on < '2027-01-01'")).rows[0].mean;
  assert.equal(answers.results[0].mean_unit_rent,sql);
  assert.ok(answers.citations.every(c=>c.district==='南山'&&c.lease==='整租'));
  const community=knowledge({action:'statistics',grain:'year',level:'community',year:2026,community:'招商玺家园',lease:'整租'});
  assert.ok(community.total>0);
  const search=knowledge({action:'search',query:'南山租金',year:2026,lease:'整租'});
  assert.ok(search.total>0);
  const report={checkedAt:new Date().toISOString(),status:'PASS',counts:coverage.counts,
    historicalQuarters2016To2025:40,historicalQuartersWithObservations:0,
    idempotentImport:true,sqlAndAgentMeanMatch:true,communityQuery:community.results,
    districtQuery:answers.results,lexicalSearchMatches:search.total,
    vectorExtension:(await db.query("SELECT extversion FROM pg_extension WHERE extname='vector'")).rows[0],
    serverPostgres:'NOT_TESTED',realSemanticEmbeddings:'NOT_LOADED',desktopProviderChat:'NOT_TESTED'};
  await mkdir(path.join(root,'artifacts'),{recursive:true});
  await writeFile(path.join(root,'artifacts/acceptance.json'),JSON.stringify(report,null,2),'utf8');
  console.log(JSON.stringify(report,null,2));
} finally {await db.close();}
