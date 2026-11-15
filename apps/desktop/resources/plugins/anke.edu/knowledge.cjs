'use strict';
/**
 * ZhixiaoyanKnowledge —— 智小研公开知识库的本地检索。
 *
 * 数据边界：只包含平台公开的智能体资料（名称/简介/说明/开场白/示例问题/知识库文件名/统计）
 * 与教师作者信息；不含任何知识库正文。正文需由用户用本人账号从原平台导出后，
 * 放进 data/imported/ 再重建索引（见 tools/build-index.mjs）。
 */
const fs = require('node:fs');
const path = require('node:path');

const DATA = path.join(__dirname, 'data');
const AGENTS_FILE = path.join(DATA, 'agents.jsonl');
const FILES_FILE = path.join(DATA, 'files-index.jsonl');
const IMPORTED_DIR = path.join(DATA, 'imported');

const K1 = 1.4, B = 0.72;

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}

const agents = readJsonl(AGENTS_FILE);
const fileIndex = readJsonl(FILES_FILE);

/** 用户自备正文：imported/<slug>__<title>.md，头部可带 frontmatter title/source。 */
function loadImported() {
  const out = [];
  if (!fs.existsSync(IMPORTED_DIR)) return out;
  for (const name of fs.readdirSync(IMPORTED_DIR)) {
    if (!/\.(md|txt|json)$/i.test(name)) continue;
    const slug = name.split('__')[0];
    const body = fs.readFileSync(path.join(IMPORTED_DIR, name), 'utf8');
    out.push({ slug, title: name, body });
  }
  return out;
}
const imported = loadImported();

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

function buildDocs() {
  const docs = [];
  for (const a of agents) {
    const fields = {
      name: a.name,
      brief: a.brief,
      description: a.description,
      welcome: a.welcome,
      examples: (a.examples || []).join('\n'),
      files: (a.files || []).join('\n'),
      meta: [a.subject, a.grade, a.school, a.author, ...(a.capabilities || [])].join(' '),
    };
    for (const [field, text] of Object.entries(fields)) {
      if (!text || !String(text).trim()) continue;
      const tokens = tokenize(text);
      const tf = new Map();
      for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
      docs.push({ slug: a.slug, field, text: String(text), len: tokens.length, tf });
    }
  }
  for (const imp of imported) {
    const tokens = tokenize(imp.body);
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    docs.push({ slug: imp.slug, field: 'imported', text: imp.body.slice(0, 4000), len: tokens.length, tf });
  }
  const df = new Map();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  const avgLen = docs.reduce((n, d) => n + d.len, 0) / (docs.length || 1);
  return { docs, df, avgLen };
}
const index = buildDocs();

function search(query, { subject, grade, limit = 5, perAgent = false, slug = null } = {}) {
  const qTokens = [...new Set(tokenize(query))];
  if (!qTokens.length) return [];
  const allowed = new Set(agents.filter((a) => (!slug || a.slug === slug) && (!subject || a.subject === subject) && (!grade || a.grade === grade)).map((a) => a.slug));
  const scored = [];
  for (const d of index.docs) {
    if (!allowed.has(d.slug)) continue;
    let score = 0;
    for (const t of qTokens) {
      const f = d.tf.get(t);
      if (!f) continue;
      const df = index.df.get(t) || 0;
      const idf = Math.log(1 + (index.docs.length - df + 0.5) / (df + 0.5));
      score += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + B * (d.len / index.avgLen))));
    }
    if (score > 0) scored.push({ ...d, score });
  }
  scored.sort((x, y) => y.score - x.score);
  if (perAgent) return scored.slice(0, Math.min(20, Math.max(1, limit)));
  const best = new Map();
  for (const s of scored) {
    const prev = best.get(s.slug);
    if (!prev || prev.score < s.score) best.set(s.slug, s);
  }
  return [...best.values()].sort((x, y) => y.score - x.score).slice(0, Math.min(20, Math.max(1, limit)));
}

function agentCard(slug) {
  const a = agents.find((x) => x.slug === slug);
  if (!a) return null;
  return {
    slug: a.slug,
    name: a.name,
    subject: a.subject,
    grade: a.grade,
    school: a.school,
    author: a.author,
    brief: a.brief,
    description: (a.description || '').slice(0, 1200),
    welcome: a.welcome,
    examples: a.examples || [],
    files: a.files || [],
    capabilities: a.capabilities || [],
    stats: a.stats || {},
    avatar: a.avatar ? `assets/avatars/${a.avatar}` : '',
    source: a.source,
    note: (a.files || []).length ? 'files 为平台公开的文件清单，正文未镜像' : '该智能体未公开知识库文件',
  };
}

