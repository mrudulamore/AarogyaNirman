import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Camera as CameraIcon, LocateFixed, RefreshCw } from 'lucide-react';
import { Button } from '../ui/primitives';
import { uiText } from '../../i18n/ui';
import { assessProjectGeoFence, type GeoFenceAssessment } from '../../lib/geo';
import { saveEvidenceMedia } from '../../lib/evidenceMedia';
import type { GeoFenceStatus } from '../../types';

const MAX_FIX_AGE_MS = 30_000;

type LocationFix = { lat: number; lng: number; accuracyM: number; capturedAt: string; timestampMs: number };

export interface SiteCapture {
  dataUrl: string;
  mediaKey: string;
  lat: number;
  lng: number;
  gpsAccuracyM: number;
  gpsCapturedAt: string;
  gpsAgeMs: number;
  capturedAt: string;
  geoFenceStatus: GeoFenceStatus;
  distanceFromSiteM: number;
  geoFenceRadiusM: number;
  geoFenceShape: 'POLYGON' | 'CIRCLE';
  geoFenceBoundaryUpdatedAt?: string;
}

/** Camera-only evidence capture. A fresh GPS fix is acquired before the shutter is enabled;
 * the original and a separately stamped export are stored outside the main app state. */
export function SiteCamera({ project, onCapture }: {
  project: { name: string; siteLat: number; siteLng: number; siteBoundary?: { lat: number; lng: number }[]; geoFenceRadiusM?: number; siteLocationConfirmedAt?: string; boundaryUpdatedAt?: string };
  onCapture: (photo: SiteCapture) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const alive = useRef(true);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fix, setFix] = useState<LocationFix | null>(null);
  const [assessment, setAssessment] = useState<GeoFenceAssessment | null>(null);

  function stop() { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; setLive(false); }
  useEffect(() => { alive.current = true; return () => { alive.current = false; stream.current?.getTracks().forEach(track => track.stop()); }; }, []);
  useEffect(() => { if (live && video.current) video.current.srcObject = stream.current; }, [live]);

  async function acquireLocation(): Promise<LocationFix> {
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 });
    if (![position.coords.latitude, position.coords.longitude, position.coords.accuracy].every(Number.isFinite)) throw new Error('GPS coordinates are unavailable. Move to an open area and retry.');
    const timestampMs = Number.isFinite(position.timestamp) ? position.timestamp : Date.now();
    const next = { lat: position.coords.latitude, lng: position.coords.longitude, accuracyM: Math.ceil(position.coords.accuracy), capturedAt: new Date(timestampMs).toISOString(), timestampMs };
    if (alive.current) {
      setFix(next);
      const result = assessProjectGeoFence({ ...next, gpsAccuracyM: next.accuracyM }, project);
      setAssessment(project.siteLocationConfirmedAt ? result : { ...result, status: 'UNCERTAIN' });
    }
    return next;
  }

  async function refreshLocation() {
    setBusy(true); setError('');
    try { await acquireLocation(); }
    catch (cause) { if (alive.current) setError((cause as Error).message || 'Enable precise location and retry.'); }
    finally { if (alive.current) setBusy(false); }
  }

  async function persistCapture(dataUrl: string, capturedAt: string, locationFix: LocationFix) {
    const gpsAgeMs = Math.max(0, Date.parse(capturedAt) - locationFix.timestampMs);
    if (gpsAgeMs > MAX_FIX_AGE_MS) throw new Error('The GPS fix became stale. Refresh location and retake the photo.');
    const calculated = assessProjectGeoFence({ ...locationFix, gpsAccuracyM: locationFix.accuracyM }, project);
    const result = project.siteLocationConfirmedAt ? calculated : { ...calculated, status: 'UNCERTAIN' as const };
    const stored = await saveEvidenceMedia(dataUrl, { projectName: project.name, lat: locationFix.lat, lng: locationFix.lng, accuracyM: locationFix.accuracyM, capturedAt, status: result.status });
    if (!alive.current) return;
    onCapture({ dataUrl: stored.thumbnailDataUrl, mediaKey: stored.mediaKey, lat: locationFix.lat, lng: locationFix.lng, gpsAccuracyM: locationFix.accuracyM, gpsCapturedAt: locationFix.capturedAt, gpsAgeMs, capturedAt, geoFenceStatus: result.status, distanceFromSiteM: result.distanceM, geoFenceRadiusM: result.radiusM, geoFenceShape: project.siteBoundary?.length ? 'POLYGON' : 'CIRCLE', geoFenceBoundaryUpdatedAt: project.boundaryUpdatedAt });
    stop();
  }

  async function start() {
    setBusy(true); setError('');
    try {
      const locationFix = await acquireLocation();
      if (Capacitor.isNativePlatform()) {
        const photo = await Camera.getPhoto({ source: CameraSource.Camera, resultType: CameraResultType.DataUrl, quality: 88, width: 2048, height: 2048, saveToGallery: false, allowEditing: false });
        if (photo.dataUrl) await persistCapture(photo.dataUrl, new Date().toISOString(), locationFix);
      } else {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS or localhost and a supported browser.');
        const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (!alive.current) { media.getTracks().forEach(track => track.stop()); return; }
        stream.current = media; setLive(true);
      }
    } catch (cause) { if (alive.current) setError((cause as Error).message || 'Allow camera and precise location access, then retry.'); }
    finally { if (alive.current) setBusy(false); }
  }

  async function shutter() {
    setBusy(true); setError('');
    try {
      const element = video.current;
      if (!element?.videoWidth) throw new Error('Camera is not ready. Please retry.');
      let locationFix = fix;
      if (!locationFix || Date.now() - locationFix.timestampMs > MAX_FIX_AGE_MS) locationFix = await acquireLocation();
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 2048 / Math.max(element.videoWidth, element.videoHeight));
      canvas.width = Math.round(element.videoWidth * scale); canvas.height = Math.round(element.videoHeight * scale);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Camera capture is unavailable.');
      context.drawImage(element, 0, 0, canvas.width, canvas.height);
      await persistCapture(canvas.toDataURL('image/jpeg', .88), new Date().toISOString(), locationFix);
    } catch (cause) { if (alive.current) setError((cause as Error).message || 'Device location is required. Enable GPS and retry.'); }
    finally { if (alive.current) setBusy(false); }
  }

  const statusTone = assessment?.status === 'INSIDE' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : assessment?.status === 'OUTSIDE' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800';
  return <div className="site-camera space-y-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
    <div className="flex items-start gap-3"><LocateFixed className="mt-0.5 shrink-0 text-blue-700" size={20}/><div><p className="text-sm font-semibold text-blue-950">{uiText('Capture-time location')}</p><p className="text-xs leading-relaxed text-slate-600">{uiText('Acquire a fresh GPS fix before taking a new site photo. Gallery uploads are unavailable.')}</p></div></div>
    {!project.siteLocationConfirmedAt && <p role="status" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{uiText('This project uses a demonstration site coordinate. Confirm the actual site marker before field use.')}</p>}
    {fix && assessment && <div role="status" className={`rounded-xl border p-3 text-xs ${statusTone}`}><p className="font-semibold">{uiText(assessment.status === 'INSIDE' ? 'Inside site boundary' : assessment.status === 'OUTSIDE' ? 'Outside site boundary' : 'Location uncertain')}</p><p className="mt-1">{assessment.distanceM}m {uiText('from registered site')} · ±{fix.accuracyM}m {uiText('GPS accuracy')}</p><p className="mt-1 font-mono text-[11px]">{fix.lat.toFixed(6)}, {fix.lng.toFixed(6)}</p></div>}
    {live && <video ref={video} autoPlay playsInline muted className="max-h-72 w-full rounded-xl bg-slate-950" />}
    {error && <p role="alert" className="text-sm text-red-700">{uiText(error)}</p>}
    <div className="flex flex-wrap gap-2"><Button type="button" disabled={busy} onClick={live ? shutter : start}><CameraIcon size={18}/>{uiText(busy ? 'Preparing evidence…' : live ? 'Take photo' : 'Get location & open camera')}</Button>{fix && <Button type="button" variant="outline" disabled={busy} onClick={refreshLocation}><RefreshCw size={16}/>{uiText('Refresh GPS')}</Button>}{live && <Button type="button" variant="outline" disabled={busy} onClick={stop}>{uiText('Close camera')}</Button>}</div>
  </div>;
}
