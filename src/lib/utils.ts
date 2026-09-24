import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import i18n from '../i18n';
import { constructionImageFallback, constructionImageForPhoto } from './constructionImages';

export const currentLocale = () => `${i18n.resolvedLanguage || 'en'}-IN`;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, language = i18n.resolvedLanguage || 'en'): string {
  const english = language === 'en';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} ${english ? 'Cr' : language === 'mr' ? 'कोटी' : 'करोड़'}`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} ${english ? 'L' : 'लाख'}`;
  return `₹${amount.toLocaleString(currentLocale())}`;
}

export function formatCurrencyFull(amount: number): string {
  return `₹${amount.toLocaleString(currentLocale())}`;
}

export function formatDate(dateStr?: string, locale = currentLocale()): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString(currentLocale(), { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function daysBetween(a: string, b: string): number {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

export function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substring(1).toLowerCase());
}

// Phase-matched construction illustrations; provenance in public/site-photos/CREDITS.md.
// These are samples, never proof of progress at a project.
export function seededImageUrl(seed: number, _w = 640, _h = 420, label?: string): string {
  return constructionImageFallback(seed, label);
}

/** Existing reference records use the library; captured media keeps its own source. */
export function photoSrc(p: { id?: string; dataUrl?: string; mediaKey?: string; seed: number; stage: string }): string {
  return p.dataUrl || (p.mediaKey ? '' : constructionImageForPhoto(p)?.path || seededImageUrl(p.seed, 640, 420, p.stage));
}

let idCounter = 1000;
export function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}
