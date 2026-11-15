const { evaluate } = require('./analysis.cjs');
const manifest = require('./manifest.json');
async function onLoad() {
  await pi.agent.registerTool({...manifest.contributes.agentTools[0], execute: async args => evaluate(args)});
}
async function onUnload() { await pi.agent.unregisterTool('AnkeEvidence'); }
module.exports = {onLoad, onUnload};
