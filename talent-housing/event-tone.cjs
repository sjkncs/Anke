// Tenant-oriented Chinese lexical NLP baseline, not a trained sentiment model.
// Analyze local clauses rather than treating rent increases as generic good news.
function analyze(text='') {
 const rules=[
  ['positive','租住成本降低',/(?:租金|房租|物业费|停车费).{0,8}(?:下降|下调|降低|减免|优惠)|(?:降租|免租|租金补贴|住房补贴)/g],
  ['negative','租住成本上升',/(?:租金|房租|物业费|停车费).{0,8}(?:上涨|连涨|上调|提高|增加)|涨租/g],
  ['positive','居住与配套改善',/(?:地铁|车站|学校|医院|公园|配套).{0,10}(?:开通|投用|启用|开放)|(?:噪声|污染).{0,6}(?:减少|降低|改善)|拎包入住/g],
  ['positive','住房保障改善',/(?:新增|增加|扩大).{0,8}(?:房源|住房供应|配租|保障范围)|(?:审批|申请流程).{0,8}(?:简化|提速|缩短)/g],
  ['negative','通行或居住受影响',/交通管制|交通管控|临时限行|临时交通管理|施工期间调整交通组织|封闭道路|停水|停电|噪声扰民|污染加重|延期交付|暂停配租|取消补贴/g],
 ];
 const evidence=[];
 for(const clause of String(text).slice(0,12000).split(/[。！？；;，,\n]|但是|不过|然而|但/)){
  for(const [polarity,reason,pattern] of rules){
   pattern.lastIndex=0;
   for(const match of clause.matchAll(pattern)){
    const before=clause.slice(Math.max(0,match.index-12),match.index);
    const scope=before+match[0];
    if(/(?:未|没有|并非|不会|不再|否认|尚未|不意味着|并不意味着|能否|是否|可能|如果|若|拟|计划|预计|有望)/.test(scope))continue;
    const after=clause.slice(match.index+match[0].length);
    if(/(?:结束|解除|恢复).{0,4}$/.test(after)||/^(?:已|已经)?(?:结束|解除|取消)/.test(after))continue;
    if(/^(?:未|没有|尚未|不会|并未)/.test(after))continue;
    evidence.push({polarity,reason,text:match[0]});
   }
  }
 }
 const unique=[...new Map(evidence.map(e=>[e.polarity+e.text,e])).values()];
 const pos=unique.some(e=>e.polarity==='positive'),neg=unique.some(e=>e.polarity==='negative');
 const polarity=pos&&neg?'mixed':pos?'positive':neg?'negative':'neutral';
 return {polarity,label:{positive:'利好',negative:'负面',mixed:'正负并存',neutral:'待判断'}[polarity],perspective:'租客居住体验',method:'clause-lexicon-v2',evidence:unique,estimatedRentImpact:false};
}
if(typeof module!=='undefined')module.exports={analyze};
if(typeof window!=='undefined')window.ankeEventTone={analyze};
