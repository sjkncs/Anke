import {el} from './dom.mjs';
import {renderWealthVisuals} from './wealth-visuals.mjs';
import {observationLoop} from './opinion-poll.mjs';
const LABELS={action:'操作',portfolio_id:'组合',name:'名称',initial_funds:'初始模拟资金',direction:'方向',amount:'金额',date:'日期',orders:'模拟交易记录',order_mode:'记账方式',auto_add_cash:'补充模拟资金',remark:'备注',idempotency_key:'操作编号',format:'展示格式',function:'查询类型',codes:'证券代码',symbol:'证券代码',indicators:'指标',fields:'字段',start_date:'开始日期',end_date:'结束日期',query:'查询内容',q:'关键词',limit:'数量',days:'天数',market:'市场',params:'查询参数',options:'选项',coverage_policy:'覆盖策略',report_type:'分析报表',file_id:'文件编号',trade_date:'交易日期',min_score:'最低相关度',page:'页码',page_size:'每页数量'};
export function createWealth({app,call,getBot}){
  const dialog=el('dialog','','anke-wealth'),style=el('style');
  style.textContent='.anke-wealth{box-sizing:border-box;width:min(1200px,calc(100vw - 32px));height:90vh;padding:20px;border:1px solid #ddd;border-radius:14px;background:var(--bt-bg,#fafafa);color:var(--bt-text,#333);font:13px system-ui}.anke-wealth header,.anke-wealth nav,.anke-wealth .wealth-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px}.anke-wealth h2{font-size:18px;margin:0 auto 0 0}.anke-wealth button,.anke-wealth input,.anke-wealth select,.anke-wealth textarea{font:inherit;color:inherit;border:1px solid #ddd;border-radius:8px;background:var(--bt-card,#fff);padding:8px;box-sizing:border-box}.anke-wealth button{cursor:pointer}.anke-wealth button[aria-pressed=true]{background:#ddd;color:#222}.anke-wealth .wealth-body{display:grid;grid-template-columns:240px minmax(0,1fr);gap:20px;height:calc(100% - 130px)}.anke-wealth .wealth-list,.anke-wealth .wealth-detail{overflow:auto;min-width:0}.anke-wealth .wealth-list button{display:block;text-align:left;width:100%;margin-bottom:6px}.anke-wealth .wealth-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.anke-wealth label{display:grid;gap:5px}.anke-wealth pre{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--bt-card,#fff);padding:12px;border-radius:8px}.anke-wealth table{border-collapse:collapse;width:100%;font:inherit}.anke-wealth th,.anke-wealth td{border-bottom:1px solid #ddd;padding:8px;text-align:left;max-width:260px;overflow-wrap:anywhere}.anke-wealth svg{width:100%;height:180px}.anke-wealth .wealth-result{overflow:auto}.anke-wealth textarea{min-height:110px;width:100%}@media(max-width:650px){.anke-wealth .wealth-body{grid-template-columns:150px minmax(0,1fr)}.anke-wealth .wealth-fields{grid-template-columns:1fr}}';
  const visualStyle=el('link');visualStyle.rel='stylesheet';visualStyle.href=new URL('./wealth-visuals.css',import.meta.url).href;
  const opinionStyle=el('link');opinionStyle.rel='stylesheet';opinionStyle.href=new URL('./opinion.css',import.meta.url).href;
  dialog.setAttribute('aria-label','财富看板');app.append(style,visualStyle,opinionStyle,dialog);dialog.addEventListener('close',()=>observation?.stop());
  let data,botId,operation,epoch=0,running=null,observation=null,tab='行情与数据';
  const categories=['自选关注','行情与数据','财务与宏观','资金与选股','资讯与研报','组合与风险','全球与衍生品','全部'];
  let visualMode=true;
  const scenes=[['新闻资讯','GET /api/mcp/content/news/search'],['公告','ffd_announcements'],['研报','ffd_research_search'],['基本面','ffd_financial_statements'],['资金流','ffd_money_flow'],['宏观','ffd_macro_data'],['基金','ffd_fund_portfolio'],['智能选股','ffd_screen_stocks'],['全球市场','ffd_global_market_quote'],['组合分析','ffd_portfolio_analytics'],['我的额度','GET /api/v1/entitlement']];
  let favorites=[];
  function category(op){const id=op.id;if(/portfolio|risk|backtest/.test(id))return '组合与风险';if(/news|research|announcement|evidence|intelligence|brief/.test(id))return '资讯与研报';if(/money.flow|screen|limit.pool|anomal|dragon|sector|concept/.test(id))return '资金与选股';if(/financial|macro|indicator|fundamental|valuation|pit|consensus|sharehold|esg/.test(id))return '财务与宏观';if(/global|crypto|options|futures|commodity|bond/.test(id))return '全球与衍生品';return '行情与数据';}
  const button=(text,run)=>{const b=el('button',text);b.type='button';b.onclick=()=>Promise.resolve().then(run).catch(e=>{message.textContent=e.message;});return b;};
  const head=el('header'),nav=el('nav'),toolbar=el('div','','wealth-toolbar'),body=el('div','','wealth-body'),list=el('div','','wealth-list'),detail=el('section','','wealth-detail'),message=el('span');message.setAttribute('role','status');
  const search=el('input');search.placeholder='搜索能力';search.setAttribute('aria-label','搜索财富能力');search.oninput=renderList;
  const key=button('配置密钥',async()=>{const r=await call('team.wealth',{botId,action:'secret'});message.textContent=r.status==='provided'?'密钥已保存':'请在该 Bot 设置 → 密钥管理填写 FFD_API_KEY';});
  async function cancel(){if(running)await call('team.wealth',{action:'cancel',botId,requestId:running});}
  function close(){observation?.stop();epoch++;void cancel().catch(()=>{});dialog.close();}
  head.append(el('h2','财富看板'),button('账号额度',()=>show(data.operations.find(o=>o.id==='GET /api/v1/entitlement'))),key,button('关闭',close));
  const sceneBar=el('div','','wealth-scenes'),modeBar=el('div','','wealth-mode-bar'),visualButton=button('可视化',()=>setMode(true)),advancedButton=button('全部能力',()=>setMode(false));
  modeBar.append(visualButton,advancedButton);head.insertBefore(modeBar,head.lastChild);
  function setMode(value){visualMode=value;dialog.classList.toggle('visual-mode',value);visualButton.setAttribute('aria-pressed',String(value));advancedButton.setAttribute('aria-pressed',String(!value));sceneBar.hidden=!value;if(operation)show(operation);}
  message.className='wv-provenance';toolbar.append(search);body.append(list,detail);dialog.append(head,sceneBar,message,nav,toolbar,body);setMode(true);
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  function renderList(){list.replaceChildren();for(const op of data.operations.filter(o=>(tab==='自选关注'?favorites.some(f=>f.operation===o.id):tab==='全部'||category(o)===tab)&&(o.label+' '+o.id).toLowerCase().includes(search.value.toLowerCase())))list.append(button(op.label,()=>show(op)));}
  function resultView(result){
    if(!result.data?.file)return renderWealthVisuals(result,operation);
    const host=el('div','','wealth-result'),stamp=el('p',result.retrievedAt+' · '+result.source);host.append(stamp);
    if(result.data?.file){const file=result.data.file;host.append(button('保存研报文件',()=>{const bytes=Uint8Array.from(atob(file.base64),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:file.type})),a=el('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));return host;}
    return host;
  }
  function show(op){
    if(!op||running)return;observation?.stop();observation=null;operation=op;detail.replaceChildren();detail.append(el('h3',visualMode?(scenes.find(([,id])=>id===op.id)?.[0]||op.label):op.label));
    const example={...(op.example||{})};
    if(visualMode){if(op.schema?.properties?.format)example.format='json';if(op.schema?.properties?.output_mode)example.output_mode='raw';if(op.id==='GET /api/mcp/content/news/search'){delete example.query;delete example.keyword;}}
    const form=el('form'),fields=el('div','','wealth-fields'),inputs=new Map(),raw=el('textarea');raw.setAttribute('aria-label','完整查询参数');raw.value=JSON.stringify(example,null,2);
    const schema=op.transport==='mcp'?op.schema?.properties||{}:Object.fromEntries(op.parameters.map(p=>[p.name,p]));
    for(const [name,spec] of Object.entries(schema)){
      const label=el('label',LABELS[name]||name),input=spec.enum?el('select'):el('input');input.name=name;input.title=spec.description||name;
      if(spec.enum){input.append(el('option',''));for(const value of spec.enum){const option=el('option',String(value));option.value=String(value);input.append(option);}}
      input.value=example[name]===undefined?'':typeof example[name]==='object'?JSON.stringify(example[name]):String(example[name]);
      inputs.set(name,{input,spec});label.append(input);fields.append(label);
      input.onchange=()=>{const args=JSON.parse(raw.value||'{}');if(!input.value)delete args[name];else args[name]=['array','object','integer','number','boolean'].includes(spec.type)?JSON.parse(input.value):input.value;raw.value=JSON.stringify(args,null,2);};
    }
    const extraFields=el('details'),extraGrid=el('div','','wealth-fields');extraFields.append(el('summary','更多筛选'),extraGrid);
    if(visualMode){const primary=new Set(['codes','symbol','q','query','start_date','end_date','report_date','portfolio_id','report_type','series_id','fund','etf','sector','trade_date','limit']);for(const [name,{input}] of inputs)if(!primary.has(name)||op.id==='GET /api/mcp/content/news/search'&&name==='query')extraGrid.append(input.parentElement);}
    extraFields.hidden=!extraGrid.children.length;
    const advanced=el('details');advanced.append(el('summary','完整参数'),raw);
    const templates=el('details'),templateSelect=el('select'),templateCode=el('pre');templates.hidden=visualMode;templates.append(el('summary','官方场景模板'));templateSelect.setAttribute('aria-label','官方场景模板');for(const s of data.scenarios){const o=el('option',s.title);o.value=s.id;templateSelect.append(o);}templateSelect.onchange=()=>{templateCode.textContent=data.scenarios.find(s=>s.id===templateSelect.value)?.code||'';};templateSelect.onchange();templates.append(templateSelect,templateCode);
    const connector=el('select');connector.setAttribute('aria-label','Findesk MCP 连接');for(const c of data.status.connectors){const o=el('option',c.name);o.value=c.id;connector.append(o);}
    const run=el('button','查询');run.type='submit';run.disabled=op.transport==='mcp'?!data.status.connectors.length:!data.status.credentialConfigured;
    const output=el('section'),cancelButton=button('停止',cancel);cancelButton.hidden=true;
    const favorite=button('保存关注',()=>{const args=JSON.parse(raw.value);favorites=favorites.filter(f=>f.operation!==op.id);favorites.push({operation:op.id,arguments:args});favorites=favorites.slice(-100);localStorage.setItem('anke.wealth.favorites.'+botId,JSON.stringify(favorites));message.textContent='已保存关注';renderList();});
    const saved=favorites.find(f=>f.operation===op.id);if(saved){raw.value=JSON.stringify(saved.arguments,null,2);for(const [name,{input}] of inputs)input.value=saved.arguments[name]===undefined?'':typeof saved.arguments[name]==='object'?JSON.stringify(saved.arguments[name]):String(saved.arguments[name]);}
    const state=el('p',op.transport==='mcp'&&!data.status.connectors.length?'待配置 Findesk MCP 连接':op.transport==='rest'&&!data.status.credentialConfigured?'待配置 FFD_API_KEY':'');
    form.append(fields,extraFields,advanced,templates);if(op.transport==='mcp')form.append(connector);form.append(state,run,favorite,cancelButton);detail.append(form,output);
    let lastError;
    form.onsubmit=async event=>{event.preventDefault();if(running)return;lastError=null;let args;try{args=JSON.parse(raw.value);}catch{message.textContent='参数 JSON 格式有误';lastError=Error(message.textContent);return;}
      if(op.id==='ffd_virtual_portfolio'&&!['get','list'].includes(args.action)&&!confirm('确认修改模拟组合？'))return;
      const ticket=epoch,requestId=crypto.randomUUID();running=requestId;run.disabled=true;cancelButton.hidden=false;message.textContent='查询中';output.replaceChildren(el('p','正在加载…'));output.setAttribute('aria-busy','true');
      try{const result=await call('team.wealth',{action:'execute',botId,operation:op.id,arguments:args,serverId:connector.value,requestId});if(ticket===epoch&&dialog.open){output.replaceChildren(resultView(result));message.textContent='已返回';}}
      catch(error){lastError=error;if(ticket===epoch&&dialog.open){message.textContent=error.message;output.replaceChildren(el('p',error.message,'wv-empty'));}}
      finally{running=null;run.disabled=false;cancelButton.hidden=true;output.setAttribute('aria-busy','false');}
    };
    if(/news\/search|news\/latest/.test(op.id)){
      const status=el('p','手动更新'),observe=el('input'),label=el('label','开启新闻观测（每分钟查询，使用账号额度）');observe.type='checkbox';observe.disabled=run.disabled;observe.setAttribute('aria-label','开启新闻观测');label.append(observe);form.append(label,status);
      observation=observationLoop({visible:()=>dialog.open&&!document.hidden&&!running,query:async()=>{await form.onsubmit({preventDefault(){}});if(lastError)throw lastError;},onState:value=>{status.textContent=value;if(value.startsWith('观测已暂停'))observe.checked=false;}});
      const loop=observation;observe.onchange=()=>observe.checked?loop.start():loop.stop();
    }
  }
  return {async open(scene){botId=getBot();if(!botId)throw Error('请先选择财富管理或其他 Bot。');try{favorites=JSON.parse(localStorage.getItem('anke.wealth.favorites.'+botId)||'[]');if(!Array.isArray(favorites))favorites=[];}catch{favorites=[];}const ticket=++epoch;if(!dialog.open)dialog.showModal();message.textContent='载入中';data=await call('team.wealth',{action:'catalog',botId});if(ticket!==epoch)return;nav.replaceChildren();for(const name of categories){const b=button(name,()=>{tab=name;for(const x of nav.children)x.setAttribute('aria-pressed',String(x===b));renderList();});b.setAttribute('aria-pressed',String(tab===name));nav.append(b);}sceneBar.replaceChildren();for(const [name,id] of scenes){const op=data.operations.find(o=>o.id===id);if(op)sceneBar.append(button(name,()=>{show(op);for(const b of sceneBar.children)b.setAttribute('aria-pressed',String(b.textContent===name));}));}message.textContent=data.status.credentialConfigured?'密钥已配置':'待授权';renderList();show(data.operations.find(o=>o.id===(scene||'GET /api/mcp/content/news/search'))||data.operations[0]);},close,destroy(){close();dialog.remove();style.remove();visualStyle.remove();}};
}
