import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Project } from '../../types';
import { formatCurrency } from '../../lib/utils';

const STATUS_HEX: Record<string, string> = { ON_TRACK: '#3b82f6', AT_RISK: '#f59e0b', DELAYED: '#ef4444', COMPLETED: '#10b981' };

/** Real Maharashtra map via Leaflet + OpenStreetMap (CARTO Positron basemap for a cleaner,
 * lower-visual-noise look against the coloured status markers) — open source, no API key
 * required. Delayed/at-risk projects get a soft pulse ring so they read as attention items at a
 * glance rather than requiring a hover. */
export function ProjectMap({ projects }: { projects: Project[] }) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [19.5, 76.0],
      zoom: 6,
      scrollWheelZoom: false,
      zoomControl: true,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);
    map.zoomControl.setPosition('bottomright');
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = projects.map((p) => {
      const color = STATUS_HEX[p.status] ?? '#64748b';
      const pulse = p.status === 'DELAYED' || p.status === 'AT_RISK';
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position: relative; width: 22px; height: 22px;">
            ${pulse ? `<span style="position:absolute; inset:0; border-radius:9999px; background:${color}; opacity:0.35; animation: proj-pulse 1.8s ease-out infinite;"></span>` : ''}
            <span style="position:absolute; inset:5px; border-radius:9999px; background:${color}; border:2px solid #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.35);"></span>
          </div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const marker = L.marker([p.siteLat, p.siteLng], { icon }).addTo(map);
      const popupId = `view-project-${p.id}`;
      const statusLabel = p.status.replace('_', ' ');
      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 210px;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <span style="width:8px; height:8px; border-radius:9999px; background:${color}; display:inline-block;"></span>
            <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; color:${color};">${escapeHtml(statusLabel)}</span>
          </div>
          <p style="font-size: 12.5px; font-weight: 600; color: #1e293b; margin: 0 0 4px;">${escapeHtml(p.name)}</p>
          <p style="font-size: 11px; color: #64748b; margin: 0 0 8px;">${escapeHtml(p.taluka)}, ${escapeHtml(p.district)}</p>
          <div style="background:#f8fafc; border-radius:6px; padding:6px 8px; margin-bottom:8px;">
            <p style="font-size: 11px; color: #475569; margin: 0 0 2px; display:flex; justify-content:space-between;"><span>Physical Progress</span><strong>${p.physicalProgress}%</strong></p>
            <p style="font-size: 11px; color: #475569; margin: 0; display:flex; justify-content:space-between;"><span>Sanctioned Budget</span><strong>${escapeHtml(formatCurrency(p.sanctionedBudget))}</strong></p>
          </div>
          <button id="${popupId}" style="font-size: 11px; font-weight: 600; color: #1d4ed8; background: none; border: none; cursor: pointer; padding: 0;">View project &rarr;</button>
        </div>
      `);
      marker.on('popupopen', () => {
        document.getElementById(popupId)?.addEventListener('click', () => navigateRef.current(`/projects/${p.id}`));
      });
      return marker;
    });
  }, [projects]);

  return (
    <div>
      <style>{`@keyframes proj-pulse { 0% { transform: scale(0.6); opacity: 0.5; } 100% { transform: scale(1.9); opacity: 0; } }`}</style>
      <div ref={containerRef} className="h-[380px] w-full overflow-hidden rounded-lg border border-slate-200 shadow-sm" />
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500">
        {Object.entries({ ON_TRACK: 'On Track', AT_RISK: 'At Risk', DELAYED: 'Delayed', COMPLETED: 'Completed' }).map(([k, label]) => (
          <span key={k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: STATUS_HEX[k] }} />{label}</span>
        ))}
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
