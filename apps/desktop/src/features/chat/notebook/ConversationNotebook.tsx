import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Button, Field, Input, Select, Textarea, portalOverlay } from "../../../components/ui";
import { depth, emptyNotebook, locateQuote, suggestTasks, type Note, type Notebook, type Task, type Turn } from "./model";
import { readNotebook, writeNotebook } from "./storage";
import "./notebook.css";

type Props = { conversationKey: string; turns: Turn[]; root: RefObject<HTMLElement | null>; reveal?: (node: HTMLElement) => void; earlier?: boolean; loadEarlier?: () => void };
type Draft = Omit<Note, "createdAt">;
function row(root: HTMLElement, id: string) {
  return [...root.querySelectorAll<HTMLElement>("[data-message-id],[data-line-id]")].find(node => (node.dataset.messageId || node.dataset.lineId) === id);
}
function textRange(element: HTMLElement, start: number, length: number) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let node: Node | null, offset = 0, started = false;
  while ((node = walker.nextNode())) {
    const size = node.textContent?.length || 0;
    if (!started && start < offset + size) { range.setStart(node, start - offset); started = true; }
    if (started && start + length <= offset + size) { range.setEnd(node, start + length - offset); return range; }
    offset += size;
  }
  return null;
}
function body(element: HTMLElement) { return element.querySelector<HTMLElement>(".prose-chat,.bt-bubble") || element; }

