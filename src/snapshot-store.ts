import type { FlowEvent } from './types';
const DB_NAME = 'agent-sse-flow'; const DB_VERSION = 1; const STORE_NAME = 'snapshots';
export interface EventSnapshot { id: string; name: string; createdAt: string; eventCount: number; events: FlowEvent[]; }
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB is not available')); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' }); };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
export async function saveSnapshot(name: string, events: FlowEvent[]): Promise<EventSnapshot> {
  const db = await openDB(); const snapshot: EventSnapshot = { id: `snap-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, name, createdAt: new Date().toISOString(), eventCount: events.length, events: [...events] };
  return new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, 'readwrite'); const store = tx.objectStore(STORE_NAME); const req = store.put(snapshot); req.onsuccess = () => resolve(snapshot); req.onerror = () => reject(req.error); tx.oncomplete = () => db.close(); });
}
export async function loadAllSnapshots(): Promise<EventSnapshot[]> {
  const db = await openDB(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, 'readonly'); const store = tx.objectStore(STORE_NAME); const req = store.getAll(); req.onsuccess = () => { const results = req.result as EventSnapshot[]; results.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); resolve(results); }; req.onerror = () => reject(req.error); tx.oncomplete = () => db.close(); });
}
export async function loadSnapshot(id: string): Promise<EventSnapshot | null> {
  const db = await openDB(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, 'readonly'); const store = tx.objectStore(STORE_NAME); const req = store.get(id); req.onsuccess = () => resolve(req.result ?? null); req.onerror = () => reject(req.error); tx.oncomplete = () => db.close(); });
}
export async function deleteSnapshot(id: string): Promise<void> {
  const db = await openDB(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, 'readwrite'); const store = tx.objectStore(STORE_NAME); const req = store.delete(id); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error); tx.oncomplete = () => db.close(); });
}
export async function clearAllSnapshots(): Promise<void> {
  const db = await openDB(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, 'readwrite'); const store = tx.objectStore(STORE_NAME); const req = store.clear(); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error); tx.oncomplete = () => db.close(); });
}
