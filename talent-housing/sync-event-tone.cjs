// Build the native plugin asset from shared classifier/UI sources.
// Preserve the existing presentation script and archive it before replacement.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const target=path.join(root,'anke-agent-source/apps/desktop/resources/plugins/anke.rents/renderer/housing-presentation.js');
const marker='\n/* ANKE SHARED EVENT TONE BUILD */\n';
const current=fs.readFileSync(target,'utf8');
const base=current.split(marker)[0];
const shared=['event-tone.cjs','event-semantic-data.js','event-tone-ui.js','ai-reading-ui.js'].map(name=>fs.readFileSync(path.join(__dirname,name),'utf8')).join('\n;\n');
const built=base+marker+';\n'+shared;
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
if(built!==current){
 const folder=path.join(root,'backups','event-tone-'+new Date().toISOString().replace(/[:.]/g,'-'));
 fs.mkdirSync(folder,{recursive:true});
 fs.copyFileSync(target,path.join(folder,'housing-presentation.js'));
 fs.writeFileSync(target,built);
 console.log(JSON.stringify({changed:true,backup:folder,sha256:hash(built)}));
}else console.log(JSON.stringify({changed:false,sha256:hash(built)}));
if(!fs.readFileSync(target,'utf8').endsWith(shared))throw Error('Shared source verification failed');
