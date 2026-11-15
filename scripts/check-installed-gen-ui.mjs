import { spawn } from "node:child_process";
import { mkdtemp, mkdir, copyFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

// Read-only acceptance against a disposable profile, never the user's database.
const [host, fragment] = process.argv.slice(2);
if (!host || !fragment) throw new Error("usage: node check-installed-gen-ui.mjs HOST FRAGMENT");
const profile = await mkdtemp(join(tmpdir(), "anke-genui-check-"));
await mkdir(join(profile, "visualizations", "acceptance"), { recursive: true });
await copyFile(fragment, join(profile, "visualizations", "acceptance", "chart.html"));
const child = spawn(host, [], { env: { ...process.env, PI_DESKTOP_DATA_DIR: profile }, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
child.stderr.on("data", (chunk) => process.stderr.write(chunk));
const pending = new Map();
const lines = createInterface({ input: child.stdout });
lines.on("line", (line) => {
  try { const message = JSON.parse(line); pending.get(message.id)?.(message); } catch {}
});
let id = 0;
const call = (method, params) => new Promise((resolve, reject) => {
  const requestId = String(++id);
  const timer = setTimeout(() => reject(new Error(`${method} timeout`)), 45000);
  pending.set(requestId, (value) => { clearTimeout(timer); pending.delete(requestId); resolve(value); });
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: requestId, method, params })}\n`);
});
try {
  let handshake = await call("app.handshake", { protocolVersion: 1 });
  const mismatch = /host=(\d+)/.exec(handshake.error?.message ?? "");
  if (mismatch) handshake = await call("app.handshake", { protocolVersion: Number(mismatch[1]) });
  if (handshake.error) throw new Error(handshake.error.message);
  // Startup sweeps orphan visualizations; install the fixture after it finishes.
  await mkdir(join(profile, "visualizations", "acceptance"), { recursive: true });
  await copyFile(fragment, join(profile, "visualizations", "acceptance", "chart.html"));
  const read = await call("visualizations.readFragment", { sessionId: "acceptance", fileName: "chart.html" });
  if (read.error || !read.result?.ok) throw new Error(JSON.stringify(read.error ?? read.result));
  const bytes = Buffer.from(read.result.base64, "base64");
  if (!bytes.equals(await readFile(fragment))) throw new Error("fragment bytes differ");
  console.log(JSON.stringify({ nativeRead: "PASS", bytes: bytes.length }));
} finally {
  child.kill();
  await new Promise((resolve) => child.once("close", resolve));
  lines.close();
  await rm(profile, { recursive: true, force: true });
}
