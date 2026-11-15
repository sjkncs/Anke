import readline from 'node:readline';
const policyDefinition={name:'anke_official_policy',description:'住小保 official housing evidence lookup. Search by housing type and date, return original excerpts and URLs. Expired application batches are excluded unless includeHistorical=true. Review validity with business staff; no eligibility decisions or write operations. Route housing questions to structured tools.',inputSchema:{type:'object',properties:{action:{type:'string',enum:['policy_search','policy_answer','policy_coverage','policy_route']},query:{type:'string',maxLength:500},category:{type:'string',enum:['all','public_rental','affordable_rental','talent_rental','talent_sale','university','youth_transition','social_affordable']},asOf:{type:'string'},includeHistorical:{type:'boolean'},limit:{type:'integer',minimum:1,maximum:10},batchId:{type:'string'}},required:['action'],additionalProperties:false}};
// Read-only tools share the domain service; the agent cannot save eligibility or allocate units.
const definition={name:'talent_housing',description:'Read housing profiles and explained matches. search_homes returns independent resident ratings (0-5 with count and source) and personalized fit (0-100); missing ratings stay null. Qualification precedes ratings. No official eligibility decisions.',inputSchema:{type:'object',properties:{action:{type:'string',enum:['workspace','search_homes','coverage','recommend','progress','simulate','preference_catalog','survey_template']},applicationId:{type:'string'},asOf:{type:'string',format:'date'},query:{type:'string',maxLength:200},sort:{type:'string',enum:['balanced','shortTerm','longTerm','residentRating']},provider:{type:'string',enum:['all','government','university']},minRating:{type:'number',minimum:0,maximum:5},minReviewCount:{type:'integer',minimum:1,maximum:1000000}},required:['action'],additionalProperties:false}};
definition.inputSchema.properties.action.enum.push('compare_allocation');
export function createHandler(execute){return async request=>{
  if(!request||request.jsonrpc!=='2.0')throw Error('Invalid JSON-RPC request');
  if(request.method==='initialize')return {protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'anke-talent-housing',version:'0.1.0'}};
  if(request.method==='ping')return {};
  if(request.method==='tools/list')return {tools:[definition,policyDefinition]};
  if(request.method==='tools/call'){
    if(request.params?.name===policyDefinition.name){
      const input=request.params.arguments;
      if(!input||typeof input!=='object'||Array.isArray(input)||!policyDefinition.inputSchema.properties.action.enum.includes(input.action)||Object.keys(input).some(k=>!(k in policyDefinition.inputSchema.properties)))throw Error('Read-only policy arguments required');
      return {content:[{type:'text',text:JSON.stringify(await execute(input))}],isError:false};
    }
    if(request.params?.name!==definition.name)throw Error('Unknown tool');
    const input=request.params.arguments;
    if(!input||typeof input!=='object'||Array.isArray(input)||!definition.inputSchema.properties.action.enum.includes(input.action)||Object.keys(input).some(k=>!(k in definition.inputSchema.properties)))throw Error('Read-only tool arguments required');
    for(const key of ['applicationId','asOf'])if(input[key]!==undefined&&typeof input[key]!=='string')throw Error('Invalid tool argument');
    const value=await execute(input);
    return {content:[{type:'text',text:JSON.stringify(value)}],isError:false};
  }
  throw Error('Unsupported method');
};}
if(process.argv[1]?.endsWith('mcp.mjs')){
  // Use the running loopback service so only one process opens PostgreSQL files.
  let connection;
  async function execute(input){
    if(!connection){const page=await fetch('http://127.0.0.1:47831/');const html=await page.text();const match=html.match(/const token='([a-f0-9]{48})'/);if(!page.ok||!match)throw Error('Start the talent housing service first');connection=match[1];}
    const response=await fetch('http://127.0.0.1:47831/api',{method:'POST',headers:{'Content-Type':'application/json','X-Anke-Token':connection,Origin:'http://127.0.0.1:47831'},body:JSON.stringify(input)});
    const value=await response.json();if(!response.ok){connection=undefined;throw Error(value.error);}return value;
  }
  const handle=createHandler(execute);
  const reader=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
  for await(const line of reader){let request;try{if(line.length>200000)throw Error('Request too large');request=JSON.parse(line);if(request.id===undefined)continue;const result=await handle(request);process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,result})+'\n');}catch(e){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request?.id??null,error:{code:-32602,message:e.message}})+'\n');}}
}
