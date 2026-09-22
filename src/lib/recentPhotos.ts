import type { SitePhoto } from '../types';
import { photoSrc } from './utils';

/** Keep captured evidence, but avoid repeating an illustration in a recent-photo preview. */
export function selectRecentPhotos(photos: SitePhoto[], limit: number): SitePhoto[] {
  const ordered = [...photos].sort((a, b) =>
    (b.capturedAt || b.uploadedAt || b.date).localeCompare(a.capturedAt || a.uploadedAt || a.date));
  const seen = new Set<string>();
  return ordered.filter(photo => {
    if (photo.dataUrl || photo.mediaKey) return true;
    const source = photoSrc(photo);
    if (seen.has(source)) return false;
    seen.add(source);
    return true;
  }).slice(0, limit);
}
