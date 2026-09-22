import { uiText, useUiLanguage } from '../../i18n/ui';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft } from 'lucide-react';
import type { Project } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { DISTRICT_COORDS } from '../../lib/geo';

const STATUS_HEX: Record<string, string> = { ON_TRACK: '#3b82f6', AT_RISK: '#f59e0b', DELAYED: '#ef4444', COMPLETED: '#10b981' };

const MAHARASHTRA_CENTER: [number, number] = [19.5, 76.0];
const STATEWIDE_ZOOM = 6;
const DIVISION_ZOOM = 9;

/** Division HQ anchor point for the zoom-in "zone view" — a real town coordinate per division,
 * not a division polygon (no boundary GeoJSON on hand), so clicking a zone flies/zooms the real
 * map there rather than drawing an administrative outline. */
const DIVISION_ANCHORS: Record<string, { lat: number; lng: number }> = {
  'Pune Division': DISTRICT_COORDS.Pune,
  'Nashik Division': DISTRICT_COORDS.Nashik,
  'Nagpur Division': DISTRICT_COORDS.Nagpur,
  'Chhatrapati Sambhajinagar Division': DISTRICT_COORDS['Chhatrapati Sambhajinagar'],
  'Amravati Division': DISTRICT_COORDS.Amravati,
  'Konkan Division': DISTRICT_COORDS.Thane,
};

/** Real Maharashtra map via Leaflet + standard OpenStreetMap raster tiles — a normal, fully
 * coloured street map (no API key required, unlike the CARTO basemaps). Statewide view shows one
 * clickable marker per administrative zone/division; clicking a zone flies the map in to that
 * zone at a closer zoom, matching how a real drill-down map behaves. Delayed/at-risk projects
 * get a soft pulse ring so they read as attention items at a glance rather than requiring a hover. */
