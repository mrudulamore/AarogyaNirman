import type { ProgressReport } from '../types';
export interface SiteDraft { id: string; ownerId: string; projectId: string; savedAt: string; report: Omit<ProgressReport, 'id'>; files: File[]; }
async function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('aarogya-site-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Draft storage is unavailable. Free device storage and retry.'));
  });
}
export async function saveSiteDraft(draft: SiteDraft) {
  const database = await db();
  try { await new Promise<void>((resolve, reject) => {
    const tx = database.transaction('drafts', 'readwrite'); tx.objectStore('drafts').put(draft);
    tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(new Error('Draft could not be saved. Free device storage and retry.'));
  }); } finally { database.close(); }
}
export async function siteDrafts(ownerId: string, projectId: string): Promise<SiteDraft[]> {
  const database = await db();
  try { return await new Promise((resolve, reject) => {
    const request = database.transaction('drafts').objectStore('drafts').getAll();
    request.onsuccess = () => resolve((request.result as SiteDraft[]).filter(d => d.ownerId === ownerId && d.projectId === projectId).sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
    request.onerror = () => reject(new Error('Could not load saved drafts.'));
  }); } finally { database.close(); }
}
export async function removeSiteDraft(id: string) {
  const database = await db();
  try { await new Promise<void>((resolve, reject) => {
    const tx = database.transaction('drafts', 'readwrite'); tx.objectStore('drafts').delete(id);
    tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(new Error('Could not remove the saved draft.'));
  }); } finally { database.close(); }
}
