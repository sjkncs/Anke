import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PI_BOT_PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../../../',import.meta.url));

test('native reading hook paces the first chunk and completion without delaying history',async ctx=>{
 const bundle=await build({absWorkingDir:root,stdin:{contents:`
 import React from 'react';
 import {createRoot} from 'react-dom/client';
 import {flushSync} from 'react-dom';
 import {useSmoothText} from './apps/desktop/src/hooks/useSmoothText';
 const root=createRoot(document.querySelector('#app'));
 function Reply({text,live}){return React.createElement('p',null,useSmoothText(text,live,true));}
 window.reply=(text,live,key)=>flushSync(()=>root.render(React.createElement(Reply,{text,live,key})));
 `,resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser'});
 const browser=await chromium.launch({headless:true,executablePath:process.env.PI_BOT_CHROMIUM||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1234/chrome-win64/chrome.exe')});
 ctx.after(()=>browser.close());
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // A routed origin provides localStorage without touching a real app profile.
 await page.route('http://reading.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="app"></div>'}));
 await page.goto('http://reading.test/');
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 await page.evaluate(()=>{localStorage.setItem('anke.readingSpeed','20');window.reply('字'.repeat(200),false,'history');});
 assert.equal((await page.locator('p').innerText()).length,200);
 const first=await page.evaluate(()=>{window.reply('字'.repeat(200),true,'live');return document.querySelector('p').textContent.length;});
 assert.equal(first,0);
 await page.waitForFunction(()=>document.querySelector('p').textContent.length>=5);
 const done=await page.evaluate(()=>{window.reply('字'.repeat(200),false,'live');return document.querySelector('p').textContent.length;});
 assert.ok(done>=5&&done<100,'completion preserves the reading buffer');
 await page.evaluate(()=>localStorage.setItem('anke.readingSpeed','0'));
 await page.waitForFunction(()=>document.querySelector('p').textContent.length===200);
 assert.deepEqual(errors,[]);
});
