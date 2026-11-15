const fs=require('node:fs');
const path=require('node:path');
const file=path.join(__dirname,'data/findesk-capabilities.json');
function findesk(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['query','action'].includes(k))||typeof(input.query??'')!=='string'||(input.query||'').length>200||!['catalog','plans','cookbook'].includes(input.action??'catalog'))throw Error('Invalid Findesk query');
  if(input.action==='cookbook'){
    const book=JSON.parse(fs.readFileSync(path.join(__dirname,'data/findesk-cookbook.json'),'utf8'));
    if(!Array.isArray(book.scenarios)||!book.source||!book.sha256)throw Error('Unsupported Findesk cookbook');
    const query=(input.query||'').trim().toLowerCase(),exact=book.scenarios.find(s=>s.id.toLowerCase()===query||s.title.toLowerCase()===query);
    return {provider:'Findesk',source:book.source,retrievedAt:book.retrievedAt,sha256:book.sha256,templatesExecuted:false,authenticatedDataVerified:false,
      scenarios:exact?[exact]:book.scenarios.filter(s=>!query||[s.id,s.title,s.summary,s.detail].join(' ').toLowerCase().includes(query)).map(({code,...summary})=>summary),
      next:exact?'Keep the minimal example scope for the first run. Replace credentials through the existing vault or environment, never persist them in a script. Macro series requires a real dictionary code. Historical dates and symbols are examples, not current coverage proof.':'Select a scenario by its exact id to retrieve the official template. Do not reconstruct parameters one field at a time.'};
  }
  if(input.action==='plans'){
    const policy=JSON.parse(fs.readFileSync(path.join(__dirname,'data/findesk-plans.json'),'utf8'));
    if(!Array.isArray(policy.plans)||!policy.policy_version)throw Error('Unsupported Findesk plan policy');
    return {provider:'Findesk',connection:'public_policy_only',authenticatedDataVerified:false,accountBalance:null,
      source:'https://ffd.findesk.cn/api/v1/catalog/plan-comparison',docs:'https://ffd.findesk.cn/api-docs',manual:'https://ffd.findesk.cn/api-docs/manual',
      entitlementEndpoint:'GET /api/v1/entitlement',policyVersion:policy.policy_version,retrievedAt:policy.retrieved_at,
      plans:policy.plans,notes:policy.notes||[],
      constraints:['Public plan limits are not the current account balance.','Plan access does not establish channel availability or complete field/date coverage.','Read authenticated entitlement before selecting concurrency and task size.','The public policy may omit fixed pools; missing limits remain unknown.']};
  }
  if(!fs.existsSync(file))throw Error('Findesk catalog has not been synchronized');
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  if(data.schema_version!=='2.0'||!Array.isArray(data.interfaces))throw Error('Unsupported Findesk catalog');
  const query=(input.query||'').trim().toLowerCase();
  return {provider:'Findesk',source:'https://ffd.findesk.cn/api/v1/catalog/public-capabilities',
    catalogUpdatedAt:data.catalog_updated_at,contractVersion:data.contract_version,
    connection:'public_catalog_only',authenticatedDataVerified:false,
    interfaces:data.interfaces.filter(item=>!query||JSON.stringify(item).toLowerCase().includes(query)).slice(0,20)};
}
module.exports={findesk};
