'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createUpdateChecker}=require('../src/updates');
const repository='fixture/Anke';
const release=()=>({tag_name:'v0.22.0',html_url:'https://github.com/'+repository+'/releases/tag/v0.22.0',assets:[{name:'Anke-Agent-Setup-0.22.0.exe',state:'uploaded',size:100,browser_download_url:'https://github.com/'+repository+'/releases/download/v0.22.0/Anke-Agent-Setup-0.22.0.exe'}]});
test('missing Anke repository never calls upstream or reports current',async()=>{
 const result=await createUpdateChecker({repository:null,fetchJSON:async()=>{throw Error('Unexpected network');}}).check();assert.equal(result.status,'unconfigured');
});
test('Anke updater accepts only the configured repository and installer',async()=>{
 let address;const result=await createUpdateChecker({repository,current:'0.21.0',fetchJSON:async url=>{address=url;return release();}}).check();
 assert.equal(address,'https://api.github.com/repos/fixture/Anke/releases/latest');assert.equal(result.status,'available');assert.match(result.downloadUrl,/Anke-Agent-Setup-0.22.0.exe$/);
});
test('foreign release, plugin package and wrong installer URLs never report success',async()=>{
 for(const mutate of [r=>r.html_url='https://github.com/other/repo/releases/tag/v0.22.0',r=>r.assets[0].browser_download_url='https://evil.test/installer.exe',r=>r.assets[0].name='upstream.piplug']){
  const value=release();mutate(value);assert.equal((await createUpdateChecker({repository,fetchJSON:async()=>value}).check()).status,'error');
 }
});
