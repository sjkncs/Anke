// Produce a local, minimized public-listing snapshot; no credentials or raw source fields.
const fs=require('node:fs'),path=require('node:path');
const source=path.resolve(__dirname,'../anke-agent-source/apps/desktop/resources/plugins/anke.rents/data/records.json');
const raw=JSON.parse(fs.readFileSync(source,'utf8'));
const rows=raw.records.filter(r=>r.dataset==='imported').map(r=>({project:r.project,district:r.district||'',source:r.source||'',date:r.date,record_type:r.record_type,lease:r.lease,area:r.area,rent:r.rent,id:r.listingId||r.sourceFields?.['房源ID']||null}));
fs.writeFileSync(path.join(__dirname,'research-data.js'),'window.ANKE_RENT_SNAPSHOT='+JSON.stringify({generatedAt:new Date().toISOString(),sourceUpdatedAt:raw.updatedAt||null,rows})+';\n');
console.log('Generated minimized rental snapshot:',rows.length,'observations');
