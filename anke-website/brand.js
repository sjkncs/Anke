// Shared product position. This describes application guidance, not model training.
(() => {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('brand.css', document.currentScript.src).href;
  document.head.append(stylesheet);
  const motto = '在复杂中建立判断，在变化中安顿生活。';
  document.title = 'ANKE 安客 · ' + motto;
  const title = document.getElementById('hero-title');
  if (title) title.replaceChildren('在复杂中建立判断，', document.createElement('br'), Object.assign(document.createElement('span'), {textContent:'在变化中安顿生活。'}));
  const lead = document.querySelector('.hero .lead');
  if (lead) lead.textContent = '连接分散的数据、空间与经验，让每一次判断有据可循，让每一步行动有所依托。';
  const section = document.createElement('section');
  section.id = 'responsibility';
  section.setAttribute('aria-labelledby', 'responsibility-title');
  section.innerHTML = '<div class="section-heading"><div><p class="eyebrow">PERSONAL SAFETY. HUMAN CONTROL.</p><h2 id="responsibility-title">以个人安全为先，<br><span>以稳健研发为本。</span></h2></div><p>面向个人客户，重视长期信任。<br>让能力增长与责任边界共同完善。</p></div><div class="principle-grid"><article><span>01 / 宪法式行为准则</span><h3>让原则贯穿每一次协助。</h3><p>借鉴宪法式 AI 的明确原则与自查思路，将隐私、诚实、避免伤害和尊重自主写入 Bot 的统一行为指引。回答前核对证据与权限，发现冲突时说明原因并提出更稳妥的做法。</p></article><article><span>02 / 人始终拥有决定权</span><h3>行动有边界，选择在您手中。</h3><p>重要外部操作以明确授权为前提。不索取聊天中的密码，不把不确定的信息包装成结论，不以焦虑诱导订阅、付费或扩大授权。</p></article><article><span>03 / 专注个人，稳健研发</span><h3>以可验证的能力，积累长期信任。</h3><p>优先完善个人客户的具体体验，逐项验证功能、成本与数据边界；如实说明尚未接通或验证的能力。</p></article></div><details><summary>Song 的产品主张与框架边界</summary><p>Song 主张：当前更应警惕的，是激进的产品策略把风险扩散到个人生活。盲目扩张板块、囤积算力，以及围绕订阅和交易的激进增长，若缺少隐私、权限与成本约束，可能放大个人安全风险。ANKE 将专注个人客户与稳健研发视为长期战略优势。这是产品立场与风险判断，不是对特定竞争产品的事实认定，也不排除技术本身的风险。</p><p>目前采用的是产品层的原则约束和回答自查指引；尚未完成自有模型的宪法式训练、AI 反馈强化学习或安全效果评估。提示约束不能替代工具权限、人工监督与实际验证。</p><p>方法参考：<a href="https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback" target="_blank" rel="noopener">Anthropic · Constitutional AI</a></p></details>';
  const main = document.querySelector('main');
  section.prepend(Object.assign(document.createElement('p'), {className:'eyebrow', textContent:motto}));
  if (main && !document.getElementById(section.id)) main.insertBefore(section, main.querySelector('#start'));
  const footer = document.querySelector('footer p');
  if (footer) footer.textContent = motto;
})();
