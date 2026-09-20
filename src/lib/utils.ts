import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import i18n from '../i18n';

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

// Real, locally-hosted construction-site photographs (verified + downloaded from Unsplash;
// see public/site-photos) rather than abstract generated art — deterministically picked by
// seed/category so the same photo record always shows the same photo across the app.
const SITE_PHOTOS = ['/site-photos/rebar.jpg', '/site-photos/hospital-construction.jpg', '/site-photos/civil-works.jpg', '/site-photos/structure.jpg', '/site-photos/scaffolding.jpg'];
// Categories/stages that read as foundation/reinforcement work bias toward the rebar close-up;
// everything else cycles across the full set by seed for visual variety.
const FOUNDATION_STAGE_HINTS = ['foundation', 'structural', 'rcc', 'column', 'reinforcement'];

export function seededImageUrl(seed: number, _w = 640, _h = 420, label?: string): string {
  const hint = (label ?? '').toLowerCase();
  if (FOUNDATION_STAGE_HINTS.some((h) => hint.includes(h))) return [SITE_PHOTOS[0], SITE_PHOTOS[2], SITE_PHOTOS[3]][Math.abs(seed) % 3];
  return SITE_PHOTOS[(Math.abs(seed) % (SITE_PHOTOS.length - 1)) + 1];
}

/** A real device-captured photo (dataUrl) always wins; seed data without one falls back to the
 * deterministic stock-photo picker so old records keep rendering something sensible. */
export function photoSrc(p: { dataUrl?: string; seed: number; stage: string }): string {
  return p.dataUrl || seededImageUrl(p.seed, 640, 420, p.stage);
}

let idCounter = 1000;
export function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}
