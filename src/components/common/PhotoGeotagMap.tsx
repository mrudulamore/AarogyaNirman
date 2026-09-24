import { useState } from 'react';
import { MapPin } from 'lucide-react';

/** Small, on-screen OSM map centered on the stored coordinates. No prefetch or offline download. */
export function PhotoGeotagMap({ lat, lng }: { lat: number; lng: number }) {
  const [failed, setFailed] = useState(false);
  const zoom = 15;
  const world = 2 ** zoom;
  const latitude = Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180;
  const x = (lng + 180) / 360 * world * 256;
  const y = (1 - Math.asinh(Math.tan(latitude)) / Math.PI) / 2 * world * 256;
  const left = x - 56;
  const top = y - 56;
  const tiles = [];
  for (let row = Math.floor(top / 256); row <= Math.floor((top + 112) / 256); row++) {
    for (let col = Math.floor(left / 256); col <= Math.floor((left + 112) / 256); col++) {
      tiles.push({ col, row });
    }
  }
  return <div aria-label={`Map: ${lat.toFixed(6)}, ${lng.toFixed(6)}`} className="relative h-28 w-28 shrink-0 overflow-hidden bg-slate-200 text-slate-800">
    {!failed && tiles.map(({ col, row }) => <img key={`${col}-${row}`} alt="" loading="lazy" onError={() => setFailed(true)} src={`https://tile.openstreetmap.org/${zoom}/${(col + world) % world}/${Math.max(0, Math.min(world - 1, row))}.png`} style={{ position: 'absolute', width: 256, height: 256, maxWidth: 'none', left: col * 256 - left, top: row * 256 - top }} />)}
    <MapPin aria-hidden="true" size={30} fill="#ef4444" stroke="white" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full drop-shadow" />
    {failed && <span className="absolute inset-x-0 bottom-5 text-center text-[9px]">Map unavailable</span>}
    <span className="absolute inset-x-0 bottom-0 bg-white/90 px-1 py-0.5 text-center text-[8px] leading-tight text-slate-900">© OpenStreetMap contributors</span>
  </div>;
}