export function ConversationNotebook({ conversationKey, turns, root, reveal, earlier, loadEarlier }: Props) {
  const { t } = useTranslation();
  const label = (key: string, fallback: string) => t(`notebook.${key}`, { defaultValue: fallback });
  const [book, setBook] = useState<Notebook>(emptyNotebook);
  const [loadedKey, setLoadedKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"tasks" | "notes">("tasks");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [taskDraft, setTaskDraft] = useState<Task | null>(null);
  const [selection, setSelection] = useState<{ draft: Draft; x: number; y: number } | null>(null);
  const editorRef = useRef<HTMLElement | null>(null);
  const keyRef = useRef(conversationKey);
  keyRef.current = conversationKey;
  const commitRef = useRef(false);
  const bookRef = useRef(book); bookRef.current = book;
  const turnsStamp = JSON.stringify(turns);
  useLayoutEffect(() => {
    if (!draft && !taskDraft) return;
    const prior = document.activeElement as HTMLElement | null;
    const editor = editorRef.current;
    editor?.querySelector<HTMLElement>("textarea,input,button")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !commitRef.current) { setDraft(null); setTaskDraft(null); }
      if (event.key !== "Tab" || !editor) return;
      const items = [...editor.querySelectorAll<HTMLElement>("button:not(:disabled),input,textarea,select")];
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); prior?.isConnected && prior.focus(); };
  }, [Boolean(draft || taskDraft)]);
  useEffect(() => {
    let cancelled = false;
    setLoadedKey(""); setDraft(null); setTaskDraft(null); setSelection(null); setError("");
    const load = () => readNotebook(conversationKey).then(value => { if (!cancelled) { setBook(value); setLoadedKey(conversationKey); } }).catch(() => { if (!cancelled) setError(label("readError", "笔记读取失败，请重新打开会话。")); });
    void load();
    const changed = (event: Event) => { if ((event as CustomEvent).detail === conversationKey && !commitRef.current) void load(); };
    window.addEventListener("anke:notebook-saved", changed);
    return () => { cancelled = true; window.removeEventListener("anke:notebook-saved", changed); };
  }, [conversationKey]);
  async function commit(value: Notebook) {
    if (loadedKey !== conversationKey || commitRef.current) return false;
    const key = conversationKey;
    commitRef.current = true; setBusy(true); setError("");
    try {
      await writeNotebook(key, value);
      if (keyRef.current === key) setBook(value);
      return true;
    } catch { if (keyRef.current === key) setError(label("saveError", "未保存成功，请重试或导出已有笔记。")); return false; }
    finally { commitRef.current = false; setBusy(false); }
  }
  useEffect(() => {
    if (loadedKey !== conversationKey || busy) return;
    const tasks = suggestTasks(turns, book.tasks);
    if (tasks.length !== book.tasks.length) void commit({ ...book, tasks });
  }, [turnsStamp, loadedKey]);
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const capture = () => {
      const scope = host.getRootNode() as Document & { getSelection?: () => Selection | null };
      const selected = scope.getSelection?.() || window.getSelection();
      if (!selected || selected.isCollapsed || !selected.rangeCount) { setSelection(null); return; }
      const range = selected.getRangeAt(0);
      const element = range.startContainer.parentElement?.closest<HTMLElement>("[data-message-id],[data-line-id]");
      if (!element || !host.contains(element) || element.classList.contains("bt-urow") || element.classList.contains("user")) return;
      const content = body(element);
      if (!content.contains(range.startContainer) || !content.contains(range.endContainer) || element.closest(".streaming")) return;
      const prefixRange = document.createRange(); prefixRange.selectNodeContents(content); prefixRange.setEnd(range.startContainer, range.startOffset);
      const start = prefixRange.toString().length, quote = range.toString();
      if (!quote.trim() || quote.length > 12000) return;
      const text = content.textContent || "", rect = range.getBoundingClientRect();
      setSelection({ draft: { id: crypto.randomUUID(), messageId: element.dataset.messageId || element.dataset.lineId || "", quote, prefix: text.slice(Math.max(0, start - 32), start), suffix: text.slice(start + quote.length, start + quote.length + 32), image: "", text: "", color: "yellow" }, x: Math.max(12, Math.min(innerWidth - 180, rect.left)), y: Math.max(10, rect.top - 42) });
    };
    const image = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName !== "IMG") return;
      const element = target.closest<HTMLElement>("[data-message-id],[data-line-id]");
      if (!element || !host.contains(element)) return;
      event.preventDefault();
      const images = [...element.querySelectorAll("img")];
      setDraft({ id: crypto.randomUUID(), messageId: element.dataset.messageId || element.dataset.lineId || "", quote: "", prefix: "", suffix: "", image: target.getAttribute("data-annotation-image") || `${target.getAttribute("alt") || "image"} · ${images.indexOf(target as HTMLImageElement) + 1}`, text: "", color: "yellow" });
    };
    host.addEventListener("pointerup", capture);
    host.addEventListener("contextmenu", image);
    return () => { host.removeEventListener("pointerup", capture); host.removeEventListener("contextmenu", image); };
  }, [root, conversationKey]);
  // CSS highlights do not rewrite React-owned text nodes or the original reply.
  useEffect(() => {
    const host = root.current;
    const registry = (CSS as unknown as { highlights?: Map<string, unknown> }).highlights;
    const HighlightClass = (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
    if (!host || !registry || !HighlightClass) return;
    const names = ["anke-note-yellow", "anke-note-red", "anke-note-green"];
    const paint = () => {
      for (const color of ["yellow", "red", "green"]) {
        const ranges = book.notes.filter(n => n.color === color && n.quote).flatMap(n => {
          const element = row(host, n.messageId); if (!element) return [];
          const content = body(element), start = locateQuote(content.textContent || "", n);
          const range = start >= 0 ? textRange(content, start, n.quote.length) : null;
          return range ? [range] : [];
        });
        registry.set(`anke-note-${color}`, new HighlightClass(...ranges));
      }
    };
    let frame = 0;
    const observer = new MutationObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(paint); });
    observer.observe(host, { childList: true, subtree: true, characterData: true }); paint();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); names.forEach(name => registry.delete(name)); };
  }, [book.notes, root]);
  function jump(id: string) {
    const target = root.current && row(root.current, id);
    if (target) { reveal?.(target); if (!reveal) target.scrollIntoView({ block: "center", behavior: "smooth" }); setError(""); }
    else setError(label("loadHistory", "该内容不在当前已加载区间，请先加载更早历史。"));
  }
  const tasks = suggestTasks(turns, loadedKey === conversationKey ? book.tasks : []);
  const ordered: Task[] = [];
  function visit(parent: string) { for (const task of tasks.filter(t => t.parent === parent)) { ordered.push(task); visit(task.id); } }
  visit("");
  const exportBook = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ conversationKey, ...book }, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "ANKE-notebook.json"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <>
    <div className="anke-notebook-launch"><Button variant="ghost" onClick={() => setOpen(!open)} aria-expanded={open}>{label("open", "任务与笔记")}{book.notes.length ? ` · ${book.notes.length}` : ""}</Button></div>
    {selection && loadedKey === conversationKey ? portalOverlay(<div className="anke-note-selection" style={{ left: selection.x, top: selection.y }}><Button onMouseDown={e => e.preventDefault()} onClick={() => { setDraft(selection.draft); setSelection(null); }}>{label("annotate", "标注 / 笔记")}</Button></div>) : null}
    {open ? <aside className="anke-notebook" aria-label={label("open", "任务与笔记")}>
      <header><Button variant="ghost" onClick={() => setTab("tasks")}>{label("tasks", "任务目录")}</Button><Button variant="ghost" onClick={() => setTab("notes")}>{label("notes", "笔记")}</Button><Button variant="ghost" onClick={() => setOpen(false)}>{label("close", "关闭")}</Button></header>
      {error ? <p role="alert">{error}</p> : null}
      {tab === "tasks" ? <><p className="anke-notebook-hint">{label("suggestion", "根据内容相似性建议归属，可手动调整。")}</p>{earlier ? <Button onClick={loadEarlier}>{label("earlier", "加载更早历史")}</Button> : null}{ordered.map(task => <div className="anke-task-row" key={task.id} style={{ paddingInlineStart: (depth(task, tasks) - 1) * 14 }}><Button variant="ghost" onClick={() => jump(task.id)}>{task.title}</Button><Button variant="ghost" onClick={() => setTaskDraft(task)}>{label("edit", "编辑")}</Button></div>)}</> : <>{book.notes.length === 0 ? <p>{label("empty", "选中回复文字添加笔记；右键点击图片添加图片标注。")}</p> : null}{book.notes.map(note => <article className="anke-note-card" key={note.id} data-color={note.color}><blockquote>{note.quote || note.image}</blockquote><p>{note.text}</p><time>{new Date(note.createdAt).toLocaleString()}</time><div><Button variant="ghost" onClick={() => jump(note.messageId)}>{label("locate", "定位原文")}</Button><Button variant="ghost" onClick={() => setDraft(note)}>{label("edit", "编辑")}</Button></div></article>)}<Button onClick={exportBook}>{label("export", "导出笔记与目录")}</Button></>}
    </aside> : null}
    {draft || taskDraft ? portalOverlay(<div className="anke-notebook-backdrop"><section ref={editorRef} className="anke-notebook-editor" role="dialog" aria-modal="true" aria-label={label("editor", "编辑笔记与任务")}>
      <h3>{draft ? label("annotate", "标注 / 笔记") : label("task", "任务归属")}</h3>
      {error ? <p role="alert">{error}</p> : null}
      {draft ? <><blockquote>{draft.quote || draft.image}</blockquote><Field label={label("content", "笔记内容")}><Textarea autoFocus maxLength={10000} value={draft.text} onChange={e => setDraft({ ...draft, text: e.target.value })} /></Field><Field label={label("color", "标注颜色")}><Select value={draft.color} onChange={e => setDraft({ ...draft, color: e.target.value })}><option value="yellow">{label("yellow", "重点 · 黄色")}</option><option value="red">{label("red", "待核实 · 红色")}</option><option value="green">{label("green", "已确认 · 绿色")}</option></Select></Field></> : taskDraft ? <><Field label={label("title", "任务标题")}><Input autoFocus maxLength={120} value={taskDraft.title} onChange={e => setTaskDraft({ ...taskDraft, title: e.target.value })} /></Field><Field label={label("parent", "所属大任务")}><Select value={taskDraft.parent} onChange={e => setTaskDraft({ ...taskDraft, parent: e.target.value })}><option value="">{label("root", "独立任务")}</option>{tasks.filter(task => { try { const proposed = tasks.map(t => t.id === taskDraft.id ? { ...taskDraft, parent: task.id } : t); return task.id !== taskDraft.id && depth(taskDraft.id === task.id ? taskDraft : task, tasks) < 3 && proposed.every(t => depth(t, proposed) <= 3); } catch { return false; } }).map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</Select></Field></> : null}
      <footer><Button disabled={busy} onClick={() => { setDraft(null); setTaskDraft(null); }}>{label("cancel", "取消")}</Button>{draft && book.notes.some(n => n.id === draft.id) ? <Button disabled={busy} onClick={async () => { if (await commit({ ...book, notes: book.notes.filter(n => n.id !== draft.id) })) setDraft(null); }}>{label("delete", "删除笔记")}</Button> : null}<Button disabled={busy || loadedKey !== conversationKey || !(draft ? draft.text.trim() : taskDraft?.title.trim())} onClick={async () => {
        const value = draft ? { ...book, notes: [...book.notes.filter(n => n.id !== draft.id), { ...draft, createdAt: book.notes.find(n => n.id === draft.id)?.createdAt || new Date().toISOString() }] } : { ...book, tasks: tasks.map(task => task.id === taskDraft?.id ? { ...taskDraft, manual: true } : task) };
        if (await commit(value)) { setDraft(null); setTaskDraft(null); setOpen(true); if (draft) setTab("notes"); }
      }}>{busy ? label("saving", "正在保存…") : label("save", "确认保存")}</Button></footer>
    </section></div>) : null}
  </>;
}
