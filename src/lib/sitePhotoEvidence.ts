import type { SitePhoto } from '../types';

/** Library images are not site evidence, regardless of their demo coordinates. */
export function isRealSitePhoto(photo: Pick<SitePhoto, 'mediaKey' | 'dataUrl'>): boolean {
  return !!photo.mediaKey || !!photo.dataUrl && !photo.dataUrl.startsWith('/site-photos/');
}
