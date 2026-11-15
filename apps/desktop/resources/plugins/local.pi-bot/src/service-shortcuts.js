'use strict';
function validateServiceShortcuts(value,state){
  if(!Array.isArray(value)||value.length>200)throw Error('Invalid service shortcuts');
  const seen=new Set();
  for(const item of value){
    if(!item||typeof item!=='object'||Object.keys(item).some(k=>!['kind','id','group'].includes(k))||!['bot','visual'].includes(item.kind)||typeof item.id!=='string'||!['work','living','housing','wealth','learning','wellbeing','travel-shopping'].includes(item.group))throw Error('Invalid service shortcut');
    if(item.kind==='bot'&&!state.bots.some(b=>b.id===item.id))throw Error('Unknown service bot');
    if(item.kind==='visual'&&!['niulai','worldmonitor'].includes(item.id))throw Error('Unknown visual service');
    const key=item.kind+':'+item.id;if(seen.has(key))throw Error('Duplicate service shortcut');seen.add(key);
  }
  return structuredClone(value);
}
module.exports={validateServiceShortcuts};
