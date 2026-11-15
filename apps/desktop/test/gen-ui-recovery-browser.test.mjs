import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PI_BOT_PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("../../../", import.meta.url));

test("missing fragment retry remounts the same session and sandbox", async (t) => {
  const bundle = await build({ absWorkingDir: root, stdin: { contents: `
    import React from 'react';
    import {createRoot} from 'react-dom/client';
    import {GenUiCard} from './apps/desktop/src/features/chat/gen-ui/GenUiCard';
    createRoot(document.querySelector('#app')).render(React.createElement(GenUiCard, {
      sessionId:'acceptance', remote:false,
      reference:{path:'/profile/visualizations/acceptance/chart.html',title:'Trend',location:{sessionId:'acceptance',fileName:'chart.html'}}
    }));
  `, resolveDir: root, loader: "tsx" }, bundle: true, write: false, format: "iife", platform: "browser", loader: { ".css": "empty" } });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PI_BOT_CHROMIUM || join(process.env.LOCALAPPDATA, "ms-playwright/chromium-1234/chrome-win64/chrome.exe") });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route("http://recovery.test/**", (route) => route.fulfill({ contentType: "text/html", body: '<div id="app"></div>' }));
  await page.goto("http://recovery.test/");
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.waitForSelector("iframe");
  const url = await page.locator("iframe").getAttribute("src");
  await page.evaluate(() => {
    const frame = document.querySelector("iframe");
    window.firstFrame = frame;
    window.dispatchEvent(new MessageEvent("message", { source: frame.contentWindow, data: { type: "pi-genui:error", code: "not-found" } }));
  });
  await page.waitForSelector(".is-unavailable button");
  assert.equal(await page.locator("iframe").count(), 0);
  await page.locator(".is-unavailable button").click();
  await page.waitForSelector("iframe");
  assert.equal(await page.locator("iframe").getAttribute("src"), url);
  assert.equal(await page.locator("iframe").getAttribute("sandbox"), "allow-scripts");
  assert.equal(await page.evaluate(() => document.querySelector("iframe") !== window.firstFrame), true);
  await page.evaluate(() => window.dispatchEvent(new MessageEvent("message", { source: window, data: { type: "pi-genui:error", code: "not-found" } })));
  assert.equal(await page.locator(".is-unavailable").count(), 0);
});