export function ProjectMap({ projects, focusDivision, onDivisionSelect }: {
  projects: Project[]; focusDivision?: string | null; onDivisionSelect?: (division: string | null) => void;
}) {
  const language = useUiLanguage();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const zoneMarkersRef = useRef<L.Marker[]>([]);
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const onDivisionSelectRef = useRef(onDivisionSelect);
  onDivisionSelectRef.current = onDivisionSelect;
  const boundsRef = useRef<Record<string, L.LatLngBounds>>({});
  const [boundaries, setBoundaries] = useState<GeoJSON.FeatureCollection | null>(null);
  const [boundaryError, setBoundaryError] = useState(false);
  const [zoomedIn, setZoomedIn] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: MAHARASHTRA_CENTER,
      zoom: STATEWIDE_ZOOM,
      scrollWheelZoom: false,
      zoomControl: true,
    });
    const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      subdomains: 'abc',
    }).addTo(map);
    const satellite = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community', maxZoom: 19,
    });
    L.control.layers({ [uiText('Street map')]: streets, [uiText('Satellite')]: satellite }, {}, { collapsed: false, position: 'topright' }).addTo(map);
    const resize = new ResizeObserver(() => map.invalidateSize()); resize.observe(containerRef.current);
    map.zoomControl.setPosition('bottomright');
    map.on('zoomend', () => setZoomedIn(map.getZoom() > STATEWIDE_ZOOM + 1));
    mapRef.current = map;
    return () => { resize.disconnect(); map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/maps/maharashtra-districts.geojson', { signal: controller.signal }).then(r => { if (!r.ok) throw new Error('Boundaries unavailable'); return r.json(); }).then(setBoundaries).catch(e => { if (e.name !== 'AbortError') setBoundaryError(true); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !boundaries) return;
    const divisions = Object.keys(DIVISION_ANCHORS);
    const colors = ['#2563eb','#7c3aed','#0891b2','#ea580c','#059669','#db2777'];
    boundsRef.current = {};
    const layer = L.geoJSON(boundaries, {
      style: feature => ({ color: colors[divisions.indexOf(feature?.properties.division)] ?? '#64748b', weight: 2, fillOpacity: focusDivision === feature?.properties.division ? .18 : .04 }),
      onEachFeature: (feature, polygon) => {
        const division = feature.properties.division;
        const bounds = (polygon as L.Polygon).getBounds();
        if (boundsRef.current[division]) boundsRef.current[division].extend(bounds); else boundsRef.current[division] = bounds;
        const count = projects.filter(p => p.division === division).length;
        polygon.bindTooltip(`${escapeHtml(uiText(division))} · ${count} ${escapeHtml(uiText('Projects'))}`);
        polygon.on('click', () => onDivisionSelectRef.current?.(division));
      },
    }).addTo(map);
    layer.bringToBack();
    return () => { layer.remove(); };
  }, [boundaries, projects, focusDivision, language]);

  // Project markers (real registered site coordinates).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = projects.map((p) => {
      const color = STATUS_HEX[p.status] ?? '#64748b';
      const pulse = p.status === 'DELAYED' || p.status === 'AT_RISK';
      const makeIcon = () => {
        const selected = marker?.isPopupOpen() ?? false;
        const size = selected ? 44 : Math.min(38, 22 + Math.max(0, map.getZoom() - STATEWIDE_ZOOM) * 4);
        return L.divIcon({
        className: '',
        html: `
          <div style="position: relative; width: ${size}px; height: ${size}px;">
            ${pulse ? `<span style="position:absolute; inset:0; border-radius:9999px; background:${color}; opacity:0.35; animation: proj-pulse 1.8s ease-out 3;"></span>` : ''}
            <span style="position:absolute; inset:5px; border-radius:9999px; background:${color}; border:2px solid #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.35);"></span>
          </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
      });
      };
      const marker = L.marker([p.siteLat, p.siteLng], { title: p.name }).addTo(map);
      const updateIcon = () => {
        marker.setIcon(makeIcon());
        marker.setZIndexOffset(marker.isPopupOpen() ? 2000 : 0);
      };
      updateIcon();
      map.on('zoomend', updateIcon);
      marker.on('remove', () => map.off('zoomend', updateIcon));
      marker.on('popupclose', updateIcon);
      marker.on('click', () => map.setView([p.siteLat, p.siteLng], map.getMaxZoom(), { animate: false }));
      const popupId = `view-project-${p.id}`;
      const statusLabel = uiText(p.status);
      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 210px;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <span style="width:8px; height:8px; border-radius:9999px; background:${color}; display:inline-block;"></span>
            <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; color:${color};">${escapeHtml(statusLabel)}</span>
          </div>
          <p style="font-size: 12.5px; font-weight: 600; color: #1e293b; margin: 0 0 4px;">${escapeHtml(p.name)}</p>
          <p style="font-size: 11px; color: #64748b; margin: 0 0 8px;">${escapeHtml(p.taluka)}, ${escapeHtml(p.district)}</p>
          <div style="background:#f8fafc; border-radius:6px; padding:6px 8px; margin-bottom:8px;">
            <p style="font-size: 11px; color: #475569; margin: 0 0 2px; display:flex; justify-content:space-between;"><span>${escapeHtml(uiText('Physical Progress'))}</span><strong>${p.physicalProgress}%</strong></p>
            <p style="font-size: 11px; color: #475569; margin: 0; display:flex; justify-content:space-between;"><span>${escapeHtml(uiText('Sanctioned Budget'))}</span><strong>${escapeHtml(formatCurrency(p.sanctionedBudget))}</strong></p>
          </div>
          <button id="${popupId}" style="font-size: 11px; font-weight: 600; color: #1d4ed8; background: none; border: none; cursor: pointer; padding: 0;">${escapeHtml(uiText('View project'))} &rarr;</button>
        </div>
      `);
      marker.on('popupopen', () => {
        updateIcon();
        document.getElementById(popupId)?.addEventListener('click', () => navigateRef.current(`/projects/${p.id}`));
      });
      return marker;
    });
  }, [projects, language]);

  // Zone/division markers — statewide "zone-wise quick view"; clicking one zooms into that zone.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    zoneMarkersRef.current.forEach((m) => m.remove());
    zoneMarkersRef.current = Object.entries(DIVISION_ANCHORS).map(([division, coord]) => {
      const count = projects.filter((p) => p.division === division).length;
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="display:flex; align-items:center; gap:5px; padding:3px 9px 3px 3px; border-radius:9999px; background:#1f3760; border:2px solid #ffffff; box-shadow:0 2px 6px rgba(15,23,42,0.35); white-space:nowrap; cursor:pointer;">
            <span style="display:flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:9999px; background:#3d5f95; color:#fff; font-size:9px; font-weight:700;">${count}</span>
            <span style="font-size:11px; font-weight:600; color:#fff;">${escapeHtml(division.replace(' Division', ''))}</span>
          </div>`,
        iconSize: [0, 0],
        iconAnchor: [-6, 12],
      });
      const marker = L.marker([coord.lat, coord.lng], { icon, zIndexOffset: 1000 }).addTo(map);
      marker.on('click', () => {
        if (boundsRef.current[division]) map.fitBounds(boundsRef.current[division], { padding: [20, 20] }); else map.setView([coord.lat, coord.lng], DIVISION_ZOOM);
        onDivisionSelectRef.current?.(division);
      });
      return marker;
    });
  }, [projects]);

  // External focus request (e.g. a "Zone Overview" tile clicked elsewhere on the page).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (focusDivision && DIVISION_ANCHORS[focusDivision]) {
      const coord = DIVISION_ANCHORS[focusDivision];
      if (boundsRef.current[focusDivision]) map.fitBounds(boundsRef.current[focusDivision], { padding: [20, 20] }); else map.setView([coord.lat, coord.lng], DIVISION_ZOOM);
    } else if (focusDivision === null) {
      map.flyTo(MAHARASHTRA_CENTER, STATEWIDE_ZOOM, { duration: 0.8 });
    }
  }, [focusDivision, boundaries]);

  function resetToStatewide() {
    mapRef.current?.flyTo(MAHARASHTRA_CENTER, STATEWIDE_ZOOM, { duration: 0.8 });
    onDivisionSelectRef.current?.(null);
  }

  return (
    <div>
      <style>{`@media(prefers-reduced-motion:reduce){.leaflet-marker-icon span{animation:none!important}} @keyframes proj-pulse { 0% { transform: scale(0.6); opacity: 0.5; } 100% { transform: scale(1.9); opacity: 0; } }`}</style>
      <div className="relative h-[380px] w-full overflow-hidden rounded-lg border border-slate-200 shadow-sm">
        <div ref={containerRef} className="h-full w-full" />
        {zoomedIn && (
          <button
            onClick={resetToStatewide}
            className="absolute left-3 top-3 z-[1000] flex items-center gap-1.5 rounded-md border border-slate-200 bg-white/95 px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-md backdrop-blur-sm hover:bg-white"
          >
            <ArrowLeft size={13} />{uiText(" All Maharashtra")}</button>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">{uiText(boundaryError ? 'Boundary outlines could not load. Project markers remain available.' : 'Reference boundaries: DataMeet, Census 2011 · CC BY 2.5 IN. Historical district outlines; not legal boundaries.')}</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500">
        {Object.entries({ ON_TRACK: 'On Track', AT_RISK: 'At Risk', DELAYED: 'Delayed', COMPLETED: 'Completed' }).map(([k, label]) => (
          <span key={k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: STATUS_HEX[k] }} />{uiText(label)}</span>
        ))}
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
