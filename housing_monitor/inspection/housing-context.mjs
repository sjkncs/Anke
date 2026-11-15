export async function housingContext(action,extra={}){
 const origin='http://127.0.0.1:47831';
 const page=await fetch(origin+'/housing_monitor/',{signal:AbortSignal.timeout(5000),redirect:'error'});if(!page.ok)throw Error('住房服务暂未连接');
 const token=(await page.text()).match(/name="anke-service-token" content="([a-f0-9]+)"/)?.[1];if(!token)throw Error('住房服务认证失败');
 const response=await fetch(origin+'/api',{method:'POST',headers:{'Content-Type':'application/json','Origin':origin,'X-Anke-Token':token},body:JSON.stringify({action,...extra}),signal:AbortSignal.timeout(120000),redirect:'error'});const value=await response.json();if(!response.ok)throw Error(value.error==='Unknown request field'?'请从 Anke 客户端连接模型后生成解读':value.error||'分析暂未完成');return value;
}
