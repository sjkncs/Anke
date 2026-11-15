import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require('E:/FFD-Downloader-Windows/datafoundry-enhanced/node_modules/playwright-core');
const output=process.argv[2]||'C:/Users/Lenovo/Desktop/安客实景采集_20261112';
const sources=[
 {id:'yifu-video',target:'深铁懿府4K航拍候选',kind:'creator_stock_listing',url:'https://www.vjshi.com/watch/26051603.html'},
 {id:'bolin-community',target:'博林天瑞花园一期',kind:'property_platform',url:'https://shenzhen.leyoujia.com/xq/detail/45803.html'},
 {id:'ocean-community',target:'远洋天著华府',kind:'property_platform',url:'https://shenzhen.leyoujia.com/xq/detail/850236.html'},
 {id:'ocean-developer',target:'远洋天著华府',kind:'developer_publication',url:'https://zhongguan.cn/news/2057.html'},
 {id:'bolin-design',target:'博林天瑞',alias:'柏林天瑞（用户原称）',kind:'design_project_publication',url:'https://www.gooood.cn/shenzhen-bolin-tinerry-by-pleasanthouse.htm'},
 {id:'bolin-gallery',target:'博林天瑞',kind:'property_platform',url:'https://bol.szhome.com/photoshow/4002-2-0-0-0.html'},
 {id:'yifu-report',target:'深铁懿府',kind:'news_report',url:'https://www.sznews.com/news/content/2023-11/03/content_30568168.htm'},
 {id:'gauu',target:'深圳住宅区研究数据 HAV / LFLS',kind:'author_dataset',url:'https://saliteta.github.io/CUHKSZ_SMBU/'},
 {id:'gauu-alignment',target:'GauU-Scene 配准代码说明',kind:'author_repository',url:'https://github.com/saliteta/lidar_SfM_alignment'}
];
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Lenovo/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:false});
const manifest=[];
try {
 for(const source of sources){
  const dir=path.join(output,source.id);await mkdir(dir,{recursive:true});
  let previous;
  try {previous=JSON.parse(await readFile(path.join(dir,'record.json'),'utf8'));}catch{}
  if(previous?.state==='inspected'){manifest.push(previous);console.log(source.id+': checkpoint reused');continue;}
  const page=await context.newPage();
  const record={...source,accessedAt:new Date().toISOString(),state:'pending',coordinates:null,cameraPoses:null,continuousSequence:'unverified',reuseLicense:'unknown',reconstructionReady:false};
  try {
   const robotsUrl=new URL('/robots.txt',source.url).href;
   const robots=await context.request.get(robotsUrl,{timeout:12000});
   const robotsText=robots.ok()?await robots.text():'';
   await writeFile(path.join(dir,'robots.txt'),robotsText,'utf8');
   record.robots={url:robotsUrl,status:robots.status()};
   // Honor wildcard-group Disallow rules. More specific exceptions permit paths.
   let wildcard=false;const rules=[];
   for(const raw of robotsText.split(/\r?\n/)){
    const line=raw.replace(/#.*/,'').trim();const match=line.match(/^(User-agent|Disallow|Allow):\s*(.*)$/i);if(!match)continue;
    if(match[1].toLowerCase()==='user-agent')wildcard=match[2]==='*';
    else if(wildcard&&match[2])rules.push({allow:match[1].toLowerCase()==='allow',value:match[2]});
   }
   const pathname=new URL(source.url).pathname;
   const matches=rules.filter(r=>new RegExp('^'+r.value.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\\\$$/,'$')).test(pathname)).sort((a,b)=>b.value.length-a.value.length||Number(b.allow)-Number(a.allow));
   if(matches[0]&&!matches[0].allow){record.state='robots_disallowed';continue;}
   const response=await page.goto(source.url,{waitUntil:'domcontentloaded',timeout:30000});
   record.httpStatus=response?.status();record.finalUrl=page.url();
   await page.waitForTimeout(1200);
   const body=await page.locator('body').innerText({timeout:8000});
   if(/验证码|访问过于频繁|人机验证|verify you are human|checking your browser/i.test(body)||record.httpStatus===403||record.httpStatus===429){record.state='access_blocked';continue;}
   if(!response?.ok()){record.state='http_error';continue;}
   record.title=await page.title();
   record.media=await page.evaluate(()=>{
    const absolute=value=>{try{return new URL(value,location.href).href;}catch{return null;}};
    const entries=[...document.querySelectorAll('img,video,video source,iframe')].map(el=>({tag:el.tagName.toLowerCase(),url:absolute(el.currentSrc||el.getAttribute('src')||el.getAttribute('data-src')||el.getAttribute('data-original')||''),alt:el.getAttribute('alt')||'',width:el.naturalWidth||el.videoWidth||0,height:el.naturalHeight||el.videoHeight||0}));
    return entries.filter(x=>x.url?.startsWith('http'));
   });
   record.links=await page.evaluate(()=>[...document.querySelectorAll('a[href]')].map(a=>({text:a.innerText.trim().slice(0,120),url:a.href})).filter(a=>/dataset|license|download|数据|视频|航拍|实景|panorama|\.mp4|\.ply|\.zip|youtube|youtu\.be/i.test(a.text+' '+a.url)).slice(0,100));
   record.mediaCount=record.media.length;
   await page.screenshot({path:path.join(dir,'page.png'),fullPage:false});
   await writeFile(path.join(dir,'page-text.txt'),body,'utf8');
   record.textSha256=createHash('sha256').update(body).digest('hex');
   if(source.id==='gauu'){
    record.reuseLicense='Dataset requires author email and dataset license; website CC BY-SA is not the dataset license';
    record.continuousSequence='Source describes overlapping multi-view UAV captures; original data not obtained';
    record.reportedCRS='EPSG:32650 (source claim; bounds and CRS not independently verified)';
    record.accessGate='author_request_required';
   }
   record.state='inspected';
  }catch(error){record.state='request_failed';record.error=error.message;}
  finally {
   await writeFile(path.join(dir,'record.json'),JSON.stringify(record,null,2),'utf8');manifest.push(record);
   await writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2),'utf8');
   console.log(source.id+': '+record.state+'; media='+ (record.mediaCount||0));await page.close();
  }
 }
 await writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2),'utf8');
 const csv=['target,source,state,media_count,continuous_sequence,reconstruction_ready,license',...manifest.map(r=>[r.target,r.url,r.state,r.mediaCount||0,r.continuousSequence,r.reconstructionReady,r.reuseLicense].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(','))].join('\r\n');
 await writeFile(path.join(output,'影像来源清单.csv'),'\ufeff'+csv,'utf8');
}finally{await context.close();await browser.close();}
