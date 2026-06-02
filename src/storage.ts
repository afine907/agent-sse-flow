/**
 * IndexedDB Event Persistence
 *
 * Provides save/load/clear operations for FlowEvent arrays using the
 * native IndexedDB API (no external library). The database stores events
 * in an object store keyed by event id, enabling efficient upserts and
 * full-table scans for session restore.
 *
 * SSR-safe: all functions gracefully no-op when IndexedDB is unavailable.
 */

import type { FlowEvent } from './types';

const DB_NAME = 'agent-sse-flow-db';
const DB_VERSION = 1;
const STORE_NAME = 'events';

/** Open (or create) the IndexedDB database */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Persist an array of FlowEvents to IndexedDB.
 * Uses a single readwrite transaction for the entire batch.
 */
export async function saveEvents(events: FlowEvent[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const event of events) {
      store.put(event);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Silently fail — persistence is a best-effort enhancement
  }
}

/**
 * Load all persisted FlowEvents from IndexedDB.
 * Returns an empty array if the database is unavailable or empty.
 */
export async function loadEvents(): Promise<FlowEvent[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    const events = await new Promise<FlowEvent[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as FlowEvent[]);
      request.onerror = () => reject(request.error);
    });
    db.close();
    // Sort by id to preserve original order
    return events.sort((a, b) => a.id - b.id);
  } catch {
    return [];
  }
}

/**
 * Clear all persisted events from IndexedDB.
 */
export async function clearStoredEvents(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Silently fail
  }
}
