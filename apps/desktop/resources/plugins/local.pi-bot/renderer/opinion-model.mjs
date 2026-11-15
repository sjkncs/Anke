const polarities=new Map([['positive','正向'],['neutral','中性'],['negative','负向'],['正向','正向'],['中性','中性'],['负向','负向']]);
const levels=new Set(['macro','meso','micro']);
const str=value=>typeof value==='string'?value:'';
export function normalizeOpinion(row){
 const annotation=row.anke_analysis||{},text=[row.title,row.headline,row.summary,row.content,row.text].filter(x=>typeof x==='string').join('\n');
 const sourceType=['official','media','social'].includes(row.source_type)?row.source_type:'unknown';
 const level=levels.has(annotation.level)?annotation.level:null;
 const evidence=Array.isArray(annotation.evidence)?annotation.evidence.filter(e=>typeof e==='string'&&e.length>0&&text.includes(e)):[];
 const confidence=typeof annotation.confidence==='number'&&annotation.confidence>=0&&annotation.confidence<=1&&annotation.calibration_id&&annotation.model_version&&evidence.length?annotation.confidence:null;
 const attitude=polarities.get(annotation.sentiment)||polarities.get(typeof row.sentiment==='string'?row.sentiment:row.sentiment?.label)||'待判定';
 const impact=annotation.target&&evidence.length?polarities.get(annotation.impact)||'待判定':'待判定';
 const modalities=['文本'];if(Array.isArray(row.images)&&row.images.length)modalities.push('图片');if(row.audio_url)modalities.push('音频');if(row.video_url)modalities.push('视频');
 return {sourceType,level,scene:str(annotation.scene)||'场景待标注',issue:str(annotation.issue),attitude,impact,target:str(annotation.target),horizon:str(annotation.horizon),confidence,evidence,modelVersion:str(annotation.model_version),modalities,analyzedModalities:Array.isArray(annotation.analyzed_modalities)?annotation.analyzed_modalities.filter(x=>modalities.includes(x)):['文本'],date:str(row.published_at||row.publish_time||row.date),rent:rentAssessment(row.rent_assessment)};
}
export function rentAssessment(input){
 if(!input)return null;
 const {actual,lower,upper,unit,benchmark_unit,quality_adjusted,benchmark_date,sample_size,coverage}=input;
 if(![actual,lower,upper].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>0)||lower>upper||!unit||unit!==benchmark_unit||quality_adjusted!==true||!benchmark_date||!(sample_size>0))return {label:'待评估',reason:'缺少同口径、质量调整后的租金区间'};
 return {label:actual<lower?'正向 · 低于可比区间':actual>upper?'负向 · 高于可比区间':'中性 · 位于可比区间',reason:`${actual} ${unit} · 可比区间 ${lower}–${upper} · ${benchmark_date} · ${sample_size} 个样本`,coverage:typeof coverage==='number'&&coverage>0&&coverage<1?coverage:null};
}
