'use strict';
// Isolate the plugin lifecycle; retain production dispatch, relay and handlers.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
function harness(team){
  const filename=path.resolve(__dirname,'../main.js'),exports={};
  const context={require:createRequire(filename),module:{exports},exports,process,Buffer,console,fixtureTeam:team,pi:{app:{getAppearance:()=>({theme:'light'}),setTheme:async()=>{}}}};
  vm.runInNewContext(fs.readFileSync(filename,'utf8')+'\nactivation={ready:async()=>({team:fixtureTeam,microphone:{operation:()=>({status:"idle"}),panel:()=>({status:"idle"})}}),status:()=>({phase:"ready"})};',context,{filename});
  const api=context.module.exports;
  async function request(channel,payload={}){
    const {id}=api.onRendererCall('request.start',{channel,payload});let json='';
    const deadline=Date.now()+15000;while(Date.now()<deadline){
      const result=api.onRendererCall('request.read',{id,offset:json.length});
      if(result.pending){await new Promise(resolve=>setTimeout(resolve,10));continue;}
      if(result.error)throw Error(result.error);json+=result.chunk;if(result.done)return JSON.parse(json);
    }
    throw Error('Route did not settle.');
  }
  return {...api,request};
}
module.exports={harness};
