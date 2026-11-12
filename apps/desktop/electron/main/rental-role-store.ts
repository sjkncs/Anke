import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { rentalRole, rentalRoleContext, type RentalRoleId } from "../../src/lib/rental-roles";

/** Main-process-only sidecar metadata; never changes host session schemas. */
export class RentalRoleStore {
  private readonly path: string;
  private readonly dataDir: string;
  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.path = join(dataDir, "rental-session-roles.json");
  }
  private read(): Record<string, RentalRoleId> {
    let text: string;
    try { text = readFileSync(this.path, "utf8"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return Object.create(null);
      throw error;
    }
    const parsed = JSON.parse(text);
    if (parsed?.version !== 1 || !parsed.bindings || typeof parsed.bindings !== "object" || Array.isArray(parsed.bindings)) {
      throw new Error("租赁角色配置损坏，请恢复配置后重试");
    }
    const result: Record<string, RentalRoleId> = Object.create(null);
    for (const [id, role] of Object.entries(parsed.bindings)) {
      if (!rentalRole(role)) throw new Error("租赁角色配置包含未知角色");
      result[id] = role as RentalRoleId;
    }
    return result;
  }
  get(sessionId: string): RentalRoleId | undefined { return this.read()[sessionId]; }
  bind(sessionId: string, roleId: unknown): void {
    const role = rentalRole(roleId);
    if (!sessionId || !role) throw new Error("无效的会话角色");
    const bindings = this.read();
    if (bindings[sessionId] && bindings[sessionId] !== role.id) throw new Error("不能覆盖已有会话角色");
    bindings[sessionId] = role.id;
    mkdirSync(this.dataDir, { recursive: true });
    // Synchronous read/atomic replace serializes main-process writers. Failed writes
    // fail creation rather than displaying a role that will not survive restart.
    const temporary = `${this.path}.tmp`;
    writeFileSync(temporary, JSON.stringify({ version: 1, bindings }), { mode: 0o600 });
    renameSync(temporary, this.path);
  }
  context(sessionId: string) { return rentalRoleContext(this.get(sessionId)); }
}
