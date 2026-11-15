'use strict';
const catalog=require('../../anke.rents/data/findesk-capabilities.json');
const cookbook=require('../../anke.rents/data/findesk-cookbook.json');
const {jsonFetch,boundedFetch}=require('./net');
const pending=new WeakMap();
const banned=new Set(['__proto__','constructor','prototype']);
function validate(value,schema={},at='arguments'){
  if(schema.enum&&!schema.enum.includes(value))throw Error(at+': unsupported value');
  const type=schema.type;
  if(type==='object'){
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error(at+': object required');
    for(const key of schema.required||[])if(value[key]===undefined)throw Error(at+'.'+key+': required');
    for(const [key,item] of Object.entries(value)){
      if(banned.has(key)||schema.additionalProperties===false&&!Object.hasOwn(schema.properties||{},key))throw Error(at+'.'+key+': unsupported field');
      if(schema.properties?.[key])validate(item,schema.properties[key],at+'.'+key);
    }
  }
  if(type==='array'){
    if(!Array.isArray(value)||value.length<(schema.minItems||0)||value.length>(schema.maxItems??1000))throw Error(at+': invalid array');
    value.forEach((v,i)=>validate(v,schema.items||{},at+'['+i+']'));
  }
  if(type==='string'&&(typeof value!=='string'||value.length<(schema.minLength||0)||value.length>(schema.maxLength??16000)))throw Error(at+': invalid text');
  if(['number','integer'].includes(type)&&(typeof value!=='number'||!Number.isFinite(value)||type==='integer'&&!Number.isInteger(value)||value<(schema.minimum??-Infinity)||value>(schema.maximum??Infinity)||schema.exclusiveMinimum!==undefined&&value<=schema.exclusiveMinimum))throw Error(at+': invalid number');
  if(type==='boolean'&&typeof value!=='boolean')throw Error(at+': boolean required');
  if(schema.anyOf&&!schema.anyOf.some(s=>{try{validate(value,{...s,type:s.type||type},at);return true;}catch{return false;}}))throw Error(at+': required input combination missing');
}
function operations(){
  return catalog.rest_endpoints.filter(e=>e.parameter_contract).map(e=>({id:e.method+' '+e.path,label:e.summary||e.name||e.path,group:e.group||'数据接口',transport:'rest',method:e.method,path:e.path,status:e.status||'unknown',parameters:e.parameter_contract.parameters||[],example:e.example_request?.body||e.example_request?.query||{},response:e.response_contract?.json_schema||null})).concat(catalog.tools.map(t=>({id:t.name,label:t.label,group:t.group||'专业工具',transport:'mcp',status:t.status,summary:t.summary,schema:t.input_schema,example:t.example_arguments||{}})));
}
function specification(id){const op=operations().find(o=>o.id===id);if(!op)throw Error('Unknown Findesk operation.');return op;}
function prepare(id,args){
  const op=specification(id);
  if(!args||typeof args!=='object'||Array.isArray(args)||JSON.stringify(args).length>64000)throw Error('Invalid Findesk arguments.');
  if(op.transport==='mcp')validate(args,{...op.schema,additionalProperties:false});
  else{
    const properties=Object.fromEntries(op.parameters.map(p=>[p.name,{...(p.type?{type:p.type}:{}),...(p.type==='array'?{maxItems:1000}:{})}]));
    validate(args,{type:'object',properties,required:op.parameters.filter(p=>p.required).map(p=>p.name),additionalProperties:false});
  }
  if(id==='ffd_virtual_portfolio'&&!['list','get'].includes(args.action)&&(!args.idempotency_key||args.idempotency_key.length<8))throw Error('Virtual portfolio writes require a stable idempotency_key.');
  let url;
  if(op.transport==='rest'){
    let route=op.path;route=route.replace(/\{([^}]+)\}/g,(_,key)=>{if(!['string','number'].includes(typeof args[key])||args[key]==='')throw Error('Missing path field '+key);return encodeURIComponent(String(args[key]));});
    url=new URL(route,'https://ffd.findesk.cn');
    if(op.method==='GET')for(const [key,value] of Object.entries(args))if(!op.path.includes('{'+key+'}'))url.searchParams.set(key,typeof value==='object'?JSON.stringify(value):String(value));
  }
  return {op,url};
}
function localStatus(team,botId){return {credentialConfigured:!team.vault.error&&team.vault.entries.some(e=>e.botId===botId&&e.name==='FFD_API_KEY'),connectors:(team.state.botConnectors||[]).filter(c=>c.enabled&&c.botIds.includes(botId)&&c.type==='http'&&new URL(c.url).hostname==='ffd.findesk.cn').map(c=>({id:c.id,name:c.name})),authenticatedDataVerified:false};}
async function execute(team,botId,input,signal){
  const {op,url}=prepare(input.operation,input.arguments||{});
  if(signal?.aborted)throw Error('Findesk request cancelled.');
  const active=pending.get(team)||new Map();pending.set(team,active);
  // One request across the team matches the smallest account plan.
  if(active.size)throw Error('Findesk is busy. Wait for the current request; it will not be replayed.');
  const controller=new AbortController();active.set(botId,{id:input.requestId,controller});
  const combined=signal?AbortSignal.any([signal,controller.signal]):controller.signal;
  try{
    let data;
    if(op.transport==='mcp'){
      const connector=(team.state.botConnectors||[]).find(c=>c.id===input.serverId&&c.enabled&&c.botIds.includes(botId)&&c.type==='http'&&new URL(c.url).hostname==='ffd.findesk.cn');
      if(!connector)throw Error('Select an authorized Findesk MCP connector in Bot settings.');
      data=await team.bridge.call(botId,{serverId:connector.id,name:op.id,arguments:input.arguments||{}},combined);
      if(data?.isError)throw Error('Findesk MCP reported a tool error: '+JSON.stringify(data.content||[]).slice(0,1000));
    }else{
      const key=team.vault.value(botId,'FFD_API_KEY');
      const options={method:op.method,headers:{Authorization:'Bearer '+key,Accept:'application/json','Content-Type':'application/json'},...(op.method==='POST'?{body:JSON.stringify(input.arguments||{})}:{}),signal:combined,timeoutMs:30000};
      if(op.path.endsWith('/download')){
        const result=await boundedFetch(url.href,options,20*1024*1024);
        if(!result.response.ok)throw Error('Findesk download HTTP '+result.response.status);
        if((result.response.headers.get('content-type')||'').includes('json'))data=JSON.parse(result.text);
        else data={file:{base64:result.bytes.toString('base64'),type:result.response.headers.get('content-type')||'application/octet-stream',name:'findesk-research.pdf'}};
      }else data=await jsonFetch(url.href,options);
      if(data?.success===false||data?.ok===false||data?.error_code||typeof data?.code==='number'&&![0,200].includes(data.code))throw Error('Findesk business error: '+JSON.stringify(data).slice(0,1000));
    }
    return team.vault.clean({operation:op.id,source:url?.href||'Findesk MCP',retrievedAt:new Date().toISOString(),data});
  }finally{active.delete(botId);}
}
async function panelWealth(team,input){
  const bot=team.bot(input.botId);if(!bot)throw Error('Select an existing Bot.');
  if(input.action==='catalog')return {status:localStatus(team,bot.id),operations:operations(),scenarios:cookbook.scenarios,version:catalog.contract_version};
  if(input.action==='cancel'){const task=pending.get(team)?.get(bot.id);if(task&&task.id===input.requestId)task.controller.abort();return {cancelled:!!task&&task.id===input.requestId};}
  if(input.action==='execute')return execute(team,bot.id,input);
  if(input.action==='secret')return team.vault.request(bot.id,{name:'FFD_API_KEY',reason:'Findesk wealth data access'});
  throw Error('Unknown wealth action.');
}
module.exports={validate,operations,specification,prepare,execute,panelWealth,localStatus};
