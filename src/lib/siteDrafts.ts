import type { ProgressReport } from '../types';
import { listOutbox, putOutbox, removeOutbox } from './outbox';
export interface SiteDraft { id: string; ownerId: string; projectId: string; savedAt: string; report: Omit<ProgressReport, 'id'>; files: File[]; }
async function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('aarogya-site-drafts', 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('drafts')) request.result.createObjectStore('drafts', { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains('outbox')) request.result.createObjectStore('outbox', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Draft storage is unavailable. Free device storage and retry.'));
  });
}
export async function saveSiteDraft(draft: SiteDraft) {
  await putOutbox({ id: draft.id, ownerId: draft.ownerId, projectId: draft.projectId, kind: 'SITE_PROGRESS', createdAt: draft.savedAt, updatedAt: draft.savedAt, status: 'QUEUED', attempts: 0, payload: draft.report, files: draft.files });
}
export async function siteDrafts(ownerId: string, projectId: string): Promise<SiteDraft[]> {
  const queued = (await listOutbox<Omit<ProgressReport, 'id'>>(ownerId, projectId, 'SITE_PROGRESS')).map(item => ({ id: item.id, ownerId: item.ownerId, projectId: item.projectId, savedAt: item.updatedAt, report: item.payload, files: item.files }));
  const database = await db();
  try { return await new Promise((resolve, reject) => {
    const request = database.transaction('drafts').objectStore('drafts').getAll();
    request.onsuccess = () => { const legacy = (request.result as SiteDraft[]).filter(d => d.ownerId === ownerId && d.projectId === projectId && !queued.some(item => item.id === d.id)); resolve([...queued, ...legacy].sort((a, b) => b.savedAt.localeCompare(a.savedAt))); };
    request.onerror = () => reject(new Error('Could not load saved drafts.'));
  }); } finally { database.close(); }
}
export async function removeSiteDraft(id: string) {
  await removeOutbox(id);
  const database = await db();
  try { await new Promise<void>((resolve, reject) => {
    const tx = database.transaction('drafts', 'readwrite'); tx.objectStore('drafts').delete(id);
    tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(new Error('Could not remove the saved draft.'));
  }); } finally { database.close(); }
}
