export function grade(bars,end,horizon,direction){
 if(!Number.isInteger(end)||end<1||!Number.isInteger(horizon)||horizon<1||end+horizon>bars.length||!['up','down'].includes(direction))throw Error('Invalid training round');
 const before=bars[end-1],after=bars[end+horizon-1];
 if(!Number.isFinite(before.close)||!Number.isFinite(after.close)||before.close<=0||after.close<=0)throw Error('Training requires positive prices');
 const change=(after.close/before.close-1)*100;
 return {from:before.date,to:after.date,direction,horizon,change,score:change===0?null:Number(direction==='up'?change>0:change<0)};
}
