import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { readFile } from "node:fs/promises";
import { slotSsr } from "./helpers/slot-ssr.mjs";

test("only recoverable visualization failures offer a native retry button", async (t) => {
  const ssr = await slotSsr(t);
  const { UnavailableCard } = await ssr.load("/src/features/chat/gen-ui/GenUiCard.tsx");
  for (const reason of ["not-found", "runtime-unavailable"]) {
    const html = ssr.render(createElement(UnavailableCard, { title: "Trend", reason, onRetry() {} }));
    assert.match(html, /<button[^>]*type="button"/);
    assert.match(html, /Try again/);
  }
  for (const reason of ["outside", "remote", "too-large", "not-fragment"]) {
    const html = ssr.render(createElement(UnavailableCard, { title: "Trend", reason, onRetry() {} }));
    assert.doesNotMatch(html, /<button/);
  }
  assert.doesNotMatch(ssr.render(createElement(UnavailableCard, { title: "Trend", reason: "not-found" })), /<button/);
});

test("custom personas retain decision-card and successful-write guidance", async () => {
  const source = await readFile(new URL("../../../packages/agent-runtime/src/runtime.ts", import.meta.url), "utf8");
  assert.match(source, /call asktool to present 2–4 concrete options/);
  assert.match(source, /suffix its label with （推荐）/);
  assert.match(source, /Do not ask again about choices already answered/);
  assert.match(source, /Publish a ::visualize reference only after Write succeeds/);
  assert.match(source, /Never claim the chart was displayed merely because Write succeeded/);
});
