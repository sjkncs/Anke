// Computed classification audit of a frozen local snapshot, not human labels.
const fs=require('node:fs');
const path=require('node:path');
const {analyze}=require('./event-tone.cjs');
const snapshot=JSON.parse(fs.readFileSync(path.join(__dirname,'../event-monitor/data/events.json'),'utf8'));
const events=snapshot.events.map(event=>({id:event.id,title:event.title,url:event.url,publishedAt:event.publishedAt,source:event.publisher,status:event.status,analysis:analyze(event.title+'。'+(event.evidence||[]).join('；'))}));
const counts={positive:0,negative:0,mixed:0,neutral:0};for(const event of events)counts[event.analysis.polarity]++;
const result={snapshotGeneratedAt:snapshot.generatedAt,method:'clause-lexicon-v2',humanValidated:false,counts,events};
fs.writeFileSync(path.join(__dirname,'data/event-tone-audit.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({snapshotGeneratedAt:result.snapshotGeneratedAt,humanValidated:false,counts}));
