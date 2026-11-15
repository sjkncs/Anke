'use strict';
// Read public documentation as text. Never evaluate its JavaScript or examples.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const SOURCE='https://ffd.findesk.cn/api-docs/cookbook';
function templateText(raw){
 if(raw.includes('${'))throw Error('Interpolated documentation template requires manual review');
 return raw.replace(/\\(\\|`|\$|n|r|t)/g,(_,c)=>({n:'\n',r:'\r',t:'\t'}[c]??c));
}
function extract(source){
 const start=source.indexOf('x=[{key:"history",badge:'),end=source.indexOf('}],U=',start);
 if(start<0||end<0)throw Error('Cookbook structure changed');
 const block=source.slice(start,end+2),pattern=/\{key:"([^"\\]+)",badge:"([^"\\]+)",title:"([^"\\]+)",desc:"([^"\\]+)",detail:"((?:\\.|[^"\\])*)",[\s\S]*?code:`((?:\\[\s\S]|[^`])*)`\}/g;
 const scenarios=[...block.matchAll(pattern)].map(m=>({id:m[1],badge:m[2],title:m[3],summary:m[4],detail:JSON.parse('"'+m[5]+'"'),code:templateText(m[6])}));
 if(scenarios.length<20||new Set(scenarios.map(s=>s.id)).size!==scenarios.length||!scenarios.some(s=>s.id==='macroSeries'&&s.code.includes('YOUR_EDB_CODE')))throw Error('Incomplete cookbook extraction');
 return scenarios;
}
async function read(url){const r=await fetch(url,{signal:AbortSignal.timeout(25000),redirect:'error'});if(!r.ok)throw Error('Documentation HTTP '+r.status);return r.text();}
async function sync(){
 const html=await read(SOURCE),entry=html.match(/src="(\/assets\/index-[\w-]+\.js)"/);if(!entry)throw Error('Documentation entry asset missing');
 const index=await read(new URL(entry[1],SOURCE)),hub=index.match(/assets\/ApiDocsHub-[\w-]+\.js/);if(!hub)throw Error('Cookbook asset missing');
 const asset=new URL('/'+hub[0],SOURCE).href,source=await read(asset),scenarios=extract(source);
 const data={source:SOURCE,asset,retrievedAt:new Date().toISOString(),sha256:crypto.createHash('sha256').update(source).digest('hex'),templatesExecuted:false,scenarios};
 const file=path.join(__dirname,'data/findesk-cookbook.json'),temp=file+'.tmp';await fs.writeFile(temp,JSON.stringify(data,null,2)+'\n');await fs.rename(temp,file);
 console.log(JSON.stringify({scenarios:scenarios.length,source:SOURCE,templatesExecuted:false}));
}
module.exports={extract,templateText};if(require.main===module)sync().catch(e=>{console.error(e.message);process.exitCode=1;});
