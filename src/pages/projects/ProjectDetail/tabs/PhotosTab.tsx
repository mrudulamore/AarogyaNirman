import { uiMessage, uiText, useUiLanguage } from '../../../../i18n/ui';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Upload, Trash2, ChevronLeft, ChevronRight, Images } from 'lucide-react';
import type { Project, PhotoType } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, EmptyState, Textarea } from '../../../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Dialog, DialogContent, DialogFooter, ConfirmDialog } from '../../../../components/ui/overlays';
import { GeoPhoto } from '../../../../components/common/GeoPhoto';
import { photoSrc, formatDate, formatDateTime } from '../../../../lib/utils';
import { simulateCapture, isWithinGeofence } from '../../../../lib/geo';

const STAGE_OPTIONS = ['Foundation', 'Structure', 'Roofing', 'MEP', 'Finishing', 'Medical Infrastructure'];
const TYPES: PhotoType[] = ['BEFORE', 'PROGRESS', 'COMPLETION'];

export function PhotosTab({ project }: { project: Project }) {
  useUiLanguage();
  const photos = useStore((s) => s.photos).filter((p) => p.projectId === project.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const addPhoto = useStore((s) => s.addPhoto);
  const deletePhoto = useStore((s) => s.deletePhoto);
  const currentUser = useStore((s) => s.currentUser);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [stageFilter, setStageFilter] = useState('ALL');
  const [form, setForm] = useState({ stage: STAGE_OPTIONS[0], type: 'PROGRESS' as PhotoType, description: '' });

  const filtered = stageFilter === 'ALL' ? photos : photos.filter((p) => p.stage === stageFilter);
  const grouped = useMemo(() => {
    const map = new Map<string, typeof photos>();
    filtered.forEach((p) => { const arr = map.get(p.stage) ?? []; arr.push(p); map.set(p.stage, arr); });
    return Array.from(map.entries());
  }, [filtered]);

  const viewerIndex = filtered.findIndex((p) => p.id === viewerId);
  const viewerPhoto = filtered[viewerIndex];

  function submitUpload() {
    addPhoto({
      projectId: project.id, stage: form.stage, type: form.type, date: new Date().toISOString().slice(0, 10),
      location: `${project.taluka}, ${project.district}`, uploadedBy: currentUser?.name ?? 'Deputy Engineer',
      uploadedByRole: currentUser?.role ?? 'DEPUTY_ENGINEER',
      description: form.description || `${form.stage} — ${form.type.toLowerCase()} photo`, seed: Math.floor(Math.random() * 99999),
      ...simulateCapture(project),
    });
    toast.success(uiText('Photo uploaded with device-captured location and timestamp metadata.'));
    setUploadOpen(false);
  }

  const beforeShot = photos.filter((p) => p.type === 'BEFORE')[0];
  const latestShot = photos.filter((p) => p.type !== 'BEFORE')[0] ?? photos[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{uiText("All Stages")}</SelectItem>
              {STAGE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{uiText(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setCompareMode((v) => !v)}><Images size={14} /> {uiText(compareMode ? 'Hide' : 'Before / After')}</Button>
        </div>
        <Button onClick={() => setUploadOpen(true)}><Upload size={15} />{uiText(" Upload Photo")}</Button>
      </div>

      {compareMode && beforeShot && latestShot && (
        <Card>
          <CardHeader><CardTitle>{uiText("Before / After Comparison")}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[{ label: 'BEFORE', photo: beforeShot }, { label: 'LATEST', photo: latestShot }].map(({ label, photo }) => (
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
      )}

      {grouped.length === 0 && <EmptyState icon={<Images size={32} />} title={uiText("No photos uploaded yet")} description={uiText("Upload before, progress, and completion photographs to build the visual construction record.")} action={<Button size="sm" onClick={() => setUploadOpen(true)}>{uiText("Upload First Photo")}</Button>} />}

      {grouped.map(([stage, items]) => (
        <Card key={stage}>
          <CardHeader><CardTitle>{uiText(stage)} <span className="ml-2 font-normal text-slate-400">{items.length}{uiText(" photos")}</span></CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {items.map((ph) => (
              <button key={ph.id} onClick={() => setViewerId(ph.id)} className="group overflow-hidden rounded-md border border-slate-200 text-left">
                <div className="relative">
                  <img src={photoSrc(ph)} className="h-28 w-full object-cover transition-transform group-hover:scale-105" />
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

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent title={uiText("Upload Site Photo")} description={uiText(project.name)}>
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
            <div className="flex h-32 items-center justify-center rounded-md border-2 border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-400">
              <div><Upload className="mx-auto mb-1" size={20} />{uiText(" Simulated upload — a placeholder image will be generated")}<br />{uiText("Location & timestamp captured automatically")}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>{uiText("Cancel")}</Button>
            <Button onClick={submitUpload}>{uiText("Upload")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewerId} onOpenChange={(v) => !v && setViewerId(null)}>
        {viewerPhoto && (
          <DialogContent title={uiMessage("{{0}} — {{1}}", [viewerPhoto.stage, viewerPhoto.type])} description={uiText(formatDateTime(viewerPhoto.date))} size="xl">
            <div className="relative">
              <GeoPhoto
                src={photoSrc(viewerPhoto)}
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
              <div><p className="text-slate-400">{uiText("Uploaded By")}</p><p className="font-medium text-slate-700">{uiText(viewerPhoto.uploadedBy)}</p></div>
              <div><p className="text-slate-400">{uiText("Location")}</p><p className="font-medium text-slate-700">{uiText(viewerPhoto.location)}</p></div>
              <div><p className="text-slate-400">{uiText("Captured")}</p><p className="font-medium text-slate-700">{uiText(formatDateTime(viewerPhoto.capturedAt))}</p></div>
              <div><p className="text-slate-400">{uiText("Stage")}</p><p className="font-medium text-slate-700">{uiText(viewerPhoto.stage)}</p></div>
              <div>
                <p className="text-slate-400">{uiText("Location Source")}</p>
                <p className="font-medium text-slate-700">{uiText(viewerPhoto.locationSource === 'CAPTURED' ? `Device GPS (±${viewerPhoto.gpsAccuracyM}m)` : 'Manually entered')}</p>
              </div>
              <div>
                <p className="text-slate-400">{uiText("Geo-Fence")}</p>
                {isWithinGeofence(viewerPhoto, { lat: project.siteLat, lng: project.siteLng }) ? (
                  <Badge className="mt-0.5 border-emerald-200 bg-emerald-50 text-emerald-700">{uiText("Within Project Geo-Fence")}</Badge>
                ) : (
                  <Badge className="mt-0.5 border-red-200 bg-red-50 text-red-700">{uiText("Outside Project Geo-Fence")}</Badge>
                )}
              </div>
              <div><p className="text-slate-400">{uiText("Device")}</p><p className="font-medium text-slate-700">{uiText(viewerPhoto.deviceInfo ?? 'Not captured by device')}</p></div>
              <div className="col-span-2 sm:col-span-4"><p className="text-slate-400">{uiText("Description")}</p><p className="font-medium text-slate-700">{viewerPhoto.description}</p></div>
            </div>
            {(viewerPhoto.locationSource === 'MANUAL' || !isWithinGeofence(viewerPhoto, { lat: project.siteLat, lng: project.siteLng })) && (
              <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">{uiText("This evidence is flagged for review: ")}{uiText(viewerPhoto.locationSource === 'MANUAL' ? 'coordinates were manually entered rather than device-captured' : 'the captured GPS location falls outside the project geo-fence')}.
              </p>
            )}
            <DialogFooter>
              <Button variant="destructive" size="sm" onClick={() => { setDeleteId(viewerPhoto.id); setViewerId(null); }}><Trash2 size={13} />{uiText(" Delete")}</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)} destructive
        title={uiText("Delete photograph?")} description={uiText("This will permanently remove the photograph and its metadata from the project record.")}
        confirmLabel="Delete" onConfirm={() => { if (deleteId) { deletePhoto(deleteId); toast.success(uiText('Photo deleted.')); } }}
      />
    </div>
  );
}
