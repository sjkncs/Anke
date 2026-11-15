import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {prepareIntake} from './policy-intake.mjs';
const inputPath=process.argv[2];
if(!inputPath){console.error('用法：node policy-intake-cli.mjs <授权导出的JSON路径>');process.exitCode=1;}
else try{
 const input=JSON.parse(await readFile(inputPath,'utf8'));
 const catalog=JSON.parse(await readFile(new URL('./policy-data/sources.json',import.meta.url),'utf8'));
 const staged=prepareIntake(input,catalog);
 const dir=new URL('./policy-data/intake-staging/',import.meta.url);await mkdir(dir,{recursive:true});
 const target=new URL(staged.batchId+'.json',dir);
 try{await writeFile(target,JSON.stringify(staged,null,2),{encoding:'utf8',flag:'wx'});}
 catch(e){if(e.code!=='EEXIST')throw e;}
 console.log(JSON.stringify({batchId:staged.batchId,records:staged.records.length,status:staged.status,published:false}));
}catch(e){console.error(e.message);process.exitCode=1;}
