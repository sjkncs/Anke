'use strict';
// User-authorized local setup. The bearer token is accepted only through stdin.
const fs=require('node:fs/promises'),path=require('node:path');
const {StateFile}=require('../src/state-file');
const {Vault}=require('../src/vault');
const {McpBridge}=require('../src/mcp-bridge');
const {upgradeDeskInstructions}=require('../src/anke-services');
async function run(){
  let raw='';for await(const chunk of process.stdin){raw+=chunk;if(raw.length>20000)throw Error('Setup input too large.');}
  const input=JSON.parse(raw);raw='';
  const data=path.join(process.env.LOCALAPPDATA,'AnkeAgent/plugins/data/local.pi-bot'),file=path.join(data,'team.json'),store=new StateFile(file);
  await store.acquire();let bridge;
  try{
    const state=JSON.parse(await store.load()),bot=state.bots.find(b=>b.ankeServicePreset==='food');
    if(!bot)throw Error('Food service bot is missing.');
    const root=path.join(process.env.LOCALAPPDATA,'AnkeAgent/plugins/backups/local.pi-bot');
    const backup=path.join(root,'food-setup-'+Date.now());await fs.mkdir(backup,{recursive:true});await fs.copyFile(file,path.join(backup,'team.json'));
    try{await fs.copyFile(path.join(root,'secrets.dpapi'),path.join(backup,'secrets.dpapi'));}catch(e){if(e.code!=='ENOENT')throw e;}
    const team={state,backups:{root},bot:id=>{const b=state.bots.find(b=>b.id===id);if(!b)throw Error('Unknown bot.');return b;},save:()=>store.write(JSON.stringify(state))};
    team.vault=await new Vault(team).load();if(team.vault.error)throw Error('The local credential vault could not be unlocked.');
    bridge=team.bridge=new McpBridge(team);team.integrations={login:{token:async(id,c)=>team.vault.value(id,c.tokenRef),cancel:()=>{}}};
    upgradeDeskInstructions(state);
    await team.vault.set({botId:bot.id,name:'LUCKIN_MCP_TOKEN',value:input.token});input.token='';
    const previous=(state.botConnectors||[]).find(c=>c.url==='https://gwmcp.lkcoffee.com/order/user/mcp');
    await bridge.save({...(previous?{id:previous.id}:{}),type:'http',name:'瑞幸咖啡',url:'https://gwmcp.lkcoffee.com/order/user/mcp',botIds:[bot.id],allowedTools:['*'],tokenRef:'LUCKIN_MCP_TOKEN',enabled:true,timeoutMs:30000});
    if(!state.botConnectors.some(c=>c.url==='https://mcp.mcd.cn'))await bridge.save({type:'http',name:'麦当劳',url:'https://mcp.mcd.cn',botIds:[bot.id],allowedTools:['*'],tokenRef:'MCD_MCP_TOKEN',enabled:false,timeoutMs:30000});
    const rule=' Food MCP connections belong to this service: use anke_mcp_tools to discover the configured 瑞幸咖啡 or 麦当劳 server, then anke_mcp_call with the returned server/tool IDs. Never invent menus, prices, coupons, delivery or order status. Only create, pay, cancel or redeem an order after the user specifically requests that action and its actual items and amount are known. A configured server is not verified connectivity.';
    if(!bot.instructions.includes('Food MCP connections belong'))bot.instructions+=rule;
    bot.instructions=bot.instructions.replaceAll('anke_mcp_tools','list_bot_mcp_tools').replaceAll('anke_mcp_call','call_bot_mcp_tool');
    await team.save();
    const connector=state.botConnectors.find(c=>c.url==='https://gwmcp.lkcoffee.com/order/user/mcp');
    let verification;
    try{const result=await bridge.discover(bot.id,connector.id);verification={connected:true,tools:result.tools.map(t=>({name:t.name,title:t.title||''}))};}
    catch(error){verification={connected:false,error:team.vault.redact(error.message)};}
    const receipt={configured:true,tokenStorage:'Windows DPAPI',service:'food',luckin:verification,mcdonalds:'pending_user_token',ordersPlaced:0,at:new Date().toISOString()};
    const out=path.resolve(__dirname,'../output/food-mcp-acceptance.json');await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(receipt,null,2));
    console.log(JSON.stringify(receipt));
  }finally{await bridge?.close();await store.close();}
}
run().catch(()=>{console.error('Food MCP setup failed. Existing state was preserved; check service ownership, network and credential input.');process.exitCode=1;});
