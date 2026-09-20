import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Camera as CameraIcon } from 'lucide-react';
import { Button } from '../ui/primitives';
import { uiText } from '../../i18n/ui';

export interface SiteCapture { dataUrl: string; lat: number; lng: number; gpsAccuracyM: number; capturedAt: string }

/** Live capture only. No gallery picker or substitution of registered site coordinates. */
export function SiteCamera({ onCapture }: { onCapture: (photo: SiteCapture) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const alive = useRef(true);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function stop() { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setLive(false); }
  useEffect(() => { alive.current = true; return () => { alive.current = false; stream.current?.getTracks().forEach(t => t.stop()); }; }, []);
  useEffect(() => { if (live && video.current) video.current.srcObject = stream.current; }, [live]);
  async function record(dataUrl: string, capturedAt: string) {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    if (!alive.current) return;
    if (![pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy].every(Number.isFinite)) throw new Error('GPS coordinates are unavailable. Please retry.');
    onCapture({ dataUrl, capturedAt, lat: pos.coords.latitude, lng: pos.coords.longitude, gpsAccuracyM: Math.ceil(pos.coords.accuracy) });
    stop();
  }
  async function start() {
    setBusy(true); setError('');
    try {
      if (Capacitor.isNativePlatform()) {
        const photo = await Camera.getPhoto({ source: CameraSource.Camera, resultType: CameraResultType.DataUrl, quality: 80, width: 1600, height: 1600, saveToGallery: false, allowEditing: false });
        if (photo.dataUrl) await record(photo.dataUrl, new Date().toISOString());
      } else {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS or localhost and a supported browser.');
        const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (!alive.current) { media.getTracks().forEach(t => t.stop()); return; }
        stream.current = media; setLive(true);
      }
    } catch (e) { if (alive.current) setError((e as Error).message || 'Allow camera and location access, then retry.'); }
    finally { if (alive.current) setBusy(false); }
  }
  async function shutter() {
    setBusy(true); setError('');
    try {
      const el = video.current;
      if (!el?.videoWidth) throw new Error('Camera is not ready. Please retry.');
      const canvas = document.createElement('canvas'); const scale = Math.min(1, 1600 / Math.max(el.videoWidth, el.videoHeight));
      canvas.width = Math.round(el.videoWidth * scale); canvas.height = Math.round(el.videoHeight * scale);
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Camera capture is unavailable.');
      ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
      await record(canvas.toDataURL('image/jpeg', .8), new Date().toISOString());
    } catch(e) { if (alive.current) setError((e as Error).message || 'Device location is required. Enable GPS and retry.'); }
    finally { if (alive.current) setBusy(false); }
  }
  return <div className="site-camera space-y-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
    <p className="text-xs leading-relaxed text-slate-600">{uiText('Take a new photo at the site. Camera and device location are required; gallery uploads are unavailable.')}</p>
    {live && <video ref={video} autoPlay playsInline muted className="max-h-72 w-full rounded-xl bg-slate-950" />}
    {error && <p role="alert" className="text-sm text-red-700">{uiText(error)}</p>}
    <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={busy} onClick={live ? shutter : start}><CameraIcon size={18} />{uiText(busy ? 'Capturing location…' : live ? 'Take photo' : 'Open camera')}</Button>
      {live && <Button type="button" variant="outline" disabled={busy} onClick={stop}>{uiText('Close camera')}</Button>}
    </div>
  </div>;
}
