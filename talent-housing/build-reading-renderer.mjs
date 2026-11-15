import {loadConfigFromFile} from '../anke-agent-source/node_modules/electron-vite/dist/index.js';
import {build} from '../anke-agent-source/node_modules/vite/dist/node/index.js';
const root='C:/Users/Lenovo/Desktop/全市租金导航仓/anke-agent-source/apps/desktop';
process.chdir(root);
const loaded=await loadConfigFromFile({command:'build',mode:'production'},root+'/electron.vite.config.ts',root);
await build({...loaded.config.renderer,configFile:false,root,base:'./',build:{...loaded.config.renderer.build,outDir:'C:/Users/Lenovo/Desktop/全市租金导航仓/_workspace/ai-reading-20261114/renderer',emptyOutDir:true}});
