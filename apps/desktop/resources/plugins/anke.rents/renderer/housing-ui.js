(() => {
  const $=id=>document.getElementById(id),make=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  const api=input=>window.pluginBridge.invoke('rents.housing',input);
  let state={applications:[],units:[],orders:[]},editing=null,activeOrder=null,preview=null,request=0;
  const today=()=>new Date().toLocaleDateString('en-CA');
  const labels={matched:'符合需求',needs_verification:'待核实',excluded:'未满足必要条件',available:'可供',repair:'维修',reserved:'预留',occupied:'已入住',government:'政府房源',university:'高校房源',education:'子女教育',medical:'医疗',care:'家庭照护',stability:'居住稳定',environment:'周边环境',furnishing:'家具家电',furnishing_required:'需配齐家具家电',setup_cost:'入住配置费用',setup_budget:'入住配置超过预算',long_term_evidence:'长期条件',unit_not_available:'房源不可供',housing_type:'住房类型',cost_limit:'超过月支出预算',commute_limit:'超过通勤上限',bedroom_limit:'卧室不足',move_in_limit:'交付时间',elevator_required:'需有电梯',total_cost:'月固定支出',commute:'通勤',bedrooms:'卧室',available_date:'交付日期',elevator:'电梯',quality:'品质'};
  const stages={submitted:'申请受理',materials_checked:'材料检查',review_pending:'等待审核',reviewed:'审核已记录',matching:'住房推荐',selection:'确认选房',contract_pending:'合同办理',move_in_pending:'等待入住',completed:'入住办结'};
  const show=v=>labels[v]??v,fmt=n=>n==null?'待核实':Number(n).toLocaleString('zh-CN',{maximumFractionDigits:1});
  function run(fn){return async event=>{event?.preventDefault();try{$('status').textContent='';await fn();}catch(e){$('status').textContent=e.message;}};}
  function row(parent,a,b){const r=make('div');r.className='summary-row';r.append(make('span',a),make('span',b));parent.append(r);}
  function empty(parent,text){const n=make('div',text);n.className='empty-state';parent.replaceChildren(n);}
  function options(id,records,selected){const el=$(id);el.replaceChildren(...records.map(r=>{const o=make('option',r.label??r.subject??r.project);o.value=r.id;return o;}));if(records.some(r=>r.id===selected))el.value=selected;}
  function dataTable(id,heads,rows){const table=make('table'),thead=make('thead'),tr=make('tr'),body=make('tbody');heads.forEach(h=>tr.append(make('th',h)));thead.append(tr);for(const values of rows){const r=make('tr');for(const value of values){const c=make('td');if(value instanceof Node)c.append(value);else c.textContent=value??'—';r.append(c);}body.append(r);}table.append(thead,body);$(id).replaceChildren(table);}
  function metric(label,value){const n=make('div');n.className='metric';n.append(make('span',label),make('strong',value));return n;}
  function tab(id){document.querySelector(`[data-tab="${id}"]`).click();}
  async function load(){
    state=await api({action:'workspace'});
    for(const id of ['candidate','overviewCandidate','profileSelect','orderCandidate'])options(id,state.applications,$(id).value);
    options('orderSelect',state.orders,$('orderSelect').value);
    $('housingMetrics').replaceChildren(metric('可供住房',state.units.filter(u=>u.status==='available').length),metric('政府与高校项目',new Set(state.units.map(u=>u.project)).size),metric('已登记需求',state.applications.length),metric('办理中工单',state.orders.filter(o=>o.stage!=='completed').length));
    $('supplySummary').replaceChildren();for(const provider of ['government','university'])row($('supplySummary'),show(provider),state.units.filter(u=>u.supply.provider===provider&&u.status==='available').length+' 套');
    row($('supplySummary'),'坐标已核实',state.units.filter(u=>u.location).length+' 套');
    $('orderSummary').replaceChildren();for(const [stage,label]of Object.entries(stages)){const n=state.orders.filter(o=>o.stage===stage).length;if(n)row($('orderSummary'),label,n+' 件');}if(!state.orders.length)empty($('orderSummary'),'暂无办理事项');
    dataTable('supplyTable',['项目','房源编号','供应方','状态','月租金 · 元','固定费用 · 元','核实日期'],state.units.map(u=>[u.project,u.id,show(u.supply.provider),show(u.status),fmt(u.rent),fmt(u.fees),u.supply.verifiedOn]));
    window.updateHousingSpatial?.(state.units);await top();
  }
  async function top(){const sequence=++request,id=$('overviewCandidate').value;if(!id){empty($('topMatches'),'登记候选人后推荐');return;}
    const r=await api({action:'search_homes',applicationId:id});if(sequence!==request)return;
    const rows=r.results.filter(x=>x.state==='matched').slice(0,3);$('topMatches').replaceChildren();
    for(const r of rows){const box=make('div');box.className='compact-home';box.append(make('strong',r.project));row(box,'短期适配',fmt(r.shortTerm));row(box,'长期适配',fmt(r.longTerm));$('topMatches').append(box);}
    if(!rows.length)empty($('topMatches'),'暂无已核实的适配房源');
  }
  async function search(){const id=$('candidate').value;if(!id)throw Error('请先登记候选人画像');
    const a=state.applications.find(a=>a.id===id),r=await api({action:'search_homes',applicationId:id,query:$('housingQuery').value,sort:$('housingSort').value});
    $('candidateSummary').replaceChildren(...[a.label,'月支出上限 '+fmt(a.maxCost)+' 元','通勤上限 '+fmt(a.maxCommute)+' 分钟','最迟入住 '+a.latestMoveIn].map(t=>make('span',t)));
    $('homeResults').replaceChildren();for(const x of r.results){
      const card=make('article');card.className='home-card';card.append(make('h2',x.project));row(card,show(x.supply.provider),show(x.state));
      const scores=make('div');scores.className='scores';for(const [label,n]of [['综合适配',x.score],['短期优势',x.shortTerm],['长期适配',x.longTerm]]){const c=make('div');c.append(make('span',label),make('strong',fmt(n)));scores.append(c);}card.append(scores);
      row(card,'月固定支出',fmt(x.totalCost)+' 元');row(card,'通勤',fmt(x.commute)+' 分钟');row(card,'入住配置',fmt(x.setupCost)+' 元');
      for(const e of x.evidence){const line=make('div',show(e.factor)+'：'+fmt(e.score)+'　'+e.source);line.className='evidence';card.append(line);}
      for(const e of x.future){const line=make('div','规划中 · '+show(e.factor)+'：'+e.source);line.className='evidence';card.append(line);}
      if(x.blocked.length)row(card,'未满足',x.blocked.map(show).join('、'));if(x.unknown.length)row(card,'待核实',x.unknown.map(show).join('、'));
      row(card,'房源依据',x.supply.reference);
      const map=make('button','查看位置');map.onclick=run(()=>window.pluginBridge.invoke('rents.openMap',{url:'https://map.baidu.com/search/'+encodeURIComponent('深圳'+x.project)}));card.append(map);$('homeResults').append(card);
    }if(!r.results.length)empty($('homeResults'),'暂无匹配的政府或高校房源');
  }
  function field(key,label,value,type='text',choices){
    const wrapper=make('label',label),input=make(choices?'select':'input');input.id='p-'+key;input.name=key;
    if(choices)for(const [v,l]of choices){const o=make('option',l);o.value=v;input.append(o);}else{input.type=type;if(type==='number'){input.min='0';input.step='any';}}
    input.value=value??'';wrapper.append(input);$('profileForm').append(wrapper);return input;
  }
  function section(text){const h=make('h3',text);h.className='form-section';$('profileForm').append(h);}
  function edit(a){editing=a??null;const r=a??{},p=r.profile??{};$('profileForm').replaceChildren();
    field('id','脱敏编号',r.id).readOnly=!!a;field('label','候选人代称',r.label);field('ruleVersion','配租规则版本',r.ruleVersion);
    field('eligibility','已记录资格',r.eligibility??'pending','text',[['pending','待核验'],['verified','已核验'],['ineligible','不符合资格']]);field('priority','既定优先顺序',r.priority,'number');field('submittedOn','申请日期',r.submittedOn??today(),'date');
    section('入住条件');field('allowedTypes','可申请住房类型',r.allowedTypes?.join('，'));field('maxCost','每月固定支出上限 · 元',r.maxCost,'number');field('maxCommute','最长通勤 · 分钟',r.maxCommute,'number');field('minBedrooms','最少卧室',r.minBedrooms,'number');field('latestMoveIn','最迟入住',r.latestMoveIn,'date');field('needsElevator','电梯要求',String(r.needsElevator??false),'text',[['false','不限'],['true','必须有']]);field('needsFurnished','家具家电',String(p.needsFurnished??false),'text',[['false','不限'],['true','配齐入住']]);field('maxSetupCost','入住配置预算 · 元',p.maxSetupCost,'number');
    section('短期偏好权重');for(const [k,l]of [['commute','通勤'],['cost','费用'],['space','空间'],['quality','住房品质']])field('w-'+k,l,r.weights?.[k]??0,'number');
    section('长期居住偏好');field('longTermShare','长期偏好占比 · %',(p.longTermShare??0)*100,'number');for(const k of ['education','medical','care','stability','environment'])field('l-'+k,show(k),p.longTermWeights?.[k]??0,'number');
    const b=make('button','保存画像');b.type='submit';$('profileForm').append(b);
  }
  $('profileForm').onsubmit=run(async()=>{
    const v=k=>$('p-'+k).value.trim(),num=k=>v(k)===''?null:Number(v(k));
    const record={...editing,id:v('id'),label:v('label'),ruleVersion:v('ruleVersion'),eligibility:v('eligibility'),priority:num('priority'),submittedOn:v('submittedOn'),allowedTypes:v('allowedTypes').split(/[,，]/).map(t=>t.trim()).filter(Boolean),maxCost:num('maxCost'),maxCommute:num('maxCommute'),minBedrooms:num('minBedrooms'),latestMoveIn:v('latestMoveIn'),needsElevator:v('needsElevator')==='true',weights:Object.fromEntries(['commute','cost','space','quality'].map(k=>[k,num('w-'+k)])),workflow:editing?.workflow??{events:[]},profile:{needsFurnished:v('needsFurnished')==='true',longTermShare:num('longTermShare')/100,longTermWeights:Object.fromEntries(['education','medical','care','stability','environment'].map(k=>[k,num('l-'+k)]))}};
    if(num('maxSetupCost')!==null)record.profile.maxSetupCost=num('maxSetupCost');
    const saved=await api({action:'save',kind:'application',record});await load();$('profileSelect').value=saved.id;edit(saved);$('status').textContent='画像已保存';
  });
  function orderView(){
    activeOrder=state.orders.find(o=>o.id===$('orderSelect').value)??null;const o=activeOrder;
    $('orderForm').hidden=!!o;$('advanceForm').hidden=!o||o.stage==='completed';$('orderTimeline').replaceChildren();if(!o)return;
    for(const [key,label]of Object.entries(stages)){const n=make('div'),event=o.events.find(e=>e.stage===key);n.className='order-stage'+(event?' done':'')+(o.stage===key?' current':'');n.append(make('span',label),make('span',event?.on??'待办理'));$('orderTimeline').append(n);}
    $('orderDate').value=today();const next=Object.keys(stages)[Object.keys(stages).indexOf(o.stage)+1];$('advanceOrder').textContent=({materials_checked:'检查材料',review_pending:'转入审核',reviewed:'记录审核结果',matching:'生成住房推荐',selection:'确认选房',contract_pending:'转入合同办理',move_in_pending:'登记合同凭据',completed:'登记入住回执'})[next]??'已办结';
    $('materialsField').hidden=next!=='materials_checked';$('receiptField').hidden=!['reviewed','move_in_pending','completed'].includes(next);$('unitField').hidden=next!=='selection';
    options('orderUnit',state.units.filter(u=>u.status==='available'),o.selectedUnitId);
  }
  $('orderForm').onsubmit=run(async()=>{
    const a=$('orderCandidate').value;if(!a)throw Error('请先登记候选人画像');
    const o=await api({action:'create_order',order:{id:'HX-'+crypto.randomUUID().slice(0,12),applicationId:a,subject:$('orderSubject').value,actor:'住小智',on:today(),transcript:$('orderTranscript').value,transcriptSource:$('orderSource').value}});
    await load();$('orderSelect').value=o.id;orderView();
  });
  $('advanceForm').onsubmit=run(async()=>{
    const o=activeOrder;if(!o)throw Error('请先选择工单');
    const next=Object.keys(stages)[Object.keys(stages).indexOf(o.stage)+1];
    const input={action:'advance_order',id:o.id,revision:o.revision,on:$('orderDate').value,actor:$('orderActor').value,execution:'operator'};
    if(next==='materials_checked')input.materials=$('orderMaterials').value.split('\n').map(t=>t.trim()).filter(Boolean).map(name=>({name,status:'received'}));
    if(next==='reviewed'){input.decision='verified';input.receipt=$('orderReceipt').value;}
    if(['move_in_pending','completed'].includes(next))input.receipt=$('orderReceipt').value;
    if(next==='selection')input.unitId=$('orderUnit').value;
    await api(input);await load();orderView();$('orderReceipt').value='';
  });
  $('supplyFile').onchange=run(async()=>{
    const file=$('supplyFile').files[0];if(!file)return;if(file.size>180000)throw Error('房源文件过大，请分批接入');
    const parsed=JSON.parse(await file.text());preview=Array.isArray(parsed)?parsed:parsed.records;if(!Array.isArray(preview)||!preview.length)throw Error('房源文件为空');
    dataTable('previewTable',['房源编号','项目','供应方','核实日期'],preview.map(u=>[u.id,u.project,show(u.supply?.provider),u.supply?.verifiedOn]));$('importPreview').hidden=false;
  });
  $('confirmImport').onclick=run(async()=>{await api({action:'import_supply',records:preview});preview=null;$('importPreview').hidden=true;$('supplyFile').value='';await load();$('status').textContent='房源已接入';});
  $('cancelImport').onclick=()=>{preview=null;$('importPreview').hidden=true;$('supplyFile').value='';};
  $('supplyTemplate').onclick=()=>{
    const template={records:[],fields:{id:'房源唯一编号',project:'项目名称',type:'住房类型',status:['available','repair','reserved','occupied'],source:'房源原始出处',rent:'元/户/月，未知填null',fees:'固定费用，未知填null',bedrooms:'卧室数，未知填null',elevator:'true/false/null',availableOn:'YYYY-MM-DD或null',quality:'已有品质评价0-100或null',commute:{'候选人编号':'通勤分钟或null'},supply:{provider:['government','university'],reference:'政府或高校台账凭据',verifiedOn:'YYYY-MM-DD'},location:{longitude:'已核实经度',latitude:'已核实纬度',crs:'BD09'},furnished:'true/false/null',setupCost:'入住配置支出或null',factors:{education:{score:'0-100',source:'适用家庭教育条件依据',verifiedOn:'YYYY-MM-DD',status:['current','planned']}}}};
    const url=URL.createObjectURL(new Blob([JSON.stringify(template,null,2)],{type:'application/json'})),a=make('a');a.href=url;a.download='政府高校房源字段模板.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  $('overviewCandidate').onchange=run(top);$('overviewSearch').onclick=run(async()=>{$('candidate').value=$('overviewCandidate').value;tab('matching');await search();});$('searchHomes').onclick=run(search);
  $('profileSelect').onchange=()=>edit(state.applications.find(a=>a.id===$('profileSelect').value));$('newProfile').onclick=()=>edit();$('orderSelect').onchange=orderView;$('newOrder').onclick=()=>{activeOrder=null;$('orderSelect').value='';$('orderForm').hidden=false;$('advanceForm').hidden=true;$('orderTimeline').replaceChildren();};
  $('spatialMap').onclick=run(()=>window.pluginBridge.invoke('rents.openMap',{url:'https://map.baidu.com'}));
  const baseRefresh=$('refresh').onclick;$('refresh').onclick=run(async()=>{await baseRefresh();await load();});
  document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{const market=['ledger','projects','scenario','map','events'].includes(b.dataset.tab);document.querySelector('.filters').hidden=!market;}));document.querySelector('.filters').hidden=true;
  run(async()=>{await load();edit(state.applications[0]);orderView();})().then(()=>{window.housingReady=true;});
})();
