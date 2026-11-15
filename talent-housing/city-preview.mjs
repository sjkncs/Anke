import {start} from './server.mjs';
const service=await start({port:47835});
console.log(service.url+'/workspace/');
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await service.close();process.exit(0);});
