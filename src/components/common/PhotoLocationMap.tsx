import { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { GeoPhoto } from './GeoPhoto';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SitePhoto } from '../../types';
import { uiText, useUiLanguage } from '../../i18n/ui';
import { photoSrc } from '../../lib/utils';
import { isRealSitePhoto } from '../../lib/sitePhotoEvidence';
import { GEOFENCE_RADIUS_M } from '../../lib/geo';

export function PhotoLocationMap({ photos: allPhotos, projectSite, onSelectPhoto }: {
  photos: SitePhoto[];
  projectSite?: { lat: number; lng: number; radiusM?: number; boundary?: { lat: number; lng: number }[] };
  onSelectPhoto?: (photoId: string) => void;
}) {
  const language = useUiLanguage();
  const photos = allPhotos;
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { center: [19.5,76], zoom: 6, scrollWheelZoom: false }); mapRef.current = map;
    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
    const satellite = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles © Esri, Maxar, Earthstar Geographics, GIS User Community', maxZoom: 19 });
    L.control.layers({[uiText('Street map')]:street,[uiText('Satellite')]:satellite},{},{collapsed:false}).addTo(map);
    const observer = new ResizeObserver(()=>map.invalidateSize());observer.observe(container.current);
    return ()=>{ observer.disconnect();map.remove();mapRef.current=null; };
  }, [language]);
  useEffect(()=>{
    const map=mapRef.current;if(!map)return;
    const group=L.featureGroup().addTo(map);
    const popupRoots: Root[] = [];
    if (projectSite) {
      if (projectSite.boundary && projectSite.boundary.length >= 3) L.polygon(projectSite.boundary, { color: '#2563eb', fillColor: '#60a5fa', fillOpacity: .1, weight: 2 }).bindTooltip(uiText('Registered site boundary')).addTo(group);
      else L.circle([projectSite.lat, projectSite.lng], { radius: projectSite.radiusM ?? GEOFENCE_RADIUS_M, color: '#2563eb', fillColor: '#60a5fa', fillOpacity: .08, weight: 2, dashArray: '7 6' }).bindTooltip(uiText('Registered site boundary')).addTo(group);
      L.circleMarker([projectSite.lat, projectSite.lng], { radius: 6, color: '#fff', fillColor: '#172554', fillOpacity: 1, weight: 2 }).bindTooltip(uiText('Registered site')).addTo(group);
    }
    photos.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)).forEach((photo, index)=>{
      const reference = !isRealSitePhoto(photo);
      const popup=document.createElement('div');popup.style.maxWidth='220px';
      const imageHost = document.createElement('div'); popup.append(imageHost);
      const root = createRoot(imageHost); popupRoots.push(root);
      root.render(<GeoPhoto src={photoSrc(photo)} mediaKey={photo.mediaKey} lat={photo.lat} lng={photo.lng} timestamp={photo.capturedAt} location={photo.location} className="h-48 w-52" />);
      for(const value of [photo.description,`${photo.lat.toFixed(6)}, ${photo.lng.toFixed(6)}`,photo.uploadedBy,uiText(reference ? '' : photo.locationSource === 'CAPTURED' ? 'Device GPS' : 'Manually entered')]) {const line=document.createElement('p');line.textContent=value;if(value) popup.append(line);}
      if (onSelectPhoto) { const button=document.createElement('button');button.type='button';button.textContent=uiText('Open this photo');button.style.cssText='min-height:36px;color:#1d4ed8;font-weight:600';button.onclick=()=>{ map.closePopup(); onSelectPhoto(photo.id); };popup.append(button); }
      if (!reference && photo.gpsAccuracyM) L.circle([photo.lat,photo.lng], { radius: photo.gpsAccuracyM, color: '#f59e0b', fillOpacity: .08, weight: 1 }).addTo(group);
      const icon=L.divIcon({className:'',html:`<span style="display:grid;place-items:center;width:28px;height:28px;border:2px solid #fff;border-radius:999px;background:${!reference && photo.locationSource === 'CAPTURED'?'#2563eb':'#64748b'};color:#fff;font-size:11px;font-weight:700;box-shadow:0 2px 6px #0f172a55">${index+1}</span>`,iconSize:[28,28],iconAnchor:[14,14]});
      L.marker([photo.lat,photo.lng],{icon}).bindPopup(popup).addTo(group);
    });
    if(group.getLayers().length) map.fitBounds(group.getBounds(),{padding:[30,30],maxZoom:15});
    return ()=>{group.remove(); popupRoots.forEach(root => root.unmount());};
  },[photos,language,onSelectPhoto,projectSite]);
  return <div className="space-y-2"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{uiText('Photo locations')} · {photos.length}</p><button className="min-h-11 rounded-lg border px-3 text-xs" onClick={()=>mapRef.current?.setView([19.5,76],6)}>{uiText('All Maharashtra')}</button></div><div className="relative isolate z-0 overflow-hidden rounded-xl border"><div ref={container} className="relative z-0 h-80 w-full"/></div><p className="text-xs text-slate-500">{uiText('Blue markers: saved evidence. Grey markers: illustrative samples. Select a marker for coordinates and photo details.')}</p><details className="rounded-xl bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-semibold text-slate-700">{uiText('Evidence locations as text')} ({photos.length})</summary><ol className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">{photos.map((photo,index)=><li key={photo.id} className="rounded-lg border border-slate-200 bg-white p-2"><button type="button" disabled={!onSelectPhoto} onClick={()=>onSelectPhoto?.(photo.id)} className="text-left text-blue-800 disabled:text-slate-700"><strong>{index+1}. {uiText(photo.stage)}</strong> · {photo.lat.toFixed(6)}, {photo.lng.toFixed(6)} · {uiText(!isRealSitePhoto(photo) ? '' : photo.geoFenceStatus ?? 'Location unverified')} {photo.gpsAccuracyM ? `· ±${photo.gpsAccuracyM} m` : ''}</button></li>)}</ol></details></div>;
}
