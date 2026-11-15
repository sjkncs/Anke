'use strict';
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const path=require('node:path'),fs=require('node:fs');
async function loadNews(topics,root=path.resolve(__dirname,'../../../../../../..')){
 const adapter=path.join(root,'event-monitor','tencent_news.py');
 const python=path.join(process.env.LOCALAPPDATA||'','Programs','Python','Python311','python.exe');
 if(!fs.existsSync(adapter)||!fs.existsSync(python))throw Error('腾讯新闻读取器不可用，请检查生活服务连接器。');
 const code='import sys,json; sys.path.insert(0,sys.argv[1]); from tencent_news import credential,search; k=credential(); assert k,"请先配置腾讯新闻凭据"; topics=json.loads(sys.argv[2]); rows=[]\nfor t in topics:\n for r in search(k,t,3):\n  rows.append({"title":r.get("title",""),"abstract":r.get("abstract",""),"url":r.get("url",""),"publishedAt":r.get("timestamp",""),"publisher":r.get("source","腾讯新闻"),"topic":t})\nprint(json.dumps(rows,ensure_ascii=False))';
 try{const {stdout}=await promisify(execFile)(python,['-X','utf8','-c',code,path.dirname(adapter),JSON.stringify(topics)],{timeout:45000,maxBuffer:512000,windowsHide:true});return JSON.parse(stdout);}catch{throw Error('腾讯新闻暂未返回有效结果，请检查连接与授权后重试。');}
}
module.exports={loadNews};
