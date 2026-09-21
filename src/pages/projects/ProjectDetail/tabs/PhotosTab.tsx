import { PhotoReview } from '../../../../components/common/PhotoReview';
import { ROLE_LABELS } from '../../../../lib/constants';
import type { SiteCapture } from '../../../../components/common/SiteCamera';
import { uiMessage, uiText, useUiLanguage } from '../../../../i18n/ui';
import { lazy, Suspense, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Camera, Trash2, ChevronLeft, ChevronRight, Images } from 'lucide-react';
import type { Project, PhotoType } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, EmptyState, Textarea } from '../../../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Dialog, DialogContent, DialogFooter, ConfirmDialog } from '../../../../components/ui/overlays';
import { GeoPhoto } from '../../../../components/common/GeoPhoto';
import { photoSrc, formatDate, formatDateTime } from '../../../../lib/utils';
import { isWithinGeofence } from '../../../../lib/geo';
import { deleteEvidenceMedia, readEvidenceMedia } from '../../../../lib/evidenceMedia';
import { EvidenceStorage } from '../../../../components/common/EvidenceStorage';
import { EvidenceIntegrity } from '../../../../components/common/EvidenceIntegrity';

const SiteCamera = lazy(() => import('../../../../components/common/SiteCamera').then(m => ({ default: m.SiteCamera })));
const SiteBoundaryEditor = lazy(() => import('../../../../components/common/SiteBoundaryEditor').then(m => ({ default: m.SiteBoundaryEditor })));

const STAGE_OPTIONS = ['Foundation', 'Structure', 'Roofing', 'MEP', 'Finishing', 'Medical Infrastructure'];
const TYPES: PhotoType[] = ['BEFORE', 'PROGRESS', 'COMPLETION'];

