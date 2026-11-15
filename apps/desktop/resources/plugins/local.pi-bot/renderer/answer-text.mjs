// Display projection only: original conversation and executable payloads remain intact.
export function answerText(source){
  return String(source??'').split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`|https?:\/\/[^\s<>]+)/g).map((part,i)=>i%2?part:part.replace(/^[ \t]*(?:-(?:[ \t]+|$)|[#*]+[ \t]*)/gm,'').replace(/\*/g,'').replace(/#/g,'')).join('');
}
