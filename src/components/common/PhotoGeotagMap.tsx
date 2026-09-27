import { useState } from 'react';
import { MapPin } from 'lucide-react';

/** Satellite preview centered on the stored coordinates, using the app's imagery provider. */
export function PhotoGeotagMap({ lat, lng }: { lat: number; lng: number }) {
  const [failed, setFailed] = useState(false);
  const zoom = 18;
  const world = 2 ** zoom;
  const latitude = Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180;
  const x = (lng + 180) / 360 * world * 256;
  const y = (1 - Math.asinh(Math.tan(latitude)) / Math.PI) / 2 * world * 256;
  const size = 80;
  const left = x - size / 2;
  const top = y - size / 2;
  const tiles = [];
  for (let row = Math.floor(top / 256); row <= Math.floor((top + size) / 256); row++) {
    for (let col = Math.floor(left / 256); col <= Math.floor((left + size) / 256); col++) {
      tiles.push({ col, row });
    }
  }
  return <div aria-label={`Satellite map: ${lat.toFixed(6)}, ${lng.toFixed(6)}`} className="relative h-20 w-20 shrink-0 overflow-hidden bg-slate-800 text-white">
    {!failed && tiles.map(({ col, row }) => <img key={`${col}-${row}`} alt="" loading="lazy" onError={() => setFailed(true)} src={`https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${Math.max(0, Math.min(world - 1, row))}/${(col + world) % world}`} style={{ position: 'absolute', width: 256, height: 256, maxWidth: 'none', left: col * 256 - left, top: row * 256 - top }} />)}
    <MapPin aria-hidden="true" size={24} fill="#ef4444" stroke="#fecaca" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full drop-shadow" />
    {failed && <span className="absolute inset-x-0 bottom-5 text-center text-[9px]">Map unavailable</span>}
    <span title="Sources: Esri, Maxar, Earthstar Geographics, GIS User Community" className="absolute inset-x-0 bottom-0 bg-slate-950/70 px-0.5 py-0.5 text-center text-[7px] leading-tight text-white">© Esri, Maxar, Earthstar Geographics, GIS community</span>
  </div>;
}
