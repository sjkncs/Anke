export type Note = { id: string; messageId: string; quote: string; prefix: string; suffix: string; image: string; text: string; color: string; createdAt: string };
export type Task = { id: string; title: string; parent: string; manual?: boolean };
export type Notebook = { version: 1; notes: Note[]; tasks: Task[] };
export const emptyNotebook = (): Notebook => ({ version: 1, notes: [], tasks: [] });
export type Turn = { id: string; text: string };
function tokens(text: string) {
  const words = text.toLowerCase().match(/[a-z0-9]{2,}|[\u4e00-\u9fff]+/g) || [];
  return new Set(words.flatMap(w => /[\u4e00-\u9fff]/.test(w) ? Array.from({ length: Math.max(0, w.length - 1) }, (_, i) => w.slice(i, i + 2)) : [w]));
}
function similarity(a: Set<string>, b: Set<string>) {
  return [...a].filter(x => b.has(x)).length / Math.sqrt(Math.max(1, a.size * b.size));
}
export function depth(task: Task, tasks: Task[], seen = new Set<string>()): number {
  if (!task.parent) return 1;
  if (seen.has(task.id)) throw Error("TASK_CYCLE");
  seen.add(task.id);
  const parent = tasks.find(t => t.id === task.parent);
  if (!parent) throw Error("TASK_PARENT_MISSING");
  return 1 + depth(parent, tasks, seen);
}
export function validateNotebook(book: Notebook) {
  if (book.version !== 1 || !Array.isArray(book.notes) || !Array.isArray(book.tasks)) throw Error("NOTEBOOK_INVALID");
  if (new Set(book.tasks.map(t => t.id)).size !== book.tasks.length) throw Error("TASK_DUPLICATE");
  for (const task of book.tasks) {
    if (!task.id || !task.title.trim() || task.title.length > 120 || depth(task, book.tasks) > 3) throw Error("TASK_INVALID");
  }
  for (const note of book.notes) {
    if (!note.id || !note.messageId || !note.text.trim() || note.text.length > 10000 || !["yellow", "red", "green"].includes(note.color)) throw Error("NOTE_INVALID");
  }
  return book;
}
/** Conservative local lexical suggestions; manual corrections always win. */
export function suggestTasks(turns: Turn[], saved: Task[]): Task[] {
  const tasks = [...saved];
  for (const [index, turn] of turns.entries()) {
    if (tasks.some(t => t.id === turn.id)) continue;
    const text = turn.text.trim();
    const words = tokens(text);
    const prior = turns.slice(0, index);
    const best = prior.map(t => ({ id: t.id, score: similarity(words, tokens(t.text)) })).sort((a, b) => b.score - a.score)[0];
    const continuation = /^(继续|下一步|好的|接着|再试)/.test(text) && text.length < 35;
    let parent = continuation ? prior.at(-1)?.id || "" : best && best.score >= 0.22 ? best.id : "";
    while (parent) {
      const owner = tasks.find(t => t.id === parent);
      if (!owner) { parent = ""; break; }
      if (depth(owner, tasks) < 3) break;
      parent = owner.parent;
    }
    tasks.push({ id: turn.id, title: text.replace(/\s+/g, " ").slice(0, 50) || "…", parent });
  }
  return tasks;
}
/** Require quote plus surrounding context; ambiguous edits never silently move a note. */
export function locateQuote(text: string, note: Pick<Note, "quote" | "prefix" | "suffix">) {
  if (!note.quote) return -1;
  const matches: number[] = [];
  let at = -1;
  while ((at = text.indexOf(note.quote, at + 1)) !== -1) {
    if (text.slice(Math.max(0, at - note.prefix.length), at) === note.prefix && text.slice(at + note.quote.length, at + note.quote.length + note.suffix.length) === note.suffix) matches.push(at);
  }
  return matches.length === 1 ? matches[0] : -1;
}
