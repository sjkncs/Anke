import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {connect, ingest, exportSnapshot, root} from './store.mjs';
const input=JSON.parse(await readFile(process.argv[2],'utf8'));
const db=await connect();
try {
  // A later page can contain already observed listings plus new ones. Do not
  // relabel old observations with a new page hash or overwrite their evidence.
  const existing=new Set((await db.query('SELECT id FROM rent_observations')).rows.map(r=>r.id));
  const fresh={...input,rows:input.rows.filter(r=>!existing.has(r['统一观测ID']))};
  const imported=fresh.rows.length?await ingest(db,fresh):{input:0,unchanged:input.rows.length};
  const exported=await exportSnapshot(db,path.resolve(root,'../anke-agent-source/apps/desktop/resources/plugins/anke.rents/data/knowledge.json'));
  console.log(JSON.stringify({imported,exported}));
} finally {await db.close();}
