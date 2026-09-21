const DB_NAME = 'aarogya-site-evidence';
const STORE_NAME = 'images';

type EvidenceVariant = 'original' | 'stamped';

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Cannot access photo storage on this device.'));
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(',');
  if (!header || !body) throw new Error('The captured photo is invalid. Please retake it.');
  const mimeType = header.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';
  const bytes = Uint8Array.from(atob(body), character => character.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

async function imageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The captured photo could not be processed.'));
    image.src = dataUrl;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, quality = .88): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error('The captured photo could not be saved.')),
    'image/jpeg', quality,
  ));
}

export async function saveEvidenceMedia(dataUrl: string, metadata: {
  projectName: string;
  lat: number;
  lng: number;
  accuracyM: number;
  capturedAt: string;
  status: string;
}): Promise<{ mediaKey: string; thumbnailDataUrl: string }> {
  const estimate = await navigator.storage?.estimate?.();
  if (estimate?.quota !== undefined && estimate.usage !== undefined && estimate.quota - estimate.usage < 20 * 1024 * 1024) {
    throw new Error('Device storage is nearly full. Free at least 20 MB before capturing evidence.');
  }
  await navigator.storage?.persist?.().catch(() => false);
  const image = await imageFromDataUrl(dataUrl);
  const original = dataUrlToBlob(dataUrl);
  if (!original.size || original.size > 15 * 1024 * 1024) throw new Error('The photo is too large to store. Retake it at a lower camera resolution.');
  const key = crypto.randomUUID();

  const stampedCanvas = document.createElement('canvas');
  stampedCanvas.width = image.naturalWidth;
  stampedCanvas.height = image.naturalHeight;
  const context = stampedCanvas.getContext('2d');
  if (!context) throw new Error('The captured photo could not be processed.');
  context.drawImage(image, 0, 0);
  const bandHeight = Math.max(120, Math.round(stampedCanvas.height * .16));
  context.fillStyle = 'rgba(4, 20, 45, .82)';
  context.fillRect(0, stampedCanvas.height - bandHeight, stampedCanvas.width, bandHeight);
  const fontSize = Math.max(18, Math.round(stampedCanvas.width / 46));
  context.fillStyle = '#fff';
  context.font = `600 ${fontSize}px sans-serif`;
  const lines = [
    metadata.projectName,
    `${metadata.lat.toFixed(6)}, ${metadata.lng.toFixed(6)} · ±${metadata.accuracyM}m · ${metadata.status}`,
    new Date(metadata.capturedAt).toLocaleString('en-IN'),
  ];
  lines.forEach((line, index) => context.fillText(line, fontSize, stampedCanvas.height - bandHeight + fontSize * (index + 1.35), stampedCanvas.width - fontSize * 2));
  const stamped = await canvasBlob(stampedCanvas);

  const thumbCanvas = document.createElement('canvas');
  const scale = Math.min(1, 720 / Math.max(image.naturalWidth, image.naturalHeight));
  thumbCanvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  thumbCanvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  thumbCanvas.getContext('2d')?.drawImage(image, 0, 0, thumbCanvas.width, thumbCanvas.height);
  const thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', .7);

  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(original, `${key}:original`);
      transaction.objectStore(STORE_NAME).put(stamped, `${key}:stamped`);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('The photo could not be saved. Check available device storage.'));
      transaction.onabort = () => reject(new Error('The photo could not be saved. Check available device storage.'));
    });
  } finally { db.close(); }
  return { mediaKey: key, thumbnailDataUrl };
}

export async function readEvidenceMedia(mediaKey: string, variant: EvidenceVariant = 'original'): Promise<Blob> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(`${mediaKey}:${variant}`);
      request.onsuccess = () => request.result instanceof Blob ? resolve(request.result) : reject(new Error('The full-resolution photo is unavailable on this device.'));
      request.onerror = () => reject(new Error('The full-resolution photo could not be opened.'));
    });
  } finally { db.close(); }
}

export async function deleteEvidenceMedia(mediaKey: string): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(`${mediaKey}:original`);
      transaction.objectStore(STORE_NAME).delete(`${mediaKey}:stamped`);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('The local photo could not be removed.'));
    });
  } finally { db.close(); }
}
