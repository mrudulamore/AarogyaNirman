export type OutboxKind = 'SITE_PROGRESS' | 'FIELD_EVIDENCE' | 'DEFECT' | 'ATTENDANCE' | 'BILL';
export type OutboxStatus = 'QUEUED' | 'SYNCING' | 'FAILED';

export interface OutboxItem<T = unknown> {
  id: string;
  ownerId: string;
  projectId: string;
  kind: OutboxKind;
  createdAt: string;
  updatedAt: string;
  status: OutboxStatus;
  attempts: number;
  lastError?: string;
  payload: T;
  files: File[];
}

const DATABASE = 'aarogya-site-drafts';
const STORE = 'outbox';

async function openOutbox(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('drafts')) request.result.createObjectStore('drafts', { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Offline storage is unavailable. Free device storage and retry.'));
  });
}

export async function putOutbox<T>(item: OutboxItem<T>) {
  const database = await openOutbox();
  try { await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(new Error('Work could not be saved offline. Free device storage and retry.'));
  }); } finally { database.close(); }
}

export async function listOutbox<T = unknown>(ownerId: string, projectId?: string, kind?: OutboxKind): Promise<OutboxItem<T>[]> {
  const database = await openOutbox();
  try { return await new Promise((resolve, reject) => {
    const request = database.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result as OutboxItem<T>[]).filter(item => item.ownerId === ownerId && (!projectId || item.projectId === projectId) && (!kind || item.kind === kind)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    request.onerror = () => reject(new Error('Saved offline work could not be loaded.'));
  }); } finally { database.close(); }
}

export async function removeOutbox(id: string) {
  const database = await openOutbox();
  try { await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(new Error('Saved offline work could not be removed.'));
  }); } finally { database.close(); }
}

/** Upload remains injectable until the shared API exists; retries are safe because IDs are stable. */
export async function flushOutbox(ownerId: string, upload: (item: OutboxItem) => Promise<void>) {
  const items = await listOutbox(ownerId);
  for (const item of items) {
    try {
      await putOutbox({ ...item, status: 'SYNCING', updatedAt: new Date().toISOString() });
      await upload(item);
      await removeOutbox(item.id);
    } catch (error) {
      await putOutbox({ ...item, status: 'FAILED', attempts: item.attempts + 1, lastError: error instanceof Error ? error.message : 'Sync failed', updatedAt: new Date().toISOString() });
    }
  }
}
