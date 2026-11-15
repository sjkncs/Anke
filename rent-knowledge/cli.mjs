import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {connect,ingest,exportSnapshot,root,setEmbedding,vectorSearch} from './store.mjs';
const require=createRequire(import.meta.url);
const plugin=path.resolve(root,'../anke-agent-source/apps/desktop/resources/plugins/anke.rents');
const {knowledge}=require(path.join(plugin,'knowledge.cjs'));
const [command,argument]=process.argv.slice(2);
if(command==='query') {
  console.log(JSON.stringify(knowledge(JSON.parse(argument||'{}')),null,2));
} else {
  const db=await connect();
  try {
    let result;
    if(command==='ingest')result=await ingest(db,JSON.parse(await readFile(argument,'utf8')));
    else if(command==='export')result=await exportSnapshot(db,path.join(plugin,'data/knowledge.json'));
    else if(command==='embed') {
      const items=JSON.parse(await readFile(argument,'utf8'));
      await db.exec('BEGIN');
      try {for(const item of items)await setEmbedding(db,item.id,item.embedding,item.model);await db.exec('COMMIT');}
      catch(error){await db.exec('ROLLBACK');throw error;}
      result={embedded:items.length};
    } else if(command==='vector-search') {
      const q=JSON.parse(argument);result=await vectorSearch(db,q.embedding,q.model,q.limit);
    } else throw Error('Use ingest <JSON>, export, query <JSON>, embed <JSON> or vector-search <JSON>');
    console.log(JSON.stringify(result,null,2));
  } finally {await db.close();}
}
