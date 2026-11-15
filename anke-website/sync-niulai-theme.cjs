// One palette source, delivered through already allowlisted CSS assets.
const fs=require('node:fs'),path=require('node:path');
const root=path.dirname(__dirname),theme=fs.readFileSync(path.join(__dirname,'niulai-theme.css'),'utf8');
const targets=['anke-website/home.css','anke-website/site.css','anke-website/research.css','housing_monitor/style.css','anke-agent-source/apps/desktop/resources/plugins/anke.rents/renderer/housing-presentation.css'];
const marker='/* BEGIN ANKE NIULAI PALETTE */';
for(const relative of targets){const file=path.join(root,relative),current=fs.readFileSync(file,'utf8'),base=current.split(marker)[0].trimEnd();const backup=path.join(__dirname,'previews','palette-backup',relative.replaceAll('/','__'));if(!fs.existsSync(backup)){fs.mkdirSync(path.dirname(backup),{recursive:true});fs.copyFileSync(file,backup);}fs.writeFileSync(file,base+'\n'+marker+'\n'+theme+'\n/* END ANKE NIULAI PALETTE */\n');console.log(relative);}
