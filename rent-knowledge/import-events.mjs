import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {connect,exportSnapshot} from './store.mjs';

export async function importEvents(db,data){
  if(data.schemaVersion!==1||!Array.isArray(data.events))throw Error('Invalid event snapshot');
  await db.exec(`CREATE TABLE IF NOT EXISTS rent_events(
    id text PRIMARY KEY,version integer NOT NULL,source_url text NOT NULL,
    published_at text, effective_start date,effective_end date,status text NOT NULL,
    data jsonb NOT NULL);
    CREATE TABLE IF NOT EXISTS rent_event_revisions(
    event_id text REFERENCES rent_events(id),version integer, data jsonb NOT NULL,
    PRIMARY KEY(event_id,version));`);
  await db.exec('BEGIN');
  try{
    for(const e of data.events){
      const u=new URL(e.url);
      const government=u.hostname.endsWith('.sz.gov.cn');
      const media=e.sourceKind==='media'&&['view.inews.qq.com','news.qq.com','new.qq.com'].includes(u.hostname);
      if(u.protocol!=='https:'||u.username||u.password||u.port||!(government||media)||e.rentEffect!==null||!Number.isInteger(e.version))throw Error('Invalid event provenance');
      await db.query(`INSERT INTO rent_events VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT(id) DO UPDATE SET version=excluded.version,data=excluded.data,status=excluded.status,
        effective_start=excluded.effective_start,effective_end=excluded.effective_end
        WHERE rent_events.version<=excluded.version`,
        [e.id,e.version,e.url,e.publishedAt,e.effectiveStart,e.effectiveEnd,e.status,JSON.stringify(e)]);
      await db.query(`INSERT INTO rent_event_revisions VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,[e.id,e.version,JSON.stringify(e)]);
      await db.query(`INSERT INTO rent_documents(id,title,body,source_url,metadata) VALUES($1,$2,$3,$4,$5)
        ON CONFLICT(id) DO UPDATE SET title=excluded.title,body=excluded.body,source_url=excluded.source_url,
        metadata=excluded.metadata,
        embedding=CASE WHEN rent_documents.body=excluded.body THEN rent_documents.embedding ELSE NULL END,
        embedding_model=CASE WHEN rent_documents.body=excluded.body THEN rent_documents.embedding_model ELSE NULL END`,
        ['event:'+e.id,e.title,e.body,e.url,JSON.stringify({kind:'rental_factor_event',version:e.version,
          status:e.status,sourceKind:e.sourceKind||'government',publisher:e.publisher||u.hostname,
          districts:e.districts,effectiveStart:e.effectiveStart,effectiveEnd:e.effectiveEnd,rentEffect:null})]);
    }
    await db.exec('COMMIT');
  }catch(error){await db.exec('ROLLBACK');throw error;}
  return (await db.query('SELECT count(*)::integer AS events FROM rent_events')).rows[0];
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const input=JSON.parse(await readFile(new URL('../event-monitor/data/events.json',import.meta.url),'utf8'));
  const db=await connect();
  try{console.log(JSON.stringify(await importEvents(db,input)));await exportSnapshot(db,
    fileURLToPath(new URL('../anke-agent-source/apps/desktop/resources/plugins/anke.rents/data/knowledge.json',import.meta.url)));}
  finally{await db.close();}
}
