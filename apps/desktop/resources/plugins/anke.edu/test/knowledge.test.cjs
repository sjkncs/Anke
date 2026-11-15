'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { knowledge, search } = require('../knowledge.cjs');

test('stats reports the public boundary', () => {
  const s = knowledge({ action: 'stats' });
  assert.ok(s.agents > 50, 'should mirror dozens of agents');
  assert.ok(s.fileEntries > 100);
  assert.match(s.boundary, /public metadata only/);
});

test('search finds 骆驼祥子 and keeps a source', () => {
  const r = knowledge({ action: 'search', query: '骆驼祥子 整本书阅读' });
  assert.ok(r.count > 0);
  assert.ok(r.results[0].source.startsWith('https://spising.cn/'), 'source must be the original page');
  assert.ok(r.results[0].snippet.length > 0);
});

test('agent card for the featured page', () => {
  const r = knowledge({ action: 'agent', slug: 'ly-iy5p0s' });
  assert.equal(r.found, true);
  assert.equal(r.agent.name, '智小舍');
  assert.equal(r.agent.subject, '语文');
});

test('subject filter narrows results', () => {
  const r = knowledge({ action: 'list', subject: '语文', limit: 10 });
  assert.ok(r.count > 0);
  assert.ok(r.agents.every((a) => a.subject === '语文'));
});

test('unknown fields are rejected', () => {
  assert.throws(() => knowledge({ action: 'search', query: 'x', bogus: 1 }), /Unknown field/);
  assert.throws(() => knowledge({ action: 'nope' }), /Invalid action/);
});

test('empty query is rejected', () => {
  assert.throws(() => knowledge({ action: 'search', query: '   ' }), /query is required/);
});
