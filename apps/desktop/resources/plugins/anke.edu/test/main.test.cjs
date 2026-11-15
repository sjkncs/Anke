'use strict';
// 用桩 pi 宿主验证插件契约：注册工具/命令、面板 IPC、卸载清理。
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

function makePi() {
  const state = { tools: new Map(), commands: new Map(), panels: [] };
  return {
    state,
    agent: {
      registerTool: async (t) => { state.tools.set(t.name, t); },
      unregisterTool: async (name) => { state.tools.delete(name); },
    },
    commands: {
      register: async (c) => { state.commands.set(c.id, c); },
      unregister: async (id) => { state.commands.delete(id); },
    },
    ui: { openPanel: async (o) => { state.panels.push(o); return { opened: true }; } },
  };
}

const pluginDir = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(pluginDir, 'manifest.json'), 'utf8'));

test('manifest 声明了面板与工具', () => {
  assert.equal(manifest.id, 'anke.edu');
  assert.ok(manifest.ui && manifest.ui.panel, 'ui.panel 必须存在');
  assert.ok(fs.existsSync(path.join(pluginDir, manifest.ui.panel)), '面板文件必须存在');
  assert.ok(manifest.permissions.includes('ui.panel'));
  assert.ok(manifest.permissions.includes('agent.tool.register'));
  assert.equal(manifest.contributes.agentTools[0].name, 'ZhixiaoyanKnowledge');
});

test('onLoad 注册工具与命令，onUnload 清理', async () => {
  global.pi = makePi();
  const mod = require('../main.js');
  await mod.onLoad();
  assert.ok(global.pi.state.tools.has('ZhixiaoyanKnowledge'));
  assert.equal(global.pi.state.tools.get('ZhixiaoyanKnowledge').risk, 'low');
  assert.ok(global.pi.state.commands.has('anke.edu.search'));

  await global.pi.state.commands.get('anke.edu.search').run();
  assert.equal(global.pi.state.panels.length, 1);
  assert.equal(global.pi.state.panels[0].title, '辅导平台');

  await mod.onUnload();
  assert.equal(global.pi.state.tools.size, 0);
  assert.equal(global.pi.state.commands.size, 0);
});

test('面板 IPC 返回完整目录与可用问答', async () => {
  global.pi = makePi();
  const mod = require('../main.js');
  await mod.onLoad();

  const cat = await mod.onPanelInvoke('edu.knowledge', { action: 'catalog' });
  assert.equal(cat.count, 86);
  assert.ok(cat.agents.every((a) => a.source.startsWith('https://spising.cn/')));
  assert.ok(cat.agents.some((a) => a.avatar.startsWith('assets/avatars/')));

  const chat = await mod.onPanelInvoke('edu.knowledge', {
    action: 'chat', slug: 'ly-iy5p0s', messages: [{ role: 'user', content: '这本书怎么读' }],
  });
  assert.equal(chat.mode, 'retrieval');
  assert.ok(chat.answer.length > 20);
  assert.ok(chat.citations.length > 0);

  await assert.rejects(() => mod.onPanelInvoke('edu.bogus', {}), /Unsupported education operation/);
  await mod.onUnload();
});
