import { emptyNotebook, validateNotebook, type Notebook } from "./model";
/** Personal reading overlays, deliberately separate from host-owned chat records. */
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("anke-personal-notebook", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("conversations");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readNotebook(key: string): Promise<Notebook> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("conversations").objectStore("conversations").get(key);
      request.onsuccess = () => { try { resolve(request.result ? validateNotebook(request.result) : emptyNotebook()); } catch (error) { reject(error); } };
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
export async function writeNotebook(key: string, book: Notebook): Promise<void> {
  validateNotebook(book);
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("conversations", "readwrite");
      transaction.objectStore("conversations").put(book, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || Error("NOTEBOOK_ABORTED"));
    });
    window.dispatchEvent(new CustomEvent("anke:notebook-saved", { detail: key }));
  } finally { db.close(); }
}
