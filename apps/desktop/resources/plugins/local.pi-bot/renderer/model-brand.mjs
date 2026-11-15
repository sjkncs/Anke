// Official product favicons, bundled locally; never send model names to a logo service.
export function modelBrand(record) {
  const model=String(record.name||record.id||'').toLowerCase();
  const provider=String(record.providerName||'').toLowerCase();
  const identify=text=>/claude|sonnet|opus|haiku|anthropic/.test(text)?'claude':/deepseek/.test(text)?'deepseek':/gemini/.test(text)?'gemini':/gpt|codex|openai|\bo[134](?:\b|-)/.test(text)?'openai':null;
  return identify(model)||identify(provider);
}
export function renderModelBrand(glyph,record) {
  glyph.classList.add('bt-us-model');
  const brand=modelBrand(record);
  if(!brand){glyph.textContent='◇';glyph.title='模型';return;}
  const img=document.createElement('img');
  img.src=new URL(`./assets/model-logos/${brand}.${brand==='openai'?'ico':'svg'}`,import.meta.url).href;
  img.alt={claude:'Claude',deepseek:'DeepSeek',gemini:'Gemini',openai:'OpenAI'}[brand];
  img.width=28;img.height=28;
  img.onerror=()=>{img.remove();glyph.textContent='◇';};
  glyph.append(img);
}
