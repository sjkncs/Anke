import { useRef, useState } from "react";
import { RENTAL_ROLES, type RentalRoleId } from "../lib/rental-roles";
import { useAppStore } from "../stores/app-store";
import { Button, Panel } from "./ui";
import "../styles/rental-services.css";

export function RentalServices({ onSelected }: { onSelected?: () => void }) {
  const [pending, setPending] = useState<RentalRoleId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  async function start(roleId: RentalRoleId) {
    if (locked.current) return;
    locked.current = true;
    setPending(roleId);
    setError(null);
    try {
      // Reopen the durable role workspace rather than creating temporary sessions.
      const store = useAppStore.getState();
      await store.refreshSessions();
      const existing = useAppStore.getState().sessions.find(session => (session as { rentalRoleId?: string }).rentalRoleId === roleId && session.projectPath);
      if (!existing) throw new Error("业务工作区尚未准备完成，请重试");
      await useAppStore.getState().selectSession(existing.id);
      onSelected?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "创建失败，请重试");
    } finally {
      locked.current = false;
      setPending(null);
    }
  }
  return <section className="rental-services" aria-label="安居咨询服务" aria-busy={pending !== null}>
    <header><h2>安居工作区</h2><p>选择一项业务，继续你的工作。</p></header>
    <div className="rental-services-grid">
      {RENTAL_ROLES.map((role) => <Panel key={role.id} className="rental-service-card">
        <h3>{role.name}</h3><p>{role.description}</p>
        <Button disabled={pending !== null} onClick={() => void start(role.id)} aria-label={`咨询${role.name}`}>
          {pending === role.id ? "正在打开…" : "进入工作区"}
        </Button>
      </Panel>)}
    </div>
    {pending ? <p role="status">正在打开业务工作区…</p> : null}
    {error ? <p role="alert">{error} · 请重新选择服务重试</p> : null}
  </section>;
}
