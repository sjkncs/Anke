'use strict';
const { knowledge } = require('./knowledge.cjs');
const manifest = require('./manifest.json');

const tool = manifest.contributes.agentTools[0];

async function onLoad() {
  await pi.agent.registerTool({
    ...tool,
    execute: async (args) => knowledge(args),
  });
  await pi.commands.register({
    id: 'anke.edu.search',
    title: '辅导平台',
    keywords: ['智小研', '教学', '智能体', '知识库', '辅导'],
    run: async () => pi.ui.openPanel({ title: '辅导平台' }),
  });
}

async function onUnload() {
  await pi.agent.unregisterTool(tool.name);
  await pi.commands.unregister('anke.edu.search');
}

async function onPanelInvoke(channel, payload) {
  if (channel !== 'edu.knowledge') throw Error('Unsupported education operation');
  return knowledge(payload);
}

module.exports = { onLoad, onUnload, onPanelInvoke };
