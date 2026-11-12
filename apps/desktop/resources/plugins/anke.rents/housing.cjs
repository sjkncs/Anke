const http=require('node:http');
const endpoint='http://127.0.0.1:47831';
function request(path,body,token){return new Promise((resolve,reject)=>{
  const req=http.request(endpoint+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json',Origin:endpoint,'X-Anke-Token':token}:{}},res=>{
    let content='';res.setEncoding('utf8');
    res.on('data',chunk=>{content+=chunk;if(Buffer.byteLength(content)>2000000)req.destroy(Error('Housing response too large'));});
    res.on('end',()=>{if(res.statusCode!==200){try{reject(Error(JSON.parse(content).error));}catch{reject(Error('Housing service unavailable'));}}else resolve(content);});
    res.on('error',reject);
  });req.setTimeout(10000,()=>req.destroy(Error('Housing service timed out')));req.on('error',reject);req.end(body?JSON.stringify(body):undefined);
});}
async function housing(input={},mode='panel'){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid housing request');
  const read=['workspace','search_homes','progress','coverage','preference_catalog','survey_template'];
  const write=['create_order','advance_order'];
  const allowed=mode==='agent'?[...read,...write]:[...read,...write,'list','save','import_supply'];
  if(!allowed.includes(input.action))throw Error('Unsupported housing action');
  const page=await request('/');const token=page.match(/const token='([a-f0-9]{48})'/)?.[1];
  if(!token)throw Error('Start the talent housing service');
  const args=mode==='agent'&&input.action==='advance_order'?{...input,actor:'住小智',execution:'assistant'}:input;
  return JSON.parse(await request('/api',args,token));
}
module.exports={housing};