export function PhotosTab({ project }: { project: Project }) {
  useUiLanguage();
  const photos = useStore((s) => s.photos).filter((p) => p.projectId === project.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const addPhoto = useStore((s) => s.addPhoto);
  const deletePhoto = useStore((s) => s.deletePhoto);
  const currentUser = useStore((s) => s.currentUser);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [boundaryOpen, setBoundaryOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [stageFilter, setStageFilter] = useState('ALL');
  const [capture, setCapture] = useState<SiteCapture | null>(null);
  const [busy, setBusy] = useState(false);
  const [locationReason, setLocationReason] = useState('');
  const [place, setPlace] = useState('ALL');
  const [form, setForm] = useState({ building: '', floor: '', activity: '', stage: STAGE_OPTIONS[0], type: 'PROGRESS' as PhotoType, description: '' });

  const locationKey = (p: { building?: string; floor?: string; activity?: string; stage: string }) => [p.building || 'Unspecified building', p.floor || 'Unspecified floor', p.activity || p.stage].join(' / ');
  const places = [...new Set(photos.map(locationKey))];
  const filtered = photos.filter(p => (stageFilter === 'ALL' || p.stage === stageFilter) && (place === 'ALL' || locationKey(p) === place));
  const grouped = useMemo(() => {
    const map = new Map<string, typeof photos>();
    filtered.forEach((p) => { const arr = map.get(locationKey(p)) ?? []; arr.push(p); map.set(locationKey(p), arr); });
    return Array.from(map.entries());
  }, [filtered]);

  const viewerIndex = filtered.findIndex((p) => p.id === viewerId);
  const viewerPhoto = filtered[viewerIndex];

  function discardCapture() {
    if (capture?.mediaKey) void deleteEvidenceMedia(capture.mediaKey);
    setCapture(null); setLocationReason('');
  }

  function acceptCapture(next: SiteCapture) {
    if (capture?.mediaKey) void deleteEvidenceMedia(capture.mediaKey);
    setCapture(next); setLocationReason('');
  }

  async function downloadStampedEvidence() {
    if (!viewerPhoto?.mediaKey) return;
    try {
      const blob = await readEvidenceMedia(viewerPhoto.mediaKey, 'stamped');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `${project.id}-${viewerPhoto.id}-geotagged.jpg`; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { toast.error(uiText((cause as Error).message)); }
  }

  async function submitUpload() {
    if (busy) return; setBusy(true);
    try {
      if (!capture) throw new Error('Capture a new site photo with GPS first.');
      if (!form.building.trim() || !form.floor.trim() || !form.activity.trim()) throw new Error('Enter building, floor and activity to group the photo.');
      if (capture.geoFenceStatus !== 'INSIDE' && locationReason.trim().length < 10) throw new Error('Explain why this outside or uncertain location should be submitted.');
      const now = new Date().toISOString();
      addPhoto({ projectId: project.id, stage: form.stage, type: form.type, date: now.slice(0, 10), building: form.building.trim(), floor: form.floor.trim(), activity: form.activity.trim(),
        location: form.building + ' / ' + form.floor, uploadedBy: currentUser?.name ?? '', uploadedByRole: currentUser!.role,
        description: form.description, remarks: locationReason.trim() || undefined, seed: 0, ...capture, locationSource: 'CAPTURED', uploadedAt: now, deviceInfo: navigator.userAgent.slice(0, 120) });
      toast.success(uiText('Photo saved on this device.')); setCapture(null); setLocationReason(''); setUploadOpen(false);
    } catch(e) { toast.error(uiText((e as Error).message)); } finally { setBusy(false); }
  }
  const comparisons = grouped.map(([key, items]) => ({ key, before: [...items].filter(p => p.type === 'BEFORE').sort((a,b) => a.capturedAt.localeCompare(b.capturedAt))[0], after: [...items].filter(p => p.type !== 'BEFORE').sort((a,b) => b.capturedAt.localeCompare(a.capturedAt))[0] })).filter(pair => pair.before && pair.after);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{([{type:'BEFORE',label:'Start / baseline'}, {type:'PROGRESS',label:'Midpoint / progress'}, {type:'COMPLETION',label:'Completion'}] as const).map(checkpoint => {
        const count = photos.filter(photo => photo.type === checkpoint.type && photo.dataUrl).length;
        return <button key={checkpoint.type} className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-left" onClick={()=>{setForm({...form,type:checkpoint.type});setUploadOpen(true);}}><p className="text-sm font-semibold text-blue-900">{uiText(checkpoint.label)}</p><p className="mt-1 text-xs text-slate-600">{count} {uiText('captured photos')}</p><p className="mt-2 text-xs text-blue-700">{uiText('Capture Photo')} →</p></button>;
      })}</div>
      <p className="text-xs text-slate-500">{uiText('Capture a baseline before work, progress at the midpoint, and completion evidence for each building, floor and activity. Sample photos do not count as captured evidence.')}</p>
      <details className="rounded-2xl border border-blue-100 bg-white p-4" onToggle={event => setBoundaryOpen(event.currentTarget.open)}><summary className="cursor-pointer text-sm font-semibold text-blue-900">{uiText('Site boundary and geofence')}</summary>{boundaryOpen && <div className="mt-4"><Suspense fallback={<p role="status" className="text-xs text-slate-500">{uiText('Loading map…')}</p>}><SiteBoundaryEditor project={project}/></Suspense></div>}</details>
      <details className="rounded-2xl border border-blue-100 bg-white p-4" onToggle={event => setStorageOpen(event.currentTarget.open)}><summary className="cursor-pointer text-sm font-semibold text-blue-900">{uiText('Evidence stored on this device')}</summary>{storageOpen && <div className="mt-4"><EvidenceStorage projectId={project.id}/></div>}</details>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{uiText("All Stages")}</SelectItem>
              {STAGE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{uiText(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          <select aria-label={uiText('Building, floor and activity')} className="min-h-11 max-w-full rounded border px-2 text-xs" value={place} onChange={e => setPlace(e.target.value)}><option value="ALL">{uiText('All locations')}</option>{places.map(p => <option key={p}>{p}</option>)}</select>
          <Button variant="outline" size="sm" onClick={() => setCompareMode((v) => !v)}><Images size={14} /> {uiText(compareMode ? 'Hide' : 'Before / After')}</Button>
        </div>
        <Button onClick={() => setUploadOpen(true)}><Camera size={18} />{uiText(" Capture Photo")}</Button>
      </div>

      {compareMode && comparisons.length === 0 && <p className="text-sm text-slate-500">{uiText('Add before and progress/completion photos for the same building, floor and activity.')}</p>}
      {compareMode && comparisons.map(({ key, before, after }) => (
        <Card key={key}>
          <CardHeader><CardTitle>{uiText("Before / After Comparison")} ? {key}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[{ label: 'BEFORE', photo: before }, { label: 'LATEST', photo: after }].map(({ label, photo }) => (
              <div key={label} className="overflow-hidden rounded-md border border-slate-200">
                <img src={photoSrc(photo)} className="h-52 w-full object-cover" />
                <div className="p-2.5">
                  <Badge>{uiText(label)}</Badge>
                  <p className="mt-1 text-xs font-medium text-slate-700">{uiText(photo.stage)}</p>
                  <p className="text-[11px] text-slate-400">{uiText(formatDate(photo.date))} · {uiText(photo.location)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {grouped.length === 0 && <EmptyState icon={<Images size={32} />} title={uiText("No photos uploaded yet")} description={uiText("Capture before, progress, and completion photographs to build the visual construction record.")} action={<Button size="sm" onClick={() => setUploadOpen(true)}>{uiText("Capture First Photo")}</Button>} />}

      {grouped.map(([stage, items]) => (
        <Card key={stage}>
          <CardHeader><CardTitle>{uiText(stage)} <span className="ml-2 font-normal text-slate-400">{items.length}{uiText(" photos")}</span></CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((ph) => (
              <button key={ph.id} onClick={() => setViewerId(ph.id)} className="group overflow-hidden rounded-md border border-slate-200 text-left">
                <div className="relative">
                  <img alt={ph.description} src={photoSrc(ph)} className="h-52 w-full object-cover transition-transform group-hover:scale-105" />
                  <Badge className="absolute left-1.5 top-1.5 bg-white/90">{uiText(ph.type)}</Badge>
                </div>
                <div className="p-1.5">
                  <p className="text-[10.5px] text-slate-500">{uiText(formatDate(ph.date))}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      ))}

      <Dialog open={uploadOpen} onOpenChange={v => !busy && (setUploadOpen(v), !v && discardCapture())}>
        <DialogContent title={uiText("Capture Site Photo")} description={uiText(project.name)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-600">{uiText("Construction Stage")}</p>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{uiText(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-600">{uiText("Photo Type")}</p>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as PhotoType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{uiText(t)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">{uiText("Description")}</p>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={uiText("Brief description of the photograph")} />
            </div>
            {(['building', 'floor', 'activity'] as const).map(key => <label key={key} className="block text-xs">{uiText(key)}<input className="block min-h-11 w-full rounded border px-2" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}
            {capture && <GeoPhoto src={capture.dataUrl} mediaKey={capture.mediaKey} lat={capture.lat} lng={capture.lng} timestamp={capture.capturedAt} location={project.name} className="h-52" />}
            {capture && capture.geoFenceStatus !== 'INSIDE' && <label className="block text-xs font-medium text-amber-900">{uiText('Location exception reason')}<Textarea rows={2} value={locationReason} onChange={event => setLocationReason(event.target.value)} placeholder={uiText('Explain why evidence was captured outside or near the site boundary')}/></label>}
            <Suspense fallback={<p role="status" className="text-xs text-slate-500">{uiText('Opening camera…')}</p>}><SiteCamera key={`${project.id}-${uploadOpen}`} project={project} onCapture={acceptCapture} /></Suspense>
          </div>
          <DialogFooter>
            <Button disabled={busy} variant="outline" onClick={() => { discardCapture(); setUploadOpen(false); }}>{uiText("Cancel")}</Button>
            <Button disabled={busy || !capture || (capture.geoFenceStatus !== 'INSIDE' && locationReason.trim().length < 10)} onClick={submitUpload}>{uiText(busy ? "Saving..." : "Submit evidence")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewerId} onOpenChange={(v) => !v && setViewerId(null)}>
        {viewerPhoto && (
          <DialogContent title={uiMessage("{{0}} — {{1}}", [viewerPhoto.stage, viewerPhoto.type])} description={uiText(formatDateTime(viewerPhoto.date))} size="xl">
            <div className="relative">
              <GeoPhoto
                src={photoSrc(viewerPhoto)}
                mediaKey={viewerPhoto.mediaKey}
                lat={viewerPhoto.lat}
                lng={viewerPhoto.lng}
                timestamp={viewerPhoto.capturedAt}
                location={viewerPhoto.location}
                className="max-h-[55vh] w-full"
                imgClassName="max-h-[55vh]"
              />
              {viewerIndex > 0 && <button onClick={() => setViewerId(filtered[viewerIndex - 1].id)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow"><ChevronLeft size={16} /></button>}
              {viewerIndex < filtered.length - 1 && <button onClick={() => setViewerId(filtered[viewerIndex + 1].id)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow"><ChevronRight size={16} /></button>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-3 text-xs sm:grid-cols-4">
              <div><p className="text-slate-400">{uiText("Uploaded By")}</p><p className="font-medium text-slate-700">{uiText(viewerPhoto.uploadedBy)}</p><p>{uiText(ROLE_LABELS[viewerPhoto.uploadedByRole])}</p></div>
              <div><p className="text-slate-400">{uiText("Location")}</p><p className="font-medium text-slate-700">{uiText(viewerPhoto.location)}</p></div>
              <div><p className="text-slate-400">{uiText("Captured")}</p><p className="font-medium text-slate-700">{uiText(formatDateTime(viewerPhoto.capturedAt))}</p></div>
              <div><p className="text-slate-400">{uiText("Stage")}</p><p className="font-medium text-slate-700">{uiText(viewerPhoto.stage)}</p></div>
              <div>
                <p className="text-slate-400">{uiText("Location Source")}</p>
                <p className="font-medium text-slate-700">{uiText(viewerPhoto.locationSource === 'CAPTURED' ? `Device GPS (±${viewerPhoto.gpsAccuracyM}m)` : 'Manually entered')}</p>
              </div>
              <div>
                <p className="text-slate-400">{uiText("Geo-Fence")}</p>
                {(viewerPhoto.geoFenceStatus ?? (isWithinGeofence(viewerPhoto, { lat: project.siteLat, lng: project.siteLng }) ? 'INSIDE' : 'OUTSIDE')) === 'INSIDE' ? (
                  <Badge className="mt-0.5 border-emerald-200 bg-emerald-50 text-emerald-700">{uiText("Within Project Geo-Fence")}</Badge>
                ) : viewerPhoto.geoFenceStatus === 'UNCERTAIN' ? (
                  <Badge className="mt-0.5 border-amber-200 bg-amber-50 text-amber-700">{uiText("Location uncertain")}</Badge>
                ) : (
                  <Badge className="mt-0.5 border-red-200 bg-red-50 text-red-700">{uiText("Outside Project Geo-Fence")}</Badge>
                )}
              </div>
              {viewerPhoto.distanceFromSiteM !== undefined && <div><p className="text-slate-400">{uiText('Distance / accuracy')}</p><p className="font-medium text-slate-700">{viewerPhoto.distanceFromSiteM}m · ±{viewerPhoto.gpsAccuracyM}m</p></div>}
              {viewerPhoto.geoFenceShape && <div><p className="text-slate-400">{uiText('Boundary at capture')}</p><p className="font-medium text-slate-700">{uiText(viewerPhoto.geoFenceShape)}{viewerPhoto.geoFenceBoundaryUpdatedAt ? ` · ${formatDateTime(viewerPhoto.geoFenceBoundaryUpdatedAt)}` : ''}</p></div>}
              {viewerPhoto.gpsCapturedAt && <div><p className="text-slate-400">{uiText('GPS fix time')}</p><p className="font-medium text-slate-700">{uiText(formatDateTime(viewerPhoto.gpsCapturedAt))}</p></div>}
              <div><p className="text-slate-400">{uiText("Device")}</p><p className="font-medium text-slate-700">{uiText(viewerPhoto.deviceInfo ?? 'Not captured by device')}</p></div>
              <div className="col-span-2 sm:col-span-4"><p className="text-slate-400">{uiText("Description")}</p><p className="font-medium text-slate-700">{viewerPhoto.description}</p></div>
            </div>
            {(viewerPhoto.locationSource === 'MANUAL' || viewerPhoto.geoFenceStatus === 'OUTSIDE' || viewerPhoto.geoFenceStatus === 'UNCERTAIN' || !isWithinGeofence(viewerPhoto, { lat: project.siteLat, lng: project.siteLng })) && (
              <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">{uiText("This evidence is flagged for review: ")}{uiText(viewerPhoto.locationSource === 'MANUAL' ? 'coordinates were manually entered rather than device-captured' : viewerPhoto.geoFenceStatus === 'UNCERTAIN' ? 'GPS accuracy overlaps the project boundary' : 'the captured GPS location falls outside the project geo-fence')}. {viewerPhoto.remarks && <strong>{viewerPhoto.remarks}</strong>}
              </p>
            )}
            <PhotoReview key={viewerPhoto.id} photo={viewerPhoto} />
            <div className="mt-3"><EvidenceIntegrity mediaKey={viewerPhoto.mediaKey}/></div>
            <DialogFooter>
              {viewerPhoto.mediaKey && <Button variant="outline" size="sm" onClick={downloadStampedEvidence}>{uiText('Download geotagged copy')}</Button>}
              {(currentUser?.role === 'SUPERADMIN' || viewerPhoto.uploadedById === currentUser?.id) && <Button variant="destructive" size="sm" onClick={() => { setDeleteId(viewerPhoto.id); setViewerId(null); }}><Trash2 size={13} />{uiText(" Delete")}</Button>}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)} destructive
        title={uiText("Delete photograph?")} description={uiText("This will permanently remove the photograph and its metadata from the project record.")}
        confirmLabel="Delete" onConfirm={() => { if (deleteId) { try { const photo = photos.find(item => item.id === deleteId); deletePhoto(deleteId); if (photo?.mediaKey) void deleteEvidenceMedia(photo.mediaKey); toast.success(uiText('Photo deleted.')); } catch (cause) { toast.error(uiText((cause as Error).message)); } } }}
      />
    </div>
  );
}
