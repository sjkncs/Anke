/* 辅导平台 · 智小研本地镜像（Anke 面板）
 * 数据：宿主 IPC edu.knowledge（catalog/chat）→ 无宿主时回退到 assets/catalog.json + 本地检索。
 */
(function () {
  'use strict';

  const view = document.getElementById('view');
  const statusEl = document.getElementById('status');
  const homeBtn = document.getElementById('home-btn');
  const bridge = window.pluginBridge || null;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString('zh-CN');

  let AGENTS = null;
  let fig = null;
  let current = null; // { slug } when in detail/chat

  /* ---------- 数据通路 ---------- */
  async function loadCatalog() {
    if (AGENTS) return AGENTS;
    if (bridge) {
      const r = await bridge.invoke('edu.knowledge', { action: 'catalog' });
      AGENTS = r.agents;
    } else {
      const r = await fetch('assets/catalog.json');
      AGENTS = (await r.json()).agents;
    }
    statusEl.textContent = `本地镜像 · ${AGENTS.length} 个智能体`;
    statusEl.classList.add('ok');
    return AGENTS;
  }

  async function askAgent(slug, messages) {
    if (bridge) return bridge.invoke('edu.knowledge', { action: 'chat', slug, messages });
    return localChat(slug, messages);
  }

  /* ---------- 本地检索（无宿主时兜底） ---------- */
  function tokenize(text) {
    const s = String(text || '').toLowerCase();
    const out = [];
    for (const m of s.matchAll(/[a-z0-9][a-z0-9._-]{1,30}/g)) out.push(m[0]);
    for (const seg of s.replace(/[^\u4e00-\u9fa5]+/g, ' ').split(/\s+/).filter(Boolean)) {
      for (let i = 0; i < seg.length - 1; i++) out.push(seg.slice(i, i + 2));
      if (seg.length === 1) out.push(seg);
    }
    return out;
  }

  function localChat(slug, messages) {
    const a = AGENTS.find((x) => x.slug === slug);
    const q = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    const fields = [
      ['brief', a.brief], ['description', a.description], ['welcome', a.welcome],
      ['examples', (a.examples || []).join('\n')], ['files', (a.files || []).join('\n')],
    ].filter(([, t]) => t && String(t).trim());
    const qt = [...new Set(tokenize(q))];
    const hits = fields.map(([field, text]) => {
      const toks = tokenize(text);
      const tf = new Map();
      for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
      let score = 0;
      for (const t of qt) if (tf.get(t)) score += tf.get(t) / Math.sqrt(toks.length + 1);
      return { field, text, score };
    }).filter((h) => h.score > 0).sort((x, y) => y.score - x.score).slice(0, 4);

    if (!hits.length) {
      return {
        mode: 'retrieval',
        answer: `本地知识库里没有与这个问题直接相关的内容。\n\n可以换个说法，或从这些方向问：\n${(a.examples.length ? a.examples : [a.brief]).slice(0, 3).map((x) => `- ${x}`).join('\n')}`,
        citations: [],
      };
    }
    return {
      mode: 'retrieval',
      answer: hits.map((h, i) => `${h.text.trim()} [${i + 1}]`).join('\n\n') + '\n\n（本地检索模式：以上摘自该智能体的公开资料，未做生成；知识库正文未镜像。）',
      citations: hits.map((h, i) => ({ n: i + 1, field: h.field, text: h.text.slice(0, 240), source: a.source })),
    };
  }

  /* ---------- 渲染工具 ---------- */
  const avatarCache = new Map();
  function avatarHtml(a, cls) {
    const key = a.name || a.slug || 'ANKE';
    if (!avatarCache.has(key)) avatarCache.set(key, AnkeEducationArt.avatar(key));
    return `<span class="avatar ${cls || ''}"><img src="${avatarCache.get(key)}" alt="" loading="lazy"></span>`;
  }
  const tag = (text, cls) => (text ? `<span class="tag ${cls || ''}">${esc(text)}</span>` : '');
  function stopFigure() { if (fig) { fig.destroy(); fig = null; } }
  function setHome(show) { homeBtn.hidden = !show; }
  function setHash(h) { try { history.replaceState(null, '', h); } catch { /* file:// 下忽略 */ } }
  homeBtn.addEventListener('click', () => { stopFigure(); setHash('#/'); renderList(); });

  /* ---------- 广场 ---------- */
  async function renderList() {
    stopFigure();
    current = null;
    setHome(false);
    setHash('#/');
    const agents = await loadCatalog();
    const subjects = [...new Set(agents.map((a) => a.subject).filter(Boolean))]
      .map((s) => ({ s, n: agents.filter((a) => a.subject === s).length }))
      .sort((x, y) => y.n - x.n);

    view.innerHTML = `<div class="wrap">
      <div class="toolbar">
        <label class="search"><span>🔎</span><input id="q" placeholder="搜索名称、学校、作者、简介、知识库文件名…" /></label>
      </div>
      <div class="toolbar"><div class="chips" id="subjects">
        <button class="chip active" data-s="">全部 ${agents.length}</button>
        ${subjects.map((x) => `<button class="chip" data-s="${esc(x.s)}">${esc(x.s)} ${x.n}</button>`).join('')}
      </div></div>
      <div class="grid" id="grid"></div>
    </div>`;

    const grid = document.getElementById('grid');
    const paint = () => {
      const q = (document.getElementById('q').value || '').trim().toLowerCase();
      const subj = document.querySelector('#subjects .chip.active')?.dataset.s || '';
      const list = agents.filter((a) => {
        if (subj && a.subject !== subj) return false;
        if (!q) return true;
        return [a.name, a.school, a.author, a.brief, a.description, a.subject, a.grade, ...(a.files || [])].join(' ').toLowerCase().includes(q);
      });
      grid.innerHTML = list.length ? list.map((a) => `
        <button class="card" data-slug="${esc(a.slug)}">
          <div class="card-head">${avatarHtml(a)}
            <div style="min-width:0"><div class="card-title">${esc(a.name)}</div>
            <div class="card-sub">${esc(a.school || '未标注学校')} · ${esc(a.author || '匿名')}</div></div>
          </div>
          <div class="card-brief">${esc(a.brief || '（无简介）')}</div>
          <div class="card-foot">
            ${tag(a.subject, 'blue')}${tag(a.grade)}
            ${(a.capabilities || []).includes('figure') ? tag('数字人', 'purple') : ''}
            ${(a.files || []).length ? tag(`知识库 ${a.files.length}`, 'green') : ''}
            <span class="usage">${fmt(a.stats && a.stats.userCount)} 人使用</span>
          </div>
        </button>`).join('') : '<p class="empty">没有匹配的智能体。</p>';
      grid.querySelectorAll('[data-slug]').forEach((b) => b.addEventListener('click', () => renderDetail(b.dataset.slug)));
    };
    document.getElementById('q').addEventListener('input', paint);
    document.querySelectorAll('#subjects .chip').forEach((b) => b.addEventListener('click', () => {
      document.querySelectorAll('#subjects .chip').forEach((x) => x.classList.remove('active'));
      b.classList.add('active'); paint();
    }));
    paint();
  }

  /* ---------- 详情 ---------- */
  async function renderDetail(slug) {
    stopFigure();
    current = { slug };
    setHome(true);
    setHash(`#/agents/${encodeURIComponent(slug)}`);
    const agents = await loadCatalog();
    const a = agents.find((x) => x.slug === slug);
    if (!a) { view.innerHTML = '<div class="wrap"><p class="empty">找不到该智能体。</p></div>'; return; }
    const examples = (a.examples || []).length ? a.examples : [a.brief];
    const caps = [
      ['kb', '知识库问答'], ['voice', '语音朗读'], ['voiceInput', '语音输入'], ['figure', '数字人形象'], ['upload', '上传图片和文件'],
    ];

    view.innerHTML = `<div class="wrap">
      <div class="crumbs"><a href="#" id="back">辅导平台</a> / ${esc(a.subject || '智能体')} / ${esc(a.name)}</div>
      <div class="detail">
        <div>
          <div class="panel">
            <div class="detail-head">${avatarHtml(a, 'lg')}
              <div style="min-width:0;flex:1">
                <h2>${esc(a.name)}</h2>
                <div class="meta">${esc(a.brief || '')}</div>
                <div class="meta">${tag(a.subject, 'blue')}${tag(a.grade)}${tag(a.school)}</div>
              </div>
            </div>
            <div class="body">
              <div class="cta">
                <button class="btn" id="start">开始辅导</button>
                <a class="btn ghost" href="${esc(a.source)}" target="_blank" rel="noreferrer">查看原页</a>
              </div>
              <div class="stats">
                <div><b>${fmt(a.stats && a.stats.userCount)}</b><span>使用人数</span></div>
                <div><b>${fmt(a.stats && a.stats.chatCount)}</b><span>对话</span></div>
                <div><b>${fmt(a.stats && a.stats.questionCount)}</b><span>提问</span></div>
                <div><b>${esc((a.stats && a.stats.lastActiveTime || '').slice(0, 10) || '—')}</b><span>最近使用</span></div>
              </div>
            </div>
          </div>
          <div class="panel" style="margin-top:12px"><div class="body">
            <div class="section"><h3>开场白</h3><p>${esc(a.welcome || '（未设置开场白）')}</p></div>
            <div class="section"><h3>可以这样问</h3><div class="qa">
              ${examples.slice(0, 6).map((q) => `<button data-q="${esc(q)}">${esc(q)}</button>`).join('')}
            </div></div>
            <div class="section"><h3>智能体说明</h3><p>${esc(a.description || '（平台未公开说明）')}</p></div>
            <div class="section"><h3>知识库文件 <span class="tag">${(a.files || []).length}</span></h3>
              ${(a.files || []).length
                ? `<ul class="files">${a.files.map((f) => `<li>📄 ${esc(f)}</li>`).join('')}</ul>
                   <p style="margin-top:7px;font-size:12px;color:var(--ink-3)">仅公开文件名；正文需原平台账号导出。</p>`
                : '<p class="empty" style="padding:0">该智能体未公开知识库文件。</p>'}
            </div>
          </div></div>
        </div>
        <aside class="panel"><div class="body">
          <div class="section"><h3>基本信息</h3><dl class="kv">
            <dt>学校</dt><dd>${esc(a.school || '未标注')}</dd>
            <dt>作者</dt><dd>${esc(a.author || '未标注')}</dd>
            <dt>学科</dt><dd>${esc(a.subject || '未标注')}</dd>
            <dt>学段</dt><dd>${esc(a.grade || '未标注')}</dd>
            <dt>来源</dt><dd><a href="${esc(a.source)}" target="_blank" rel="noreferrer" style="color:var(--brand)">原页 ↗</a></dd>
          </dl></div>
          <div class="section"><h3>平台能力</h3><div class="caps">
            ${caps.map(([k, label]) => `<span class="cap ${(a.capabilities || []).includes(k) ? 'on' : ''}">${(a.capabilities || []).includes(k) ? '✓' : '×'} ${label}</span>`).join('')}
          </div></div>
        </div></aside>
      </div>
    </div>`;

    document.getElementById('back').addEventListener('click', (e) => { e.preventDefault(); renderList(); });
    document.getElementById('start').addEventListener('click', () => renderChat(slug));
    view.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => renderChat(slug, b.dataset.q)));
  }

  /* ---------- 对话 ---------- */
  async function renderChat(slug, initialQ) {
    stopFigure();
    current = { slug };
    setHome(true);
    setHash(`#/chat/${encodeURIComponent(slug)}`);
    const agents = await loadCatalog();
    const a = agents.find((x) => x.slug === slug);
    if (!a) return renderList();

    view.innerHTML = `<div class="chat">
      <div class="panel figure-panel">
        <canvas id="fig" aria-label="ANKE 手绘学习伙伴"></canvas>
        <div class="figure-name">${esc(a.name)}</div>
        <div class="figure-status" id="fig-status">点「打招呼」唤醒数字人</div>
        <div class="figure-controls">
          <button class="mini on" id="voice">🔊 朗读：开</button>
          <button class="mini" id="hello">打招呼</button>
          <button class="mini" id="stop">停止</button>
        </div>
        <div class="figure-note">ANKE 手绘学习伙伴 · 教育培训<br />语音由设备提供 · 无摄像头</div>
      </div>
      <div class="panel chat-panel">
        <div class="chat-head">${avatarHtml(a)}
          <div style="min-width:0"><div class="title">${esc(a.name)}</div>
          <div class="sub">${esc(a.subject || '')}${a.grade ? ' · ' + esc(a.grade) : ''} · 知识库 ${(a.files || []).length} 条 · 检索模式</div></div>
        </div>
        <div class="messages" id="msgs"></div>
        <div class="composer">
          <textarea id="input" rows="1" placeholder="问点什么…（Enter 发送）"></textarea>
          <button class="icon-btn send" id="send" title="发送">➤</button>
        </div>
      </div>
    </div>`;

    const msgs = document.getElementById('msgs');
    const input = document.getElementById('input');
    const status = document.getElementById('fig-status');
    let voiceOn = true;
    const history = [];

    fig = new DigitalFigure(document.getElementById('fig'), { name: a.name });
    fig.setStyleFromName(a.name);

    const add = (role, text, citations) => {
      const el = document.createElement('div');
      el.className = `msg ${role === 'user' ? 'user' : 'bot'}`;
      el.innerHTML = `${role === 'bot' ? avatarHtml(a) : ''}<div><div class="who">${role === 'bot' ? esc(a.name) : '我'}</div>
        <div class="bubble">${esc(text)}</div>
        ${citations && citations.length ? `<div class="cites">${citations.map((c) => `<details><summary>来源 [${c.n}] · ${esc(c.field)}</summary><p>${esc(c.text)}</p></details>`).join('')}</div>` : ''}</div>`;
      msgs.appendChild(el);
      msgs.scrollTop = msgs.scrollHeight;
    };

    const greeting = a.welcome || `你好，我是${a.name}。${a.brief || ''}`;
    add('bot', greeting);

    async function send(q) {
      const text = String(q || '').trim();
      if (!text) return;
      add('user', text);
      history.push({ role: 'user', content: text });
      input.value = '';
      fig.stop();
      status.textContent = '正在检索本地知识库…';
      const typing = document.createElement('div');
      typing.className = 'msg bot';
      typing.innerHTML = `${avatarHtml(a)}<div class="bubble typing"><span></span><span></span><span></span></div>`;
      msgs.appendChild(typing);
      msgs.scrollTop = msgs.scrollHeight;

      try {
        const d = await askAgent(a.slug, history);
        typing.remove();
        add('bot', d.answer, d.citations);
        history.push({ role: 'assistant', content: d.answer });
        status.textContent = voiceOn ? '正在朗读…' : '说完了，继续问我吧';
        if (voiceOn) fig.speak(d.answer, { onEnd: () => { status.textContent = '说完了，继续问我吧'; } });
      } catch (e) {
        typing.remove();
        add('bot', `出错了：${e.message}`);
        status.textContent = '出错了';
      }
    }

    document.getElementById('send').addEventListener('click', () => send(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); }
    });
    input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(120, input.scrollHeight) + 'px'; });
    document.getElementById('voice').addEventListener('click', (e) => {
      voiceOn = !voiceOn;
      e.currentTarget.classList.toggle('on', voiceOn);
      e.currentTarget.textContent = voiceOn ? '🔊 朗读：开' : '🔈 朗读：关';
      if (!voiceOn) fig.stop();
    });
    document.getElementById('hello').addEventListener('click', () => {
      primeVoices();
      status.textContent = '正在打招呼…';
      fig.speak(greeting, { onEnd: () => { status.textContent = '说完了，继续问我吧'; } });
    });
    document.getElementById('stop').addEventListener('click', () => { fig.stop(); status.textContent = '已停止'; });

    if (initialQ) { input.value = initialQ; send(initialQ); }
  }

  window.addEventListener('beforeunload', stopFigure);
  window.__panel = { renderList, renderDetail, renderChat };

  function routeFromHash() {
    const raw = decodeURIComponent(location.hash.replace(/^#/, ''));
    const [pathPart, queryPart] = raw.split('?');
    const q = new URLSearchParams(queryPart || '').get('q') || '';
    const m = pathPart.match(/^\/(agents|chat)\/(.+)$/);
    if (m && m[1] === 'chat') return renderChat(m[2], q);
    if (m && m[1] === 'agents') return renderDetail(m[2]);
    return renderList();
  }
  window.addEventListener('hashchange', routeFromHash);

  routeFromHash().catch((e) => {
    statusEl.textContent = '加载失败';
    view.innerHTML = `<div class="wrap"><p class="empty">加载失败：${esc(e.message)}</p></div>`;
  });
})();
