import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatCurrencyFull(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function daysBetween(a: string, b: string): number {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

export function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substring(1).toLowerCase());
}

// Deterministic offline placeholder "site photo" as an inline SVG data URI.
// Avoids any dependency on external image hosts so the prototype works fully offline.
const PALETTES: [string, string][] = [
  ['#1e3a5f', '#3b6ea5'], ['#2d4a2d', '#5c8a5c'], ['#5f4a1e', '#a58a3b'],
  ['#3a1e5f', '#6e3ba5'], ['#5f1e2d', '#a53b52'], ['#1e5f56', '#3ba598'],
  ['#4a4a1e', '#8a8a3b'], ['#2d2d3a', '#5c5c8a'],
];

export function seededImageUrl(seed: number, w = 640, h = 420, label?: string): string {
  const [c1, c2] = PALETTES[Math.abs(seed) % PALETTES.length];
  const rand = (n: number) => {
    const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  let shapes = '';
  for (let i = 0; i < 6; i++) {
    const bw = 30 + rand(i) * 90;
    const bh = 60 + rand(i + 10) * (h * 0.55);
    const bx = rand(i + 20) * (w - bw);
    const by = h - bh - 30;
    shapes += `<rect x="${bx.toFixed(0)}" y="${by.toFixed(0)}" width="${bw.toFixed(0)}" height="${bh.toFixed(0)}" fill="rgba(255,255,255,${(0.08 + rand(i + 30) * 0.1).toFixed(2)})" />`;
  }
  const craneX = (w * (0.15 + rand(40) * 0.7)).toFixed(0);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    ${shapes}
    <rect x="${craneX}" y="20" width="4" height="${(h - 60).toFixed(0)}" fill="rgba(255,255,255,0.35)"/>
    <rect x="${craneX}" y="20" width="${(w * 0.28).toFixed(0)}" height="4" fill="rgba(255,255,255,0.35)"/>
    <rect x="0" y="${h - 30}" width="${w}" height="30" fill="rgba(0,0,0,0.25)"/>
    ${label ? `<text x="12" y="${h - 10}" font-family="Arial,sans-serif" font-size="13" fill="rgba(255,255,255,0.85)">${label}</text>` : ''}
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

let idCounter = 1000;
export function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}
