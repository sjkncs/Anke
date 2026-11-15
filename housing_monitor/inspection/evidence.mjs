export const palette=['#5c89b7','#c76d61','#66a382','#aa83b4','#c2a15f','#59a9b1'];
const rules={crack:['外墙裂纹线索','复拍裂纹细节并记录位置、长度和变化'],stain:['渗水或污渍线索','检查排水、接缝及雨后变化'],peeling:['表层剥落线索','核查饰面附着状况和下方通行区域'],obstruction:['通行遮挡线索','复核通道宽度及现场通行条件']};
export function validateEvidence(input){
 if(!input||typeof input!=='object'||!['su','street'].includes(input.kind))throw Error('请选择 SU 或街景来源');
 if(typeof input.assetId!=='string'||!input.assetId.trim()||input.assetId.length>160)throw Error('请填写住宅或项目名称');
 if(typeof input.source!=='string'||!input.source.trim()||input.source.length>500)throw Error('请记录图像或模型来源');
 if(!Array.isArray(input.objects)||input.objects.length>500)throw Error('分割对象数量无效');
 const ids=new Set();const objects=input.objects.map((o,index)=>{
  if(typeof o.id!=='string'||!o.id||o.id.length>100||ids.has(o.id))throw Error('对象标识重复或无效');ids.add(o.id);
  if(typeof o.label!=='string'||!o.label||o.label.length>100||!Number.isFinite(o.confidence)||o.confidence<0||o.confidence>1)throw Error('对象标签或置信度无效');
  if(!['manual','model','su-group'].includes(o.method))throw Error('请记录识别方式');
  if(!Array.isArray(o.polygon)||o.polygon.length<3||o.polygon.length>2000||o.polygon.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||v<0||v>1)))throw Error('分割轮廓应使用图像归一化坐标');
  const area=Math.abs(o.polygon.reduce((sum,p,i)=>{const next=o.polygon[(i+1)%o.polygon.length];return sum+p[0]*next[1]-next[0]*p[1];},0))/2;if(area<1e-8)throw Error('分割轮廓没有有效面积');
  const cues=o.cues||[];if(!Array.isArray(cues)||cues.some(c=>!Object.hasOwn(rules,c)))throw Error('问题线索无效');
  return {id:o.id,label:o.label,confidence:o.confidence,method:o.method,polygon:o.polygon,cues,color:palette[index%palette.length]};
 });
 return {assetId:input.assetId.trim(),kind:input.kind,source:input.source,capturedAt:typeof input.capturedAt==='string'?input.capturedAt.slice(0,40):null,objects};
}
export function assessEvidence(evidence){
 return evidence.objects.flatMap(o=>o.cues.map(cue=>({objectId:o.id,label:o.label,cue,title:rules[cue][0],action:rules[cue][1],confidence:o.confidence,status:'inspection_lead',probability:null,evidenceSource:evidence.source})));
}
export function graphQuery(evidence,findings){
 return {statement:'MERGE (b:AnkeBuilding {id:$assetId}) MERGE (s:AnkeObservation {id:$observationId}) SET s.source=$source, s.kind=$kind MERGE (b)-[:HAS_OBSERVATION]->(s) WITH s UNWIND $objects AS item MERGE (o:AnkeObject {id:$observationId+":"+item.id}) SET o.label=item.label,o.method=item.method,o.confidence=item.confidence,o.polygon=item.polygon MERGE (s)-[:CONTAINS]->(o) WITH o,item UNWIND item.cues AS cue MERGE (f:AnkeInspectionLead {id:$observationId+":"+item.id+":"+cue}) SET f.cue=cue,f.status="inspection_lead" MERGE (o)-[:HAS_LEAD]->(f)',parameters:{assetId:evidence.assetId,observationId:evidence.observationId,source:evidence.source,kind:evidence.kind,objects:evidence.objects.map(o=>({...o,polygon:JSON.stringify(o.polygon)}))}};
}
