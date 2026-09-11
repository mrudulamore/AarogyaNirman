import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Project } from '../../types';
import { formatCurrency } from '../../lib/utils';

const STATUS_HEX: Record<string, string> = { ON_TRACK: '#3b82f6', AT_RISK: '#f59e0b', DELAYED: '#ef4444', COMPLETED: '#10b981' };

/** Real Maharashtra map via Leaflet + OpenStreetMap — open source, no API key required. */
export function ProjectMap({ projects }: { projects: Project[] }) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [19.5, 76.0],
      zoom: 6,
      scrollWheelZoom: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = projects.map((p) => {
      const marker = L.circleMarker([p.siteLat, p.siteLng], {
        radius: 7,
        color: '#ffffff',
        weight: 1.5,
        fillColor: STATUS_HEX[p.status] ?? '#64748b',
        fillOpacity: 0.92,
      }).addTo(map);
      const popupId = `view-project-${p.id}`;
      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 190px;">
          <p style="font-size: 12.5px; font-weight: 600; color: #1e293b; margin: 0 0 4px;">${escapeHtml(p.name)}</p>
          <p style="font-size: 11px; color: #64748b; margin: 0 0 6px;">${escapeHtml(p.taluka)}, ${escapeHtml(p.district)}</p>
          <p style="font-size: 11px; color: #475569; margin: 0 0 2px;">Physical Progress: <strong>${p.physicalProgress}%</strong></p>
          <p style="font-size: 11px; color: #475569; margin: 0 0 8px;">${escapeHtml(formatCurrency(p.sanctionedBudget))}</p>
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
      <div ref={containerRef} className="h-[380px] w-full rounded-lg" />
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
