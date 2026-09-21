import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Undo2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Project } from '../../types';
import { useStore } from '../../store/useStore';
import { uiText, useUiLanguage } from '../../i18n/ui';
import { Button, Input } from '../ui/primitives';

export function SiteBoundaryEditor({ project }: { project: Project }) {
  const language = useUiLanguage();
  const currentUser = useStore(state => state.currentUser);
  const updateBoundary = useStore(state => state.updateSiteBoundary);
  const editable = ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'PROJECT_MANAGER'].includes(currentUser?.role ?? '');
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const drawingRef = useRef<L.LayerGroup | null>(null);
  const [points, setPoints] = useState(project.siteBoundary ?? []);
  const [radiusM, setRadiusM] = useState(project.geoFenceRadiusM ?? 400);

  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { center: [project.siteLat, project.siteLng], zoom: 17, scrollWheelZoom: false });
    mapRef.current = map;
    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
    const satellite = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles © Esri, Maxar, Earthstar Geographics, GIS User Community', maxZoom: 19 });
    L.control.layers({ [uiText('Street map')]: street, [uiText('Satellite')]: satellite }, {}, { collapsed: true }).addTo(map);
    L.circleMarker([project.siteLat, project.siteLng], { radius: 7, color: '#fff', weight: 2, fillColor: '#172554', fillOpacity: 1 }).bindTooltip(uiText('Registered site')).addTo(map);
    const click = (event: L.LeafletMouseEvent) => { if (editable) setPoints(current => [...current, { lat: event.latlng.lat, lng: event.latlng.lng }].slice(0, 50)); };
    map.on('click', click);
    const observer = new ResizeObserver(() => map.invalidateSize()); observer.observe(container.current);
    return () => { observer.disconnect(); map.off('click', click); map.remove(); mapRef.current = null; };
  }, [project.id, project.siteLat, project.siteLng, editable, language]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    drawingRef.current?.remove();
    const group = L.layerGroup().addTo(map); drawingRef.current = group;
    L.circle([project.siteLat, project.siteLng], { radius: radiusM, color: '#94a3b8', dashArray: '6 6', fillOpacity: .03, weight: 1 }).addTo(group);
    points.forEach((point, index) => L.circleMarker([point.lat, point.lng], { radius: 5, color: '#fff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 }).bindTooltip(String(index + 1)).addTo(group));
    if (points.length >= 2) L.polyline(points, { color: '#2563eb', weight: 3 }).addTo(group);
    if (points.length >= 3) L.polygon(points, { color: '#2563eb', fillColor: '#60a5fa', fillOpacity: .16, weight: 3 }).addTo(group);
    return () => { group.remove(); };
  }, [points, radiusM, project.siteLat, project.siteLng]);

  function save() {
    try { updateBoundary(project.id, points, radiusM); toast.success(uiText('Site boundary saved on this device.')); }
    catch (cause) { toast.error(uiText((cause as Error).message)); }
  }

  return <div className="space-y-3">
    <div><p className="text-sm font-semibold text-slate-800">{uiText('Registered site boundary')}</p><p className="text-xs text-slate-500">{uiText(editable ? 'Tap around the site in sequence. The polygon must contain the registered site marker.' : 'This boundary is read-only for your role.')}</p></div>
    <div ref={container} className="relative z-0 h-80 rounded-xl border border-slate-200" />
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-xs font-medium text-slate-700">{uiText('Fallback radius (metres)')}<Input disabled={!editable} type="number" min={25} max={2000} value={radiusM} onChange={event => setRadiusM(Number(event.target.value))} className="mt-1 w-44" /></label>
      {editable && <><Button variant="outline" disabled={!points.length} onClick={() => setPoints(current => current.slice(0, -1))}><Undo2 size={15}/>{uiText('Undo point')}</Button><Button variant="outline" disabled={!points.length} onClick={() => setPoints([])}><Trash2 size={15}/>{uiText('Clear boundary')}</Button><Button disabled={points.length > 0 && points.length < 3} onClick={save}><Save size={15}/>{uiText('Save boundary')}</Button></>}
    </div>
    <p className="text-xs text-slate-500">{points.length} {uiText('boundary points')} · {project.boundaryUpdatedAt ? `${uiText('Last saved')} ${new Date(project.boundaryUpdatedAt).toLocaleString()}` : uiText('Using fallback radius until a polygon is saved')}</p>
  </div>;
}
