import http from 'node:http';import {readFile} from 'node:fs/promises';import {randomBytes} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createInspectionWorkflow} from './workflow.mjs';import {createConnectors} from './connectors.mjs';
import {housingContext} from './housing-context.mjs';
import {validateEvidence} from './evidence.mjs';
export async function startInspection({port=47836,env=process.env,context=housingContext}={}){
 const token=randomBytes(24).toString('hex'),connectors=createConnectors(env);let workflow;
 const server=http.createServer(async(req,res)=>{
  const host='127.0.0.1:'+server.address().port;const send=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  if(req.headers.host!==host)return send(403,{error:'Invalid host'});
  try{
   if(req.method==='GET'&&req.url==='/'){const html=await readFile(new URL('./index.html',import.meta.url),'utf8');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(html.replace('TOKEN',token));return;}
   if(req.method==='GET'&&['/ui.mjs','/dashboard.mjs','/style.css'].includes(req.url)){res.writeHead(200,{'Content-Type':req.url.endsWith('.css')?'text/css':'text/javascript','Cache-Control':'no-store'});res.end(await readFile(new URL('.'+req.url,import.meta.url)));return;}
   if(req.method==='GET'&&req.url==='/health')return send(200,{service:'anke-inspection',version:1});
   if(req.method!=='POST'||req.url!=='/api')return send(404,{error:'Not found'});
   if(req.headers.origin!=='http://'+host||req.headers['x-anke-token']!==token)return send(403,{error:'Invalid origin or token'});
   let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>8000000)throw Error('Request too large');}const input=JSON.parse(raw);
   if(input.action==='status')return send(200,{segment:Boolean(connectors.segment),neo4j:Boolean(connectors.neo4j),mirofish:Boolean(connectors.mirofish)});
   if(input.action==='history'){const asset=String(input.asset||'').trim();if(asset.length<2||asset.length>160)throw Error('请填写住宅名称');const value=await context('market_events',{filters:{query:asset,includeExpired:true}});return send(200,{events:(value.events||[]).slice(0,30)});}
   if(input.action==='interpret'){const evidence=validateEvidence(input.evidence);return send(200,await context('residential_analyze',{evidence}));}
   if(input.action==='analyze'){workflow??=createInspectionWorkflow({moduleRoot:env.ANKE_AI_NODE_MODULES,...connectors});const result=await workflow.invoke({input:input.evidence});return send(200,{evidence:result.evidence,findings:result.findings,graph:result.graph,persistence:result.persistence});}
   if(input.action==='mirofish'){if(!connectors.mirofish)throw Error('尚未配置 MiroFish 服务');return send(200,await connectors.mirofish(input.operation,input));}
   return send(400,{error:'Unknown action'});
  }catch(e){const message=e.code==='MODULE_NOT_FOUND'?'分析服务尚未就绪':e.message;send(400,{error:message});}
 });await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});return {server,url:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(r=>server.close(r))};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const service=await startInspection();console.log('Anke inspection: '+service.url);for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await service.close();process.exit(0);});}
