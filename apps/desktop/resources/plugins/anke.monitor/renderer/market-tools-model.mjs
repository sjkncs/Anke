import {mean} from './indicators.mjs';
export function screen(rows,filters={}){
 const checks=[['pct','minPct',1],['pct','maxPct',-1],['amount','minAmount',1],['turnover','minTurnover',1],['pe','maxPE',-1]];
 return rows.filter(row=>checks.every(([field,key,direction])=>{
  const threshold=filters[key];if(threshold==null||threshold==='')return true;
  return Number.isFinite(threshold)&&Number.isFinite(row[field])&&(direction===1?row[field]>=threshold:row[field]<=threshold);
 }));
}
export function validateAlert(rule){
 if(!/^(sh|sz|bj)\d{6}$/.test(rule.code||'')||!['price','pct'].includes(rule.field)||!['above','below'].includes(rule.direction)||!Number.isFinite(rule.threshold))throw Error('Invalid alert');
 return rule;
}
export function evaluateAlerts(rules,rows,time){
 const index=new Map(rows.map(row=>[row.code,row]));
 return rules.map(rule=>{validateAlert(rule);if(rule.triggeredAt)return {...rule};const row=index.get(rule.code),value=row?.[rule.field];if(!row||row.suspended||!Number.isFinite(value))return {...rule};
  return (rule.direction==='above'?value>=rule.threshold:value<=rule.threshold)?{...rule,triggeredAt:time,observed:value}:{...rule};});
}
export function backtest(bars,{fast=5,slow=20,capital=100000,feeBps=3,slippageBps=5}={}){
 if(!Number.isInteger(fast)||!Number.isInteger(slow)||fast<2||slow<=fast||slow>120||!Number.isFinite(capital)||capital<=0||![feeBps,slippageBps].every(v=>Number.isFinite(v)&&v>=0&&v<=100))throw Error('Invalid backtest parameters');
 if(bars.length<=slow)throw Error('Insufficient history');
 if(bars.some(b=>![b.open,b.close].every(v=>Number.isFinite(v)&&v>0)))throw Error('Backtest requires positive adjusted prices');
 const close=bars.map(b=>b.close),f=mean(close,fast),s=mean(close,slow),fee=feeBps/10000,slip=slippageBps/10000;
 let cash=capital,shares=0,entryCost=0,peak=capital,maxDrawdown=0,wins=0,closed=0;const trades=[],equity=[];
 for(let i=0;i<bars.length;i++){
  // A completed close determines target exposure for the following open.
  if(i>0&&s[i-1]!=null){const long=f[i-1]>s[i-1];
   if(long&&!shares){const price=bars[i].open*(1+slip);entryCost=cash;shares=cash/(price*(1+fee));trades.push({date:bars[i].date,side:'buy',price,quantity:shares,fee:shares*price*fee});cash=0;}
   else if(!long&&shares){const price=bars[i].open*(1-slip),proceeds=shares*price*(1-fee);if(proceeds>entryCost)wins++;closed++;trades.push({date:bars[i].date,side:'sell',price,quantity:shares,fee:shares*price*fee,pnl:proceeds-entryCost});cash=proceeds;shares=0;}
  }
  const value=cash+shares*bars[i].close;peak=Math.max(peak,value);maxDrawdown=Math.max(maxDrawdown,1-value/peak);equity.push({date:bars[i].date,value});
 }
 return {returnPct:(equity.at(-1).value/capital-1)*100,benchmarkPct:(bars.at(-1).close/bars[0].close-1)*100,maxDrawdownPct:maxDrawdown*100,winPct:closed?wins/closed*100:null,closed,openPosition:shares>0,trades,equity};
}
