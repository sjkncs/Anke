import {readFile,writeFile,mkdir} from 'node:fs/promises';
const base=new URL('./policy-data/',import.meta.url);const catalog=JSON.parse(await readFile(new URL('sources.json',base),'utf8'));
const index=new URL('./policy.mjs',import.meta.url);const {buildPolicyIndex}=await import(index.href);const chunks=buildPolicyIndex(catalog).chunks;
const rows=catalog.documents.filter(d=>d.status==='collected').map(d=>{
 const regulation=catalog.documents.find(r=>r.kind==='regulation'&&r.category===d.category);
 // Lexical article candidates assist reviewers; no policy equivalence is inferred.
 const terms=[...new Set((d.title.match(/[\u4e00-\u9fff]+/g)||[]).flatMap(s=>Array.from({length:Math.max(0,s.length-1)},(_,i)=>s.slice(i,i+2))))];
 const candidates=d.kind==='official_faq'&&regulation?chunks.filter(c=>c.sourceId===regulation.id).map(c=>({section:c.section,score:terms.filter(t=>c.text.includes(t)).length,chunkId:c.id})).filter(c=>c.score>=3).sort((a,b)=>b.score-a.score).slice(0,3):[];
 return {id:d.id,title:d.title,category:d.category,publishedOn:d.publishedOn??null,url:d.url,textSha256:d.textSha256,historicalOnly:!!d.historicalOnly,regulationCandidate:regulation?.id??null,articleCandidates:candidates,sourceValidity:'pending_department_review',answerReview:'pending',reviewer:null,reviewedOn:null,notes:null};
});
const dir=new URL('./review/',base);await mkdir(dir,{recursive:true});const generated={generatedAt:new Date().toISOString(),purpose:'候选关联供审核，不代表条款等价或现行有效',rows};
await writeFile(new URL('source-review.generated.json',dir),JSON.stringify(generated,null,2));
const cols=['id','title','category','publishedOn','url','historicalOnly','regulationCandidate','articleCandidates','sourceValidity','answerReview','reviewer','reviewedOn','notes'];
const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
await writeFile(new URL('source-review.generated.csv',dir),'\ufeff'+[cols.join(','),...rows.map(r=>cols.map(k=>cell(k==='articleCandidates'?r[k].map(c=>c.section).join('；'):r[k])).join(','))].join('\r\n'));
console.log(JSON.stringify({reviewRows:rows.length,pending:rows.length,candidateAssociations:rows.filter(r=>r.articleCandidates.length).length}));
