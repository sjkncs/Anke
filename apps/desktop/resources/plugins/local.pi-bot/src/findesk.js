'use strict';
const {jsonFetch}=require('./net');
const ACTIONS=['status','entitlement','news','research'];
function requestFor(args){
  if(!args||!ACTIONS.includes(args.action))throw Error('Unknown Findesk action.');
  if(Object.keys(args).some(key=>!['action','query'].includes(key)))throw Error('Unsupported Findesk argument.');
  const search=['news','research'].includes(args.action);
  if(search&&(typeof args.query!=='string'||!args.query.trim()||args.query.length>200))throw Error('Findesk search requires a query of 1–200 characters.');
  if(!search&&args.query!==undefined)throw Error('This Findesk action does not accept a query.');
  if(args.action==='status')return null;
  const url=new URL(args.action==='entitlement'?'/api/v1/entitlement':args.action==='news'?'/api/mcp/content/news/search':'/api/mcp/content/library/search','https://ffd.findesk.cn');
  if(search){url.searchParams.set('q',args.query.trim());url.searchParams.set('limit','10');}
  if(args.action==='news'){url.searchParams.set('days','7');url.searchParams.set('min_score','0');}
  return url.href;
}
async function queryFindesk(team,args,owner,signal){
  const url=requestFor(args);
  if(signal?.aborted)throw Error('Findesk request cancelled.');
  const available=!team.vault.error&&team.vault.entries.some(e=>e.botId===owner.bot.id&&e.name==='FFD_API_KEY');
  if(args.action==='status')return {provider:'findesk',credentialConfigured:available,authenticatedDataVerified:false,secretName:'FFD_API_KEY',actions:ACTIONS};
  // Resolve only the current Bot's key. Never borrow another Bot's grant.
  const key=team.vault.value(owner.bot.id,'FFD_API_KEY');
  const data=await jsonFetch(url,{headers:{Authorization:'Bearer '+key,Accept:'application/json'},signal,timeoutMs:30000});
  return team.vault.clean({provider:'findesk',action:args.action,source:url,retrievedAt:new Date().toISOString(),data});
}
module.exports={ACTIONS,requestFor,queryFindesk};