function catalog() {
  return agents.map((a) => ({
    slug: a.slug,
    name: a.name,
    subject: a.subject,
    grade: a.grade,
    school: a.school,
    author: a.author,
    brief: a.brief,
    description: (a.description || '').slice(0, 1600),
    welcome: a.welcome || '',
    examples: a.examples || [],
    files: a.files || [],
    capabilities: a.capabilities || [],
    stats: a.stats || {},
    avatar: a.avatar ? `assets/avatars/${a.avatar}` : '',
    source: a.source,
  }));
}

/** 面板问答：单智能体多字段检索 + 抽取式回答（不生成、不编造）。 */
function chat(input = {}) {
  const a = agents.find((x) => x.slug === input.slug);
  if (!a) throw Error('unknown agent');
  const msgs = Array.isArray(input.messages) ? input.messages.filter((m) => m && typeof m.content === 'string') : [];
  const q = [...msgs].reverse().find((m) => m.role === 'user')?.content || input.query || '';
  if (!String(q).trim()) throw Error('empty question');
  const hits = search(q, { slug: a.slug, perAgent: true, limit: 4 });
  const examples = (a.examples || []).slice(0, 3);
  const answer = hits.length
    ? hits.map((h, i) => `${h.text.trim()} [${i + 1}]`).join('\n\n') +
      '\n\n（本地检索模式：以上摘自该智能体的公开资料，未做生成；知识库正文未镜像。）'
    : `本地知识库里没有与这个问题直接相关的内容。\n\n可以换个说法，或从这些方向问：\n${(examples.length ? examples : [a.brief]).map((x) => `- ${x}`).join('\n')}`;
  return {
    answer,
    mode: 'retrieval',
    citations: hits.map((h, i) => ({ n: i + 1, field: h.field, text: h.text.slice(0, 240), source: a.source })),
    agent: { slug: a.slug, name: a.name, avatar: a.avatar ? `assets/avatars/${a.avatar}` : '' },
  };
}

function knowledge(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Invalid input');
  const allowedKeys = ['action', 'query', 'subject', 'grade', 'limit', 'slug', 'messages'];
  for (const k of Object.keys(input)) if (!allowedKeys.includes(k)) throw Error(`Unknown field: ${k}`);
  const action = input.action || 'search';
  if (!['search', 'agent', 'list', 'stats', 'catalog', 'chat'].includes(action)) throw Error('Invalid action');
  if (input.query !== undefined && (typeof input.query !== 'string' || input.query.length > 300)) throw Error('Invalid query');
  if (input.slug !== undefined && typeof input.slug !== 'string') throw Error('Invalid slug');
  const limit = Number.isInteger(input.limit) ? input.limit : 5;

  if (action === 'catalog') return { generatedAt: new Date().toISOString(), count: agents.length, agents: catalog() };

  if (action === 'chat') return chat(input);

  if (action === 'stats') {
    return {
      agents: agents.length,
      subjects: [...new Set(agents.map((a) => a.subject).filter(Boolean))],
      agentsWithFiles: agents.filter((a) => (a.files || []).length).length,
      fileEntries: fileIndex.length,
      importedDocuments: imported.length,
      figureAgents: agents.filter((a) => (a.capabilities || []).includes('figure')).length,
      boundary: 'public metadata only; knowledge-base file bodies are not stored',
    };
  }

  if (action === 'list') {
    const list = agents
      .filter((a) => (!input.subject || a.subject === input.subject) && (!input.grade || a.grade === input.grade))
      .slice(0, Math.min(50, limit));
    return { count: list.length, agents: list.map((a) => ({ slug: a.slug, name: a.name, subject: a.subject, grade: a.grade, school: a.school, files: (a.files || []).length, source: a.source })) };
  }

  if (action === 'agent') {
    if (!input.slug) throw Error('slug is required for agent');
    const card = agentCard(input.slug);
    if (!card) return { found: false, slug: input.slug };
    return { found: true, agent: card };
  }

  const q = (input.query || '').trim();
  if (!q) throw Error('query is required for search');
  const hits = search(q, { subject: input.subject, grade: input.grade, limit });
  return {
    query: q,
    count: hits.length,
    results: hits.map((h) => ({
      slug: h.slug,
      name: (agents.find((a) => a.slug === h.slug) || {}).name,
      field: h.field,
      score: Math.round(h.score * 100) / 100,
      snippet: h.text.slice(0, 400),
      source: (agents.find((a) => a.slug === h.slug) || {}).source,
    })),
    note: hits.length ? '引用时保留 source；files 字段只是文件名清单，正文未镜像。' : '没有命中，可换关键词或先用 list 看学科分布。',
  };
}

module.exports = { knowledge, search, catalog, chat, agents, fileIndex, imported };
