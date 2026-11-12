import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
const root = resolve(import.meta.dirname, "../../..");
const { build } = createRequire(join(root, "packages/agent-runtime/package.json"))("esbuild");

test("rental roles: catalog, durable isolated bindings and independent launch context", async () => {
  const temp = await mkdtemp(join(process.env.PI_SCRATCH_DIR || tmpdir(), "rental-roles-"));
  try {
    const bundle = join(temp, "roles.mjs");
    await build({ stdin: { contents: 'export * from "./electron/main/rental-workspaces"; export * from "./electron/main/rental-role-store"; export * from "./src/lib/rental-roles";', resolveDir: resolve(import.meta.dirname, ".."), loader: "ts" }, outfile: bundle, bundle: true, platform: "node", format: "esm" });
    const { RentalRoleStore, RENTAL_ROLES, rentalRoleContext, rentalWorkspaceInitializer } = await import(pathToFileURL(bundle).href);
    const groups = [], sessions = [];
    const workspaceRoles = new RentalRoleStore(join(temp, "workspace-profile"));
    const host = { async call(method, input) {
      if (method === "project.groups.list") return { groups };
      if (method === "session.list") return { sessions };
      if (method === "project.group.create") { groups.push({ name: input.name, roots: input.folders.map(path => ({ path })) }); return {}; }
      if (method === "session.create") { const session = { ...input, id: `fixed-${sessions.length}` }; sessions.push(session); return { session }; }
      throw new Error(method);
    } };
    const workspaceRoot = join(temp, "workspaces");
    const initialize = rentalWorkspaceInitializer(host, workspaceRoles, workspaceRoot);
    await Promise.all([initialize(), initialize()]);
    assert.equal(groups.length, 9); assert.equal(sessions.length, 9);
    await rentalWorkspaceInitializer(host, workspaceRoles, workspaceRoot)();
    assert.equal(groups.length, 9); assert.equal(sessions.length, 9);
    for (const role of RENTAL_ROLES) {
      const session = sessions.find(item => item.title === role.name);
      assert.equal(session.projectPath, join(workspaceRoot, role.name));
      assert.equal(workspaceRoles.get(session.id), role.id);
    }
    assert.equal(RENTAL_ROLES.length, 9);
    assert.equal(new Set(RENTAL_ROLES.map(r => r.id)).size, 9);
    const store = new RentalRoleStore(temp);
    for (const role of RENTAL_ROLES) store.bind(`session-${role.id}`, role.id);
    const restarted = new RentalRoleStore(temp);
    for (const role of RENTAL_ROLES) {
      assert.equal(restarted.get(`session-${role.id}`), role.id);
      const context = restarted.context(`session-${role.id}`);
      assert.equal(context.source, `安居咨询角色 / ${role.id}`);
      assert.match(context.content, /政策必须核对官方原文/);
      assert.match(context.content, /模拟非实测/);
      assert.match(context.content, /不得二次调整/);
      assert.match(context.content, /不是财政实际支出/);
    }
    assert.equal(restarted.context("unbound"), undefined);
    assert.equal(new RentalRoleStore(join(temp, "other-profile")).get("session-owner-advisor"), undefined);
    assert.throws(() => store.bind("session-owner-advisor", "resident-advisor"), /不能覆盖/);
    assert.throws(() => store.bind("invalid", "made-up"), /无效/);
    assert.equal(rentalRoleContext("made-up"), undefined);
    // Actual launch boundary: separate instruction entry, never mutate user text
    // or replace the custom system prompt. Agent IPC resolves it for each launch.
    const launch = await readFile(join(root, "apps/desktop/electron/main/runtime/session-launch.ts"), "utf8");
    assert.match(launch, /new RentalRoleStore\(dataDir\)\.context\(sessionId\)/);
    assert.match(launch, /entries: \[\.\.\.\(projectInstructions\?\.entries \?\? \[\]\), roleContext\]/);
    assert.match(launch, /customSystemPrompt,/);
    const ipc = await readFile(join(root, "apps/desktop/electron/main/ipc/session-ipc.ts"), "utf8");
    assert.match(ipc, /rentalRoleId, \.\.\.hostInput/);
    assert.match(ipc, /roles\.bind\(res\.session\.id, rentalRoleId\)/);
    await writeFile(join(temp, "rental-session-roles.json"), "broken");
    assert.throws(() => new RentalRoleStore(temp).context("session-owner-advisor"));
  } finally { await rm(temp, { recursive: true, force: true }); }
});
