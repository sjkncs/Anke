import readline from 'node:readline';
// Read-only tools share the domain service; the agent cannot save eligibility or allocate units.
const definition={name:'talent_housing',description:'Read talent housing requirements, workflow, explained matches, simulations, public-source faculty preference dimensions and the survey template. Public evidence is not a personal weight or an official eligibility decision.',inputSchema:{type:'object',properties:{action:{type:'string',enum:['coverage','recommend','progress','simulate','preference_catalog','survey_template']},applicationId:{type:'string'},asOf:{type:'string',format:'date'}},required:['action'],additionalProperties:false}};
export function createHandler(execute){return async request=>{
  if(!request||request.jsonrpc!=='2.0')throw Error('Invalid JSON-RPC request');
  if(request.method==='initialize')return {protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'anke-talent-housing',version:'0.1.0'}};
  if(request.method==='ping')return {};
  if(request.method==='tools/list')return {tools:[definition]};
  if(request.method==='tools/call'){
    if(request.params?.name!==definition.name)throw Error('Unknown tool');
    const input=request.params.arguments;
    if(!input||typeof input!=='object'||Array.isArray(input)||!definition.inputSchema.properties.action.enum.includes(input.action)||Object.keys(input).some(k=>!['action','applicationId','asOf'].includes(k)))throw Error('Read-only tool arguments required');
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
