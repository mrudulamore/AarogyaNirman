import images from '../mock/constructionImages.json';

export const constructionImages = images;
const byPhoto = new Map(images.map(image => [image.photoId, image]));
const byPath = new Map(images.map(image => [image.path, image]));

export function constructionImageForPhoto(photo: { id?: string; dataUrl?: string; mediaKey?: string }) {
  if (photo.dataUrl || photo.mediaKey || !photo.id) return undefined;
  return byPhoto.get(photo.id);
}

export function constructionImageForSource(src: string) {
  return byPath.get(src);
}

export function constructionImageFallback(seed: number, stage?: string) {
  const matching = images.filter(image => image.stage.toLowerCase() === stage?.toLowerCase());
  const pool = matching.length ? matching : images;
  return pool.length ? pool[Math.abs(Math.trunc(seed)) % pool.length].path : '/site-photos/hospital-construction.jpg';
}
