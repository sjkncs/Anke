const fs=require('node:fs/promises'),path=require('node:path');
const plugin=path.resolve(__dirname,'../apps/desktop/resources/plugins/local.pi-bot');
const {Vault}=require(path.join(plugin,'src/vault')),{HttpMcpClient}=require(path.join(plugin,'src/remote-mcp'));
(async()=>{
 const root=path.join(process.env.LOCALAPPDATA,'AnkeAgent'),state=JSON.parse(await fs.readFile(path.join(root,'plugins/data/local.pi-bot/team.json'),'utf8'));
 const vault=await new Vault({backups:{root:path.join(root,'plugins/backups/local.pi-bot')}}).load();
 for(const server of state.botConnectors||[]){
  if(!/mcd\.cn|lkcoffee\.com/.test(server.url||''))continue;
  const token=vault.value(server.botIds[0],server.tokenRef),client=new HttpMcpClient({...server,timeoutMs:20000},token);
  try{await client.start();const tools=await client.tools();const name=/mcd\.cn/.test(server.url)?'now-time-info':'queryShopList';
   if(!tools.some(t=>t.name===name))throw Error('Expected read-only tool absent');
   const args=name==='queryShopList'?{longitude:113.968,latitude:22.593}:{};
   const result=await client.request('tools/call',{name,arguments:args});
   const text=JSON.stringify(result);console.log(JSON.stringify({provider:server.name,tool:name,isError:result.isError===true,bytes:text.length,preview:text.slice(0,700)}));
  }catch(error){console.log(JSON.stringify({provider:server.name,error:vault.redact(error.message)}));}finally{client.stop();}
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
