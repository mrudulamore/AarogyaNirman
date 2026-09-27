import { useEffect, useState } from 'react';
import { DISTRICT_COORDS } from './geo';

/** Human-readable place for a GPS fix, as a "GPS Map Camera" style stamp shows it:
 *  a short title ("Wai, Satara, Maharashtra, India") and the full street address. */
export interface PlaceName { title: string; address: string; approximate?: boolean }

const CACHE_KEY = 'aarogya-place-names';
const cache = new Map<string, PlaceName>();
try {
  const saved = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, PlaceName>;
  for (const [key, value] of Object.entries(saved)) cache.set(key, value);
} catch { /* storage unavailable — lookups still work, just uncached across launches */ }

function persist() {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries([...cache].slice(-300)))); } catch { /* ignore */ }
}

// ~110 m buckets: photos from one site share a lookup.
const keyFor = (lat: number, lng: number) => `${lat.toFixed(3)},${lng.toFixed(3)}`;

/** Offline fallback: the nearest district headquarters we already know about. */
export function nearestDistrict(lat: number, lng: number): PlaceName {
  let best = { name: 'Maharashtra', d: Infinity };
  for (const [name, c] of Object.entries(DISTRICT_COORDS)) {
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (d < best.d) best = { name, d };
  }
  return { title: `Near ${best.name}, Maharashtra, India`, address: '', approximate: true };
}

// OpenStreetMap Nominatim allows about one request per second, so lookups are queued.
let queue: Promise<unknown> = Promise.resolve();
const inflight = new Map<string, Promise<PlaceName | null>>();

/** Reverse-geocodes a GPS fix via OpenStreetMap Nominatim. Resolves null when offline or
 *  the service does not answer in time; callers fall back to nearestDistrict(). */
export function reverseGeocode(lat: number, lng: number, timeoutMs = 6000): Promise<PlaceName | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return Promise.resolve(null);
  const key = keyFor(lat, lng);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(key);
  if (pending) return pending;

  const run = queue.then(async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&addressdetails=1&accept-language=en&lat=${lat}&lon=${lng}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json' } });
      if (!response.ok) return null;
      const data = await response.json() as { display_name?: string; address?: Record<string, string> };
      const a = data.address ?? {};
      const locality = a.city ?? a.town ?? a.village ?? a.suburb ?? a.hamlet ?? a.county;
      const district = a.state_district?.replace(/ District$/i, '');
      const title = [locality, district && district !== locality ? district : undefined, a.state, a.country].filter(Boolean).join(', ');
      if (!title) return null;
      const place: PlaceName = { title, address: data.display_name ?? '' };
      cache.set(key, place);
      persist();
      return place;
    } catch {
      return null;
    } finally {
      await new Promise((r) => setTimeout(r, 1100));
    }
  });
  queue = run.catch(() => null);
  inflight.set(key, run);
  run.finally(() => inflight.delete(key));
  return run;
}

/** Place for a GPS fix: cached/online name when available, nearest district otherwise. */
export function usePlaceName(lat: number, lng: number, enabled = true): PlaceName | null {
  const valid = enabled && Number.isFinite(lat) && Number.isFinite(lng);
  const [place, setPlace] = useState<PlaceName | null>(() => (valid ? cache.get(keyFor(lat, lng)) ?? null : null));
  useEffect(() => {
    if (!valid) { setPlace(null); return; }
    let alive = true;
    const cached = cache.get(keyFor(lat, lng));
    setPlace(cached ?? nearestDistrict(lat, lng));
    if (!cached) reverseGeocode(lat, lng).then((found) => { if (alive && found) setPlace(found); });
    return () => { alive = false; };
  }, [lat, lng, valid]);
  return place;
}
