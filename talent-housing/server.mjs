import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {openStore} from './store.mjs';
import {buildMonitor} from '../housing_monitor/model.mjs';
import {createAssetStore} from './assets.mjs';
const require=createRequire(import.meta.url);
const plugin=new URL('../anke-agent-source/apps/desktop/resources/plugins/anke.rents/',import.meta.url);
const {query}=require(fileURLToPath(new URL('query.cjs',plugin)));
const {events}=require(fileURLToPath(new URL('events.cjs',plugin)));
export async function start({port=47831,store}={}) {
  const owned=!store;store??=await openStore();
  const token=randomBytes(24).toString('hex');
  const assets=createAssetStore(fileURLToPath(new URL('./data/assets.json',import.meta.url)));
  let boundaryCache;
  const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
  const server=http.createServer(async(req,res)=>{
    const send=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
    const address=server.address();const host=`127.0.0.1:${address.port}`;
    if(req.headers.host!==host)return send(403,{error:'Invalid host'});
    if(req.method==='GET'&&req.url==='/health')return send(200,{service:'anke-talent-housing',version:2,capabilities:['housing-deliberation-v1','official-policy-index-v1']});
    if(req.method==='GET'&&req.url==='/policy'){
      const page=await readFile(new URL('./policy.html',import.meta.url),'utf8');
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});
      res.end(page.replace('__TOKEN__',token));return;
    }
    if(req.method==='GET'&&req.url==='/housing_monitor/boundary.json'){
      try{if(!boundaryCache){const response=await fetch('https://geo.datav.aliyun.com/areas_v3/bound/440300_full.json',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Boundary unavailable');const raw=await response.text();if(raw.length>2000000)throw Error('Boundary too large');boundaryCache=JSON.parse(raw);}return send(200,boundaryCache);}catch{return send(503,{error:'深圳底图暂未连接'});}
    }
    if(req.method==='GET'&&req.url==='/housing_monitor'){res.writeHead(302,{Location:'/housing_monitor/'});res.end();return;}
    if(req.method==='GET'&&['/housing_monitor/','/housing_monitor/assets/'].includes(req.url)){
      const page=await readFile(new URL(req.url.endsWith('/assets/')?'../housing_monitor/assets.html':'../housing_monitor/index.html',import.meta.url),'utf8');
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'self' file: app: http://127.0.0.1:*"});res.end(page.replace('<meta charset="utf-8">',`<meta charset="utf-8"><meta name="anke-service-token" content="${token}">`));return;
    }
    const monitorAsset=req.url?.match(/^\/housing_monitor\/(style\.css|app\.mjs|assets\.mjs|dashboard\.mjs|model\.mjs|map\.mjs|obj\.mjs|rent-colors\.mjs|three\.min\.js)$/)?.[1];
    if(req.method==='GET'&&monitorAsset){res.writeHead(200,{'Content-Type':monitorAsset.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8','Cache-Control':'no-store'});res.end(await readFile(monitorAsset==='three.min.js'?new URL('renderer/three.min.js',plugin):new URL('../housing_monitor/'+monitorAsset,import.meta.url)));return;}
    if(req.method==='GET'&&req.url==='/workspace'){res.writeHead(302,{Location:'/workspace/'});res.end();return;}
    if(req.method==='GET'&&req.url==='/workspace/'){
      const page=await readFile(new URL('renderer/index.html',plugin),'utf8');
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; worker-src blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' blob:; base-uri 'none'; frame-ancestors 'none'"});
      res.end(page.replace('<meta charset="utf-8">',`<meta charset="utf-8"><meta name="anke-service-token" content="${token}">`));return;
    }
    const asset=req.url?.match(/^\/workspace\/(style\.css|anke-select\.css|housing-presentation\.css|housing-presentation\.js|rent-visuals\.css|rent-visuals\.js|app\.js|residential-map\.js|housing-ui\.js|browser-bridge\.js|spatial\.js|city-view\.js|reality\.js|splats\.js|three\.min\.js|city\/(?:manifest|nanshan|baoan|futian|luohu|yantian|longgang)\.js)$/)?.[1];
    if(req.method==='GET'&&asset){res.writeHead(200,{'Content-Type':asset.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8','Cache-Control':'no-store'});let content=await readFile(new URL('renderer/'+asset,plugin));if(asset==='housing-presentation.js'){const base=content.toString('utf8').split('\n/* ANKE SHARED EVENT TONE BUILD */\n')[0];content=Buffer.concat([Buffer.from(base+'\n;\n'),...await Promise.all(['event-tone.cjs','event-semantic-data.js','event-tone-ui.js','ai-reading-ui.js'].map(async name=>Buffer.concat([await readFile(new URL('./'+name,import.meta.url)),Buffer.from('\n;\n')])))]);}res.end(content);return;}
    if(req.method==='GET'&&req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(html.replace('__TOKEN__',token));return;}
    if(req.method!=='POST'||req.url!=='/api')return send(404,{error:'Not found'});
    if(req.headers['x-anke-token']!==token||req.headers.origin!==`http://${host}`)return send(403,{error:'Invalid origin or token'});
    try{
      let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>200000)throw Error('Request too large');}
      const input=JSON.parse(body);let result;
      if(input.action==='housing_monitor')result=buildMonitor({eventData:events({includeExpired:false}),market:query({district:input.filters?.district||undefined,query:input.filters?.query||undefined,recordType:'挂牌',lease:'整租'}),units:await store.all('unit'),filters:input.filters||{}});
      else if(['assets_list','assets_save','assets_entry'].includes(input.action))result=await assets.execute(input);
      else if(['monitor_analyze','residential_analyze'].includes(input.action))throw Error('请在 Anke 客户端中开启分析');
      else if(input.action==='market_query')result=query(input.filters);
      else if(input.action==='market_address_save')result=require(fileURLToPath(new URL('geography.cjs',plugin))).save(input.input);
      else if(input.action==='residential_locate')result=await require(fileURLToPath(new URL('map.cjs',plugin))).locate(input.input);
      else if(input.action==='residential_street')result=await require(fileURLToPath(new URL('map.cjs',plugin))).street(input.input);
      else if(input.action==='market_events')result=events(input.filters);
      else if(input.action==='list')result={applications:await store.all('application'),units:await store.all('unit')};
      else if(input.action==='save')result=await store.save(input.kind,input.record);
      else result=await store.execute(input);
      send(200,result);
    }catch(e){send(400,{error:e.message});}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  return {server,token,url:`http://127.0.0.1:${server.address().port}`,close:async()=>{await new Promise(r=>server.close(r));if(owned)await store.close();}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const service=await start();console.log(`Anke talent housing: ${service.url}`);
  if(process.argv.includes('--open')&&process.platform==='win32'){
    const browser=spawn('explorer.exe',[service.url+'/workspace/'],{windowsHide:true,stdio:'ignore'});
    browser.on('error',()=>console.error('Open the service URL in your browser.'));
    browser.unref();
  }
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await service.close();process.exit(0);});
}
