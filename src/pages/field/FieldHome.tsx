import { selectRecentPhotos } from '../../lib/recentPhotos';
import type { PhotoType } from '../../types';
import { SiteCamera, type SiteCapture } from '../../components/common/SiteCamera';
import { ProgressDocuments } from '../../components/common/ProgressDocuments';
import { saveBillFiles } from '../../lib/billAttachments';
import { uiMessage, uiText, useUiLanguage } from '../../i18n/ui';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Camera as CameraIcon, ClipboardList, AlertTriangle, ShieldCheck, QrCode, Siren, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { Card, CardContent, Button, StatusBadge, Textarea } from '../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogFooter } from '../../components/ui/overlays';
import { GeoPhoto } from '../../components/common/GeoPhoto';
import { formatDate, photoSrc } from '../../lib/utils';
import { deleteEvidenceMedia } from '../../lib/evidenceMedia';

export function FieldHome() {
  useUiLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentUser = useStore((s) => s.currentUser);
  const { projects: scopedProjects } = useProjectScope();
  const allPhotos = useStore((s) => s.photos);
  const inspections = useStore((s) => s.inspections);
  const defects = useStore((s) => s.defects);
  const workers = useStore((s) => s.workers);
  const addProgressReport = useStore((s) => s.addProgressReport);
  const addPhoto = useStore((s) => s.addPhoto);
  const createDefect = useStore((s) => s.createDefect);
  const markAttendance = useStore((s) => s.markAttendance);

  const myProjects = scopedProjects;
  const isContractor = currentUser?.role === 'CONTRACTOR';

  const [projectId, setProjectId] = useState(myProjects[0]?.id ?? '');
  const project = myProjects.find((p) => p.id === projectId) ?? myProjects[0];

  const [action, setAction] = useState<null | 'progress' | 'photo' | 'defect' | 'inspection' | 'attendance' | 'emergency'>(() => {
    const requested = searchParams.get('action');
    return requested === 'photo' || requested === 'attendance' ? requested : requested === 'defect' && !isContractor ? 'defect' : null;
  });
  const [progressPct, setProgressPct] = useState(project?.reportedProgress ?? 0);
  const [progressFiles, setProgressFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [defectDesc, setDefectDesc] = useState('');
  const [photoType, setPhotoType] = useState<PhotoType>('PROGRESS');
  const [photoPlace, setPhotoPlace] = useState({ building: '', floor: '', activity: '' });
  const [locationReason, setLocationReason] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<SiteCapture | null>(null);

  const pendingInspections = inspections.filter((i) => i.projectId === project?.id && i.status === 'SCHEDULED');
  const openDefects = defects.filter((d) => d.projectId === project?.id && d.status !== 'CLOSED');
  const projectWorkers = workers.filter((w) => w.projectId === project?.id);
  const recentSitePhotos = selectRecentPhotos(allPhotos.filter(p => p.projectId === project?.id), 4);
  const localEvidenceCount = allPhotos.filter(photo => photo.projectId === project?.id && photo.mediaKey).length;

  function closeAndToast(msg: string) { toast.success(uiText(msg)); setAction(null); setRemarks(''); setDefectDesc(''); }

  function discardCapturedPhoto() {
    if (capturedPhoto?.mediaKey) void deleteEvidenceMedia(capturedPhoto.mediaKey);
    setCapturedPhoto(null); setLocationReason('');
  }

  function acceptCapturedPhoto(next: SiteCapture) {
    if (capturedPhoto?.mediaKey) void deleteEvidenceMedia(capturedPhoto.mediaKey);
    setCapturedPhoto(next); setLocationReason('');
  }

  function uploadCapturedPhoto() {
    if (!capturedPhoto) return;
    if (Object.values(photoPlace).some(value => !value.trim())) { toast.error(uiText('Enter building, floor and activity to group the photo.')); return; }
    if (capturedPhoto.geoFenceStatus !== 'INSIDE' && locationReason.trim().length < 10) { toast.error(uiText('Explain why this outside or uncertain location should be submitted.')); return; }
    const now = new Date().toISOString();
    try { addPhoto({
      projectId: project.id, stage: 'Structure', type: photoType, date: now.slice(0, 10),
      location: `${photoPlace.building.trim()} / ${photoPlace.floor.trim()}`, building: photoPlace.building.trim(), floor: photoPlace.floor.trim(), activity: photoPlace.activity.trim(), uploadedBy: currentUser?.name ?? 'Field User',
      uploadedByRole: currentUser?.role ?? 'DEPUTY_ENGINEER', description: photoPlace.activity.trim(),
      remarks: locationReason.trim() || undefined, seed: Math.floor(Math.random() * 99999), dataUrl: capturedPhoto.dataUrl, mediaKey: capturedPhoto.mediaKey,
      lat: capturedPhoto.lat, lng: capturedPhoto.lng, gpsAccuracyM: capturedPhoto.gpsAccuracyM,
      gpsCapturedAt: capturedPhoto.gpsCapturedAt, gpsAgeMs: capturedPhoto.gpsAgeMs, geoFenceStatus: capturedPhoto.geoFenceStatus,
      distanceFromSiteM: capturedPhoto.distanceFromSiteM, geoFenceRadiusM: capturedPhoto.geoFenceRadiusM,
      geoFenceShape: capturedPhoto.geoFenceShape, geoFenceBoundaryUpdatedAt: capturedPhoto.geoFenceBoundaryUpdatedAt,
      locationSource: 'CAPTURED',
      deviceInfo: navigator.userAgent.slice(0, 60), capturedAt: capturedPhoto.capturedAt, uploadedAt: now,
    });
    setCapturedPhoto(null); setLocationReason(''); setPhotoPlace({ building: '', floor: '', activity: '' });
    closeAndToast('Photo saved on this device with geotag. Central sync is pending.');
    } catch(e) { toast.error(uiText((e as Error).message)); }
  }

  if (!project) return <p className="p-6 text-sm text-slate-400">{uiText("No project assigned.")}</p>;

  return (
    <div className="field-workspace mx-auto max-w-3xl space-y-5 pb-10">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-950 to-blue-800 p-5 text-white">
        <h1 className="mb-2 text-2xl font-semibold">{uiText("Field workspace")}</h1><p className="mb-4 text-sm text-blue-100">{uiText("Capture evidence, record progress and resolve site work.")}</p>
        <p className="text-xs text-blue-100">{uiText(isContractor ? 'Contractor Dashboard' : 'Field Engineer App')}</p>
        <Select disabled={submitting} value={projectId} onValueChange={id => { discardCapturedPhoto(); setPhotoPlace({ building: '', floor: '', activity: '' }); setProjectId(id); setProgressFiles([]); setProgressPct(myProjects.find(p => p.id === id)?.reportedProgress ?? 0); setRemarks(''); setDefectDesc(''); setAction(null); }}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>{myProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
        {myProjects.length > 1 && <p className="mt-1 text-[10.5px] text-slate-400">{myProjects.length} {uiText("Assigned hospitals")}</p>}
      </div>

      <Card className="field-project">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-slate-800">{project.name}</p>
          <p className="text-xs text-slate-400">{uiText(project.taluka)}, {uiText(project.district)}</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <StatusBadge status={project.status} />
            <span className="font-medium text-slate-600">{project.physicalProgress}{uiText("% physical progress")}</span>
          </div>
        </CardContent>
      </Card>
      {localEvidenceCount > 0 && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">{localEvidenceCount} {uiText('captured photos await central synchronization. Originals remain on this device.')}</p>}

      <div className="field-shortcuts grid grid-cols-2 gap-3">
        <ActionButton icon={ClipboardList} label={uiText("Submit Progress")} onClick={() => { setProgressFiles([]); setProgressPct(project.reportedProgress); setAction('progress'); }} />
        {isContractor ? <>
          <ActionButton icon={ClipboardList} label={uiText('Daily site diary')} onClick={() => navigate(`/projects/${project.id}?tab=progress`)} />
          <ActionButton icon={CameraIcon} label={uiText('Capture Site Photo')} onClick={() => setAction('photo')} />
          <ActionButton icon={AlertTriangle} label={uiText('Manage Defects')} onClick={() => navigate(`/projects/${project.id}?tab=defects`)} tone="amber" />
          <ActionButton icon={QrCode} label={uiText('Mark Attendance')} onClick={() => setAction('attendance')} />
          <ActionButton icon={ClipboardList} label={uiText('Track Milestones')} onClick={() => navigate(`/projects/${project.id}?tab=milestones`)} />
          <ActionButton icon={ClipboardList} label={uiText('Progress History')} onClick={() => navigate(`/projects/${project.id}?tab=progress`)} />
          <ActionButton icon={ClipboardList} label={uiText('Track Bills & Payments')} onClick={() => navigate(`/projects/${project.id}?tab=finance`)} />
          <ActionButton icon={ClipboardList} label={uiText('Submit RA Bill')} onClick={() => navigate(`/projects/${project.id}?tab=finance&action=submit-bill`)} />
          <ActionButton icon={ClipboardList} label={uiText('Add Monthly Report')} onClick={() => navigate(`/projects/${project.id}?tab=monthly`)} />
          <ActionButton icon={ClipboardList} label={uiText('Submit Documents')} onClick={() => navigate(`/projects/${project.id}?tab=controls&kind=DOCUMENT`)} />
        </> : <>
        <ActionButton icon={CameraIcon} label={uiText("Capture Site Photo")} onClick={() => setAction('photo')} />
        <ActionButton icon={AlertTriangle} label={uiText("Report Defect")} onClick={() => setAction('defect')} tone="amber" />
        <ActionButton icon={ShieldCheck} label={uiText("Start Inspection")} onClick={() => navigate(`/projects/${project.id}?tab=inspections`)} />
        <ActionButton icon={QrCode} label={uiText("Mark Attendance")} onClick={() => setAction('attendance')} />
        <ActionButton icon={Siren} label={uiText("Emergency Alert")} onClick={() => setAction('emergency')} tone="red" />
        </>}
      </div>

      <Section title={uiText("Recent Site Photos")} onSeeAll={() => navigate(`/projects/${project.id}?tab=photos`)}>
        {recentSitePhotos.length === 0 && <EmptyLine text="No photos uploaded yet." />}
        <div className="site-photo-feed">
          {recentSitePhotos.map(ph => <article key={ph.id} className="site-photo-post">
            <div className="photo-post-author"><span aria-hidden="true">{ph.uploadedBy.slice(0,1)}</span><div><p>{ph.uploadedBy}</p><time dateTime={ph.capturedAt}>{formatDate(ph.capturedAt)}</time></div></div>
            <button type="button" className="photo-post-image" aria-label={uiText('View site photos')} onClick={() => navigate(`/projects/${project.id}?tab=photos`)}>
              <GeoPhoto src={photoSrc(ph)} mediaKey={ph.mediaKey} gpsAccuracyM={ph.gpsAccuracyM} locationSource={ph.locationSource} lat={ph.lat} lng={ph.lng} timestamp={ph.capturedAt} location={ph.location} className="h-72" imgClassName="object-contain bg-slate-100" />
            </button>
            <div className="photo-post-caption"><p>{ph.description}</p><span>{uiText(ph.stage)}</span></div>
          </article>)}
        </div>
      </Section>

      <Section title={uiText("Pending Inspections")} onSeeAll={() => navigate(`/projects/${project.id}?tab=inspections`)}>
        {pendingInspections.length === 0 && <EmptyLine text="No pending inspections." />}
        {pendingInspections.map((i) => (
          <button key={i.id} onClick={() => navigate(`/projects/${project.id}?tab=inspections`)} className="block w-full rounded-xl p-2 text-left hover:bg-blue-50"><Row primary={i.category.replace(/_/g, ' ')} secondary={`Scheduled ${formatDate(i.scheduledDate)} · ${i.inspector}`} /></button>
        ))}
      </Section>

      <Section title={uiText("Open Defects")} onSeeAll={() => navigate(`/projects/${project.id}?tab=defects`)}>
        {openDefects.length === 0 && <EmptyLine text="No open defects." />}
        {openDefects.slice(0, 5).map((d) => (
          <button key={d.id} onClick={() => navigate(`/projects/${project.id}?tab=defects`)} className="block w-full rounded-xl p-2 text-left hover:bg-blue-50"><Row primary={d.location} secondary={d.category.replace(/_/g, ' ')} badge={<StatusBadge status={d.status} />} /></button>
        ))}
      </Section>

      <Section title={uiText("Today's Workforce")}>
        <Row primary={`${projectWorkers.filter((w) => w.attendanceStatus === 'PRESENT').length} present`} secondary={`of ${projectWorkers.length} assigned workers`} />
      </Section>


      <Dialog open={action === 'progress'} onOpenChange={(v) => !v && !submitting && setAction(null)}>
        <DialogContent title={uiText("Submit Progress")}>
          <div className="space-y-3">
            <div><p className="mb-1 text-xs font-medium text-slate-600">{uiText("Overall Progress %")}</p><input type="number" min={0} max={100} value={progressPct} onChange={(e) => setProgressPct(+e.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm" /></div>
            <ProgressDocuments files={progressFiles} onChange={setProgressFiles} disabled={submitting} />
            <Textarea rows={2} placeholder={uiText("Remarks")} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
          <DialogFooter>
            <Button disabled={submitting} variant="outline" onClick={() => setAction(null)}>{uiText("Cancel")}</Button>
            <Button disabled={submitting || !progressFiles.length} onClick={async () => { if (submitting) return; setSubmitting(true); try {
              if (progressFiles.length > 5) throw new Error('Attach 1 to 5 supporting documents.');
              const account = useStore.getState().currentUser;
              const attachments = await saveBillFiles(progressFiles.map(file => ({ file, category: 'SUPPORTING' })));
              if (useStore.getState().currentUser !== account) throw new Error('Your account changed. Reopen the progress form.');
              await addProgressReport({ attachments, projectId: project.id, date: new Date().toISOString().slice(0, 10), stage: 'Structure', progressPct, workersPresent: projectWorkers.filter((w) => w.attendanceStatus === 'PRESENT').length, weather: 'Clear', materialsReceived: 'None', materialsUsed: 'None', issues: remarks || 'None reported', photoIds: [], videoCount: 0, submittedBy: currentUser?.name ?? 'Deputy Engineer', location: `${project.taluka}, ${project.district}`, timestamp: new Date().toISOString() });
              setProgressFiles([]); closeAndToast('Progress submitted.');
             } catch (error) { toast.error(uiText((error as Error).message)); } finally { setSubmitting(false); } }}>{uiText(submitting ? "Saving..." : "Submit")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === 'photo'} onOpenChange={(v) => { if (!v) { setAction(null); discardCapturedPhoto(); } }}>
        <DialogContent title={uiText("Capture Site Photo")}>
          <div className="space-y-3">
            {capturedPhoto ? (
              <>
                <GeoPhoto
                  src={capturedPhoto.dataUrl} mediaKey={capturedPhoto.mediaKey} lat={capturedPhoto.lat} lng={capturedPhoto.lng}
                  timestamp={capturedPhoto.capturedAt} location={`${project.taluka}, ${project.district}`}
                  className="h-56"
                />
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-400">
                    {uiText(capturedPhoto.gpsAccuracyM !== undefined ? `Live GPS · ±${capturedPhoto.gpsAccuracyM}m accuracy` : 'Location unavailable — using project site coordinates')}
                  </p>
                  <StatusBadge status={capturedPhoto.geoFenceStatus === 'INSIDE' ? 'APPROVED' : capturedPhoto.geoFenceStatus === 'OUTSIDE' ? 'REJECTED' : 'PENDING'} label={uiText(capturedPhoto.geoFenceStatus === 'INSIDE' ? 'Inside site boundary' : capturedPhoto.geoFenceStatus === 'OUTSIDE' ? 'Outside site boundary' : 'Location uncertain')} />
                </div>
                {capturedPhoto.geoFenceStatus !== 'INSIDE' && <label className="block text-xs font-medium text-amber-900">{uiText('Location exception reason')}<Textarea rows={2} value={locationReason} onChange={event => setLocationReason(event.target.value)} placeholder={uiText('Explain why evidence was captured outside or near the site boundary')}/></label>}
              </>
            ) : null}
            <label className="block text-sm">{uiText('Photo checkpoint')}<select className="mt-1 min-h-11 w-full rounded-lg border px-3" value={photoType} onChange={e=>setPhotoType(e.target.value as PhotoType)}><option value="BEFORE">{uiText('Start / baseline')}</option><option value="PROGRESS">{uiText('Midpoint / progress')}</option><option value="COMPLETION">{uiText('Completion')}</option></select></label>
            <div className="grid gap-2 sm:grid-cols-3">{(['building', 'floor', 'activity'] as const).map(key => <label key={key} className="block text-xs font-medium text-slate-700">{uiText(key)}<input className="mt-1 min-h-11 w-full rounded-lg border px-3" value={photoPlace[key]} onChange={event => setPhotoPlace(current => ({ ...current, [key]: event.target.value }))}/></label>)}</div>
            <SiteCamera project={project} onCapture={acceptCapturedPhoto} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAction(null); discardCapturedPhoto(); }}>{uiText("Cancel")}</Button>
            <Button onClick={uploadCapturedPhoto} disabled={!capturedPhoto || Object.values(photoPlace).some(value => !value.trim()) || (capturedPhoto.geoFenceStatus !== 'INSIDE' && locationReason.trim().length < 10)}>{uiText("Submit evidence")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === 'defect'} onOpenChange={(v) => !v && setAction(null)}>
        <DialogContent title={uiText("Report Defect")}>
          <Textarea rows={3} placeholder={uiText("Describe the defect…")} value={defectDesc} onChange={(e) => setDefectDesc(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>{uiText("Cancel")}</Button>
            <Button variant="destructive" onClick={() => {
              if (!defectDesc.trim()) { toast.error(uiText('Description required.')); return; }
              createDefect({ projectId: project.id, location: 'Site — field report', category: 'CIVIL', severity: 'MEDIUM', description: defectDesc, imageSeed: Math.floor(Math.random() * 99999), reportedBy: currentUser?.name ?? 'Deputy Engineer', contractorId: project.contractorId, dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) });
              closeAndToast('Defect reported.');
            }}>{uiText("Report")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === 'attendance'} onOpenChange={(v) => !v && setAction(null)}>
        <DialogContent title={uiText("Mark Attendance")}>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {projectWorkers.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-slate-50">
                <span className="text-xs text-slate-700">{w.name}</span>
                {w.attendanceStatus === 'PRESENT' ? <StatusBadge status="APPROVED" label={uiText("Present")} /> : <Button size="sm" variant="outline" onClick={() => { try {  markAttendance(w.id, project.id, 'QR'); toast.success(uiMessage("{{0}} checked in.", [w.name]));  } catch (error) { toast.error(uiText((error as Error).message)); } }}><QrCode size={11} />{uiText(" Check-in")}</Button>}
              </div>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAction(null)}>{uiText("Close")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === 'emergency'} onOpenChange={(v) => !v && setAction(null)}>
        <DialogContent title={uiText("Emergency Alert")} description={uiText("This will immediately notify the Executive Engineer and District Health Officer.")}>
          <Textarea rows={3} placeholder={uiText("Describe the emergency…")} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>{uiText("Cancel")}</Button>
            <Button variant="destructive" onClick={() => closeAndToast('Emergency alert sent to district authorities.')}><Siren size={13} />{uiText(" Send Alert")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, tone = 'default' }: { icon: any; label: string; onClick: () => void; tone?: 'default' | 'amber' | 'red' }) {
  useUiLanguage();
  const [selected, setSelected] = useState(false);
  const tones: Record<string, string> = { default: 'bg-white', amber: 'bg-amber-600', red: 'bg-red-600' };
  return (
    <button type="button" data-selected={selected} onBlur={() => setSelected(false)} onClick={() => { setSelected(true); onClick(); }} className={`field-action flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl ${tones[tone]} px-3 py-5 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-govblue-400 focus-visible:ring-offset-2`}>
      <Icon size={22} />
      <span className="text-center text-sm font-semibold leading-snug">{uiText(label)}</span>
    </button>
  );
}
function Section({ title, children, onSeeAll }: { title: string; children: React.ReactNode; onSeeAll?: () => void }) {
  useUiLanguage();
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{uiText(title)}</p>
          {onSeeAll && <button aria-label={title} onClick={onSeeAll} className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-navy-700"><ChevronRight size={20} /></button>}
        </div>
        <div className="space-y-1">{children}</div>
      </CardContent>
    </Card>
  );
}
function Row({ primary, secondary, badge }: { primary: string; secondary?: string; badge?: React.ReactNode }) {
  useUiLanguage();
  return (
    <div className="flex items-center justify-between py-1">
      <div><p className="text-xs font-medium text-slate-700">{uiText(primary)}</p>{secondary && <p className="text-[10.5px] text-slate-400">{uiText(secondary)}</p>}</div>
      {badge}
    </div>
  );
}
function EmptyLine({ text }: { text: string }) {
  useUiLanguage();
  return <p className="py-2 text-xs text-slate-400">{uiText(text)}</p>;
}
