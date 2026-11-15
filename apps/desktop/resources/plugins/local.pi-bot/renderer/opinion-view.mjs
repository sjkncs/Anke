import {el} from './dom.mjs';
import {normalizeOpinion} from './opinion-model.mjs';
const sourceNames={official:'官方发布',media:'媒体报道',social:'社交媒体',unknown:'来源待核验'};
const levelNames={macro:'宏观 · 政策与市场',meso:'中观 · 行业与片区',micro:'微观 · 企业与房源'};
function chip(text,kind){return el('span',text,'op-chip op-'+kind);}
export function addOpinionLabels(row,summary,body){
 const info=normalizeOpinion(row),tags=el('div','','op-tags');
 tags.append(chip(sourceNames[info.sourceType],info.sourceType),chip(info.scene,'scene'));
 if(info.issue)tags.append(chip(info.issue,'issue'));
 tags.append(chip('情绪 '+info.attitude,info.attitude==='正向'?'positive':info.attitude==='负向'?'negative':'neutral'),chip(info.confidence===null?'置信度待校准':`置信度 ${(info.confidence*100).toFixed(0)}%`,'confidence'));
 if(info.date)tags.append(chip(info.date,'date'));for(const m of info.modalities)tags.append(chip(m,'modality'));summary.append(tags);
 const assessment=el('section','','op-assessment');assessment.append(el('h4','影响与证据'),el('p',`${info.target||'对象待明确'} · ${info.horizon||'时间范围待明确'} · 影响${info.impact}`));
 if(info.rent)assessment.append(el('p','租金合理度：'+info.rent.label),el('p',info.rent.reason));
 if(info.evidence.length)for(const quote of info.evidence)assessment.append(el('blockquote',quote));else assessment.append(el('p','暂无可核对的判断依据'));
 if(info.modalities.length>1)assessment.append(el('p','已分析：'+info.analyzedModalities.join('、')));
 if(info.modelVersion)assessment.append(el('p','分析版本：'+info.modelVersion));body.append(assessment);return info;
}
export function installOpinionFilters(host,feed,search,items){
 const toolbar=el('div','','op-controls'),levelLabel=el('label','观察尺度'),slider=el('input');slider.type='range';slider.min='0';slider.max='3';slider.value='0';slider.step='1';slider.setAttribute('aria-label','观察尺度');const scaleText=el('span','全部尺度');levelLabel.append(slider,scaleText);
 const selections=[];
 function select(name,entries){const wrap=el('label',name),input=el('select');input.setAttribute('aria-label',name);for(const [value,text] of entries){const option=el('option',text);option.value=value;input.append(option);}wrap.append(input);toolbar.append(wrap);selections.push(input);return input;}
 toolbar.append(levelLabel);const source=select('来源类型',[['','全部来源'],...Object.entries(sourceNames)]),attitude=select('情感态度',[['','全部态度'],...['正向','中性','负向','待判定'].map(x=>[x,x])]),scene=select('场景问题',[['','全部场景'],...[...new Set(items.map(x=>x.info.scene))].map(x=>[x,x])]);
 const count=el('p','','op-count');count.setAttribute('role','status');
 function filter(){const level=['','macro','meso','micro'][Number(slider.value)],q=search.value.trim().toLowerCase();scaleText.textContent=level?levelNames[level]:'全部尺度';slider.setAttribute('aria-valuetext',scaleText.textContent);let visible=0;
  for(const {node,info} of items){const show=(!level||info.level===level)&&(!source.value||source.value===info.sourceType)&&(!attitude.value||attitude.value===info.attitude)&&(!scene.value||scene.value===info.scene)&&node.textContent.toLowerCase().includes(q);node.hidden=!show;if(show)visible++;}count.textContent=`${visible} / ${items.length} 条 · 仅代表当前返回样本`;
 }slider.oninput=filter;search.oninput=filter;selections.forEach(n=>n.onchange=filter);host.prepend(toolbar,count);filter();
}
