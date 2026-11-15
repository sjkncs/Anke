// Presentation only: never delay persistence, tools, approvals or cancellation.
export const PACE_KEY='anke.readingSpeed';
export const paceValue=value=>value!==null&&[0,20,40,80].includes(Number(value))?Number(value):40;
export function createReadingPace({now=()=>Date.now(),speed=()=>paceValue(localStorage.getItem(PACE_KEY)),recommend=()=>{}}={}){
  const records=new Map();let prompted=false,visible=new Set();
  return {
    project(lines){visible=new Set(lines.map(line=>line.id));return lines.map(line=>{
      if(!line.id||!line.jobId&&!line.progress)return line;
      if(['failed','error','needs_review','aborted','cancelled'].includes(line.status)){records.delete(line.id);return line;}
      let record=records.get(line.id);
      if(!record){if(!line.progress&&!line.activityOnly)return line;record={start:now(),last:now(),shown:0,text:'',done:false};records.set(line.id,record);}
      if(records.size>500){for(const [id,old] of records)if(old.done&&old.shown>=Array.from(old.text).length&&id!==line.id){records.delete(id);if(records.size<=400)break;}}
      const text=String(line.text||''),chars=Array.from(text),rate=speed(),time=now();
      if(!text.startsWith(record.text)){record.shown=0;record.last=time;}
      record.shown=rate===0?chars.length:Math.min(chars.length,record.shown+Math.max(0,time-record.last)*rate/1000);
      record.last=time;record.text=text;
      const complete=!line.progress&&!line.activityOnly;
      if(complete&&!record.done){record.done=true;const seconds=Math.max(.1,typeof line.durationMs==='number'?line.durationMs/1000:(time-record.start)/1000),outputRate=chars.length/seconds;
        if(!prompted&&chars.length>=160&&outputRate>80){prompted=true;recommend({seconds,outputRate});}}
      return {...line,text:chars.slice(0,Math.floor(record.shown)).join(''),progress:record.shown<chars.length||line.progress};
    });},
    pending(){return [...visible].some(id=>{const r=records.get(id);return r&&r.shown<Array.from(r.text).length;});},
    clear(){records.clear();visible.clear();}
  };
}
