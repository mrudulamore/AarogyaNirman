import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { SitePhoto } from '../../types';
import { uiText, useUiLanguage } from '../../i18n/ui';
import { photoSrc } from '../../lib/utils';

export function PhotoLocationMap({ photos }: { photos: SitePhoto[] }) {
  const language = useUiLanguage();
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
    photos.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)).forEach(photo=>{
      const popup=document.createElement('div');popup.style.maxWidth='220px';
      const image=document.createElement('img');image.src=photoSrc(photo);image.alt=photo.description;image.style.cssText='width:100%;height:140px;object-fit:contain';popup.append(image);
      for(const value of [photo.description,`${photo.lat.toFixed(6)}, ${photo.lng.toFixed(6)}`,photo.uploadedBy,uiText(photo.dataUrl ? photo.locationSource === 'CAPTURED' ? 'Device GPS' : 'Manually entered' : 'Illustrative sample')]) {const line=document.createElement('p');line.textContent=value;popup.append(line);}
      L.circleMarker([photo.lat,photo.lng],{radius:8,color:'#fff',weight:2,fillColor:photo.dataUrl?'#2563eb':'#64748b',fillOpacity:1}).bindPopup(popup).addTo(group);
    });
    if(group.getLayers().length) map.fitBounds(group.getBounds(),{padding:[30,30],maxZoom:15});
    return ()=>{group.remove();};
  },[photos,language]);
  return <div className="space-y-2"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{uiText('Photo locations')} · {photos.length}</p><button className="min-h-11 rounded-lg border px-3 text-xs" onClick={()=>mapRef.current?.setView([19.5,76],6)}>{uiText('All Maharashtra')}</button></div><div ref={container} className="relative z-0 h-80 rounded-xl border"/><p className="text-xs text-slate-500">{uiText('Blue markers: saved evidence. Grey markers: illustrative samples. Select a marker for coordinates and photo details.')}</p></div>;
}
