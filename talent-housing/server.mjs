import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {openStore} from './store.mjs';
const require=createRequire(import.meta.url);
const plugin=new URL('../apps/desktop/resources/plugins/anke.rents/',import.meta.url);
const {query}=require(fileURLToPath(new URL('query.cjs',plugin)));
const {events}=require(fileURLToPath(new URL('events.cjs',plugin)));
export async function start({port=47831,store}={}) {
  const owned=!store;store??=await openStore();
  const token=randomBytes(24).toString('hex');
  const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
  const server=http.createServer(async(req,res)=>{
    const send=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
    const address=server.address();const host=`127.0.0.1:${address.port}`;
    if(req.headers.host!==host)return send(403,{error:'Invalid host'});
    if(req.method==='GET'&&req.url==='/health')return send(200,{service:'anke-talent-housing',version:2});
    if(req.method==='GET'&&req.url==='/workspace'){res.writeHead(302,{Location:'/workspace/'});res.end();return;}
    if(req.method==='GET'&&req.url==='/workspace/'){
      const page=await readFile(new URL('renderer/index.html',plugin),'utf8');
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});
      res.end(page.replace('<meta charset="utf-8">',`<meta charset="utf-8"><meta name="anke-service-token" content="${token}">`));return;
    }
    const asset=req.url?.match(/^\/workspace\/(style\.css|app\.js|housing-ui\.js|browser-bridge\.js|spatial\.js|three\.min\.js)$/)?.[1];
    if(req.method==='GET'&&asset){res.writeHead(200,{'Content-Type':asset.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8','Cache-Control':'no-store'});res.end(await readFile(new URL('renderer/'+asset,plugin)));return;}
    if(req.method==='GET'&&req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(html.replace('__TOKEN__',token));return;}
    if(req.method!=='POST'||req.url!=='/api')return send(404,{error:'Not found'});
    if(req.headers['x-anke-token']!==token||req.headers.origin!==`http://${host}`)return send(403,{error:'Invalid origin or token'});
    try{
      let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>200000)throw Error('Request too large');}
      const input=JSON.parse(body);let result;
      if(input.action==='market_query')result=query(input.filters);
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
