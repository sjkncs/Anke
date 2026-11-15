const fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'data/address-overrides.json');
function read(destination=file){try{return JSON.parse(fs.readFileSync(destination,'utf8')).projects||[];}catch(e){if(e.code==='ENOENT')return [];throw e;}}
function enrich(rows){const projects=[...read(),...JSON.parse(fs.readFileSync(path.join(__dirname,'data/project-addresses.json'),'utf8')).projects];return rows.map(row=>{const r={...row};if(r.dataset!=='imported')return r;const match=projects.find(p=>p.district===r.district&&p.names.includes(r.project));if(match){if(!r.address&&match.address){r.address=match.address;r.addressSource=match.source;}if(!r.street&&match.street){r.street=match.street;r.streetSource=match.source;}}
 if(!r.street){const text=[r.sourceFields?.乡镇街道,r.sourceFields?.街道,r.address,r.position].filter(Boolean).join(' '),m=text.match(/([\u4e00-\u9fff]{2,6}街道)/);if(m){r.street=m[1].split(/[区市]/).at(-1);r.streetSource={name:'原始地址字段',url:r.url||''};}}
 const clue=require('./reference.cjs').referenceClue(r);
 if(clue){r.referenceClue=clue;if(!r.address&&clue.address){r.address=clue.address;r.addressSource={name:'安居客小区参考 · 2026-08 · 同区同名待实体核验',referenceId:clue.id,sourceHash:clue.sourceHash};}}
 return r;});}
function save(input,destination=file){const {project,district,address,source,street,location}=input||{};
 if(typeof project!=='string'||!project.trim()||project.length>200||!require('./query.cjs').districts.includes(district)||typeof address!=='string'||!address.trim()||address.length>500)throw Error('Invalid shared residential address');
 const projects=read(destination),value={names:[project],district,address,source:{name:typeof source==='string'?source.slice(0,300):'用户确认地图地点'},updatedAt:new Date().toISOString()};
 if(typeof street==='string'&&/^[\u4e00-\u9fff]{2,6}街道$/.test(street))value.street=street;
 if(location&&['GCJ02','BD09','BD09MC','WGS84'].includes(location.crs)&&Number.isFinite(location.longitude)&&Number.isFinite(location.latitude))value.location=location;
 const i=projects.findIndex(p=>p.district===district&&p.names.includes(project));if(i<0)projects.push(value);else projects[i]=value;
 fs.writeFileSync(destination+'.tmp',JSON.stringify({schemaVersion:1,projects},null,2));fs.renameSync(destination+'.tmp',destination);return {saved:true,project,district,address};
}
module.exports={enrich,save};
