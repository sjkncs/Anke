import { useEffect, useRef, useState } from "react";
import { ConversationNotebook } from "./ConversationNotebook";
import type { Turn } from "./model";
type BotContext = { key: string; root: HTMLElement; turns: Turn[]; reveal: (node: HTMLElement) => void };
/** In-process bridge only; the plugin never receives notebook contents. */
export function BotNotebookHost() {
  const [context, setContext] = useState<BotContext | null>(null);
  const root = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const changed = (event: Event) => {
      const value = (event as CustomEvent<BotContext | null>).detail;
      if (!value) { setContext(null); root.current = null; return; }
      if (!(value.root instanceof HTMLElement) || !value.root.isConnected || typeof value.key !== "string" || !Array.isArray(value.turns)) return;
      root.current = value.root; setContext(value);
    };
    window.addEventListener("anke:bot-notebook", changed);
    const mode = (event: Event) => setActive((event as CustomEvent).detail === true);
    window.addEventListener("pi-bot:mode", mode);
    return () => { window.removeEventListener("anke:bot-notebook", changed); window.removeEventListener("pi-bot:mode", mode); };
  }, []);
  return active && context ? <div className="anke-bot-notebook"><ConversationNotebook key={context.key} conversationKey={`bot:${context.key}`} root={root} turns={context.turns} reveal={context.reveal} /></div> : null;
}
