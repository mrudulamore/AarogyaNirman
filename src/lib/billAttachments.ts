import type { BillAttachment } from '../types';
import { BILL_FILE_TYPES, MAX_BILL_FILE_BYTES } from './billSubmission';

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('aarogya-bill-evidence', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Cannot access evidence storage on this device.'));
  });
}

export async function saveBillFiles(files: { file: File; category: BillAttachment['category'] }[]): Promise<BillAttachment[]> {
  const entries: { metadata: BillAttachment; file: File }[] = [];
  for (const { file, category } of files) {
    if (!BILL_FILE_TYPES.includes(file.type) || !file.size || file.size > MAX_BILL_FILE_BYTES) throw new Error('Use PDF, JPEG or PNG files up to 5 MB each.');
    const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const valid = file.type === 'application/pdf' ? String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-'
      : file.type === 'image/jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
    if (!valid) throw new Error(`${file.name} does not contain a valid ${file.type} file.`);
    entries.push({ metadata: { id: crypto.randomUUID(), category, name: file.name, mimeType: file.type, size: file.size }, file });
  }
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      entries.forEach(({ metadata, file }) => tx.objectStore('files').put(file, metadata.id));
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(new Error('Evidence could not be saved. Check available device storage.'));
      tx.onerror = () => reject(new Error('Evidence could not be saved.'));
    });
    return entries.map((entry) => entry.metadata);
  } finally { db.close(); }
}

export async function readBillFile(id: string): Promise<Blob> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('files').objectStore('files').get(id);
      request.onsuccess = () => request.result instanceof Blob ? resolve(request.result) : reject(new Error('This attachment is unavailable on this device.'));
      request.onerror = () => reject(new Error('Could not read the attachment.'));
    });
  } finally { db.close(); }
}
