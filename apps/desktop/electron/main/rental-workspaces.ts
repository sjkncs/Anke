import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { RENTAL_ROLES } from "../../src/lib/rental-roles";
import { RentalRoleStore } from "./rental-role-store";

type Session = { id: string; projectPath?: string | null };
type Group = { name: string; roots: { path: string }[] };
type Host = { call<T>(method: string, input?: unknown): Promise<T> };
const pathKey = (path: string) => {
  const key = path.replace(/\\/g, "/").replace(/\/$/, "");
  return process.platform === "win32" ? key.toLowerCase() : key;
};

/** Host RPC owns project/session persistence; this service only provisions folders. */
export function rentalWorkspaceInitializer(host: Host, roles: RentalRoleStore, root = join(homedir(), "Anke工作区")) {
  let pending: Promise<void> | undefined;
  let initialized = false;
  return async () => {
    if (initialized) return;
    if (pending) return pending;
    pending = (async () => {
      const { groups } = await host.call<{ groups: Group[] }>("project.groups.list");
      const { sessions } = await host.call<{ sessions: Session[] }>("session.list");
      for (const role of RENTAL_ROLES) {
        const projectPath = join(root, role.name);
        await mkdir(projectPath, { recursive: true });
        if (!groups.some(group => group.roots.some(root => pathKey(root.path) === pathKey(projectPath)))) {
          await host.call("project.group.create", { name: role.name, folders: [projectPath] });
        }
        const existing = sessions.find(session => session.projectPath && pathKey(session.projectPath) === pathKey(projectPath) && roles.get(session.id) === role.id);
        if (!existing) {
          const { session } = await host.call<{ session: Session }>("session.create", { title: role.name, projectPath, mode: "agent" });
          roles.bind(session.id, role.id);
        }
      }
      initialized = true;
    })();
    try { await pending; } finally { pending = undefined; }
  };
}
