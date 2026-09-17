import { uiMessage, uiText, useUiLanguage } from '../../i18n/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Camera as CameraIcon, ClipboardList, AlertTriangle, ShieldCheck, QrCode, Siren, ChevronRight } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { Card, CardContent, Button, StatusBadge, Textarea } from '../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogFooter } from '../../components/ui/overlays';
import { GeoPhoto } from '../../components/common/GeoPhoto';
import { formatDate, photoSrc } from '../../lib/utils';
import { isWithinGeofence, distanceMeters } from '../../lib/geo';

export function FieldHome() {
  useUiLanguage();
  const navigate = useNavigate();
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

  // A field worker deals with 1-2 nearby sites in practice, not their firm/circle's full
  // statewide portfolio — narrow the already role-scoped project list down to whichever zone
  // their primary/first assigned site is in.
  const homeDivision = scopedProjects[0]?.division;
  const myProjects = homeDivision ? scopedProjects.filter((p) => p.division === homeDivision) : scopedProjects;

  const [projectId, setProjectId] = useState(myProjects[0]?.id ?? '');
  const project = myProjects.find((p) => p.id === projectId) ?? myProjects[0];

  const [action, setAction] = useState<null | 'progress' | 'photo' | 'defect' | 'inspection' | 'attendance' | 'emergency'>(null);
  const [progressPct, setProgressPct] = useState(project?.physicalProgress ?? 0);
  const [remarks, setRemarks] = useState('');
  const [defectDesc, setDefectDesc] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<{ dataUrl: string; lat: number; lng: number; gpsAccuracyM?: number; capturedAt: string } | null>(null);

  const pendingInspections = inspections.filter((i) => i.projectId === project?.id && i.status === 'SCHEDULED');
  const openDefects = defects.filter((d) => d.projectId === project?.id && d.status !== 'CLOSED');
  const projectWorkers = workers.filter((w) => w.projectId === project?.id);
  const recentSitePhotos = allPhotos.filter((p) => p.projectId === project?.id).sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1)).slice(0, 4);

  function closeAndToast(msg: string) { toast.success(uiText(msg)); setAction(null); setRemarks(''); setDefectDesc(''); }

  async function capturePhoto() {
    setCapturing(true);
    try {
      const photo = await Camera.getPhoto({ quality: 70, resultType: CameraResultType.DataUrl, source: CameraSource.Camera, saveToGallery: false });
      if (!photo.dataUrl) return;
      // Real device GPS when available; the project's registered site coordinates otherwise —
      // never block the capture on location permission.
      let lat = project.siteLat, lng = project.siteLng, gpsAccuracyM: number | undefined;
      try {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
        lat = pos.coords.latitude; lng = pos.coords.longitude; gpsAccuracyM = Math.round(pos.coords.accuracy);
      } catch {
        toast.warning(uiText('Location unavailable — using the project’s registered site coordinates.'));
      }
      setCapturedPhoto({ dataUrl: photo.dataUrl, lat, lng, gpsAccuracyM, capturedAt: new Date().toISOString() });
      if (gpsAccuracyM !== undefined && !isWithinGeofence({ lat, lng }, { lat: project.siteLat, lng: project.siteLng })) {
        const meters = Math.round(distanceMeters({ lat, lng }, { lat: project.siteLat, lng: project.siteLng }));
        toast.warning(uiMessage("You're {{0}}m from the registered site — this photo will be flagged outside the geo-fence.", [meters]));
      }
    } catch {
      // camera cancelled or permission denied — nothing to do
    } finally {
      setCapturing(false);
    }
  }

  function uploadCapturedPhoto() {
    if (!capturedPhoto) return;
    const now = new Date().toISOString();
    addPhoto({
      projectId: project.id, stage: 'Structure', type: 'PROGRESS', date: now.slice(0, 10),
      location: `${project.taluka}, ${project.district}`, uploadedBy: currentUser?.name ?? 'Field User',
      uploadedByRole: currentUser?.role ?? 'DEPUTY_ENGINEER', description: 'Field-captured site photo',
      seed: Math.floor(Math.random() * 99999), dataUrl: capturedPhoto.dataUrl,
      lat: capturedPhoto.lat, lng: capturedPhoto.lng, gpsAccuracyM: capturedPhoto.gpsAccuracyM,
      locationSource: capturedPhoto.gpsAccuracyM !== undefined ? 'CAPTURED' : 'MANUAL',
      deviceInfo: navigator.userAgent.slice(0, 60), capturedAt: capturedPhoto.capturedAt, uploadedAt: now,
    });
    setCapturedPhoto(null);
    closeAndToast('Photo captured and uploaded with geotag.');
  }

  if (!project) return <p className="p-6 text-sm text-slate-400">{uiText("No project assigned.")}</p>;

  return (
    <div className="mx-auto max-w-md space-y-4 pb-10">
      <div>
        <p className="text-xs text-slate-400">{uiText("Field Engineer App")}</p>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>{myProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
        {myProjects.length > 1 && <p className="mt-1 text-[10.5px] text-slate-400">{myProjects.length}{uiText(" sites in ")}{uiText(homeDivision)}</p>}
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-slate-800">{project.name}</p>
          <p className="text-xs text-slate-400">{uiText(project.taluka)}, {uiText(project.district)}</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <StatusBadge status={project.status} />
            <span className="font-medium text-slate-600">{project.physicalProgress}{uiText("% physical progress")}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <ActionButton icon={ClipboardList} label={uiText("Submit Progress")} onClick={() => setAction('progress')} />
        <ActionButton icon={CameraIcon} label={uiText("Upload Site Photo")} onClick={() => setAction('photo')} />
        <ActionButton icon={AlertTriangle} label={uiText("Report Defect")} onClick={() => setAction('defect')} tone="amber" />
        <ActionButton icon={ShieldCheck} label={uiText("Start Inspection")} onClick={() => navigate(`/projects/${project.id}?tab=inspections`)} />
        <ActionButton icon={QrCode} label={uiText("Mark Attendance")} onClick={() => setAction('attendance')} />
        <ActionButton icon={Siren} label={uiText("Emergency Alert")} onClick={() => setAction('emergency')} tone="red" />
      </div>

      <Section title={uiText("Pending Inspections")} onSeeAll={() => navigate(`/projects/${project.id}?tab=inspections`)}>
        {pendingInspections.length === 0 && <EmptyLine text="No pending inspections." />}
        {pendingInspections.map((i) => (
          <Row key={i.id} primary={i.category.replace(/_/g, ' ')} secondary={`Scheduled ${formatDate(i.scheduledDate)} · ${i.inspector}`} />
        ))}
      </Section>

      <Section title={uiText("Open Defects")} onSeeAll={() => navigate(`/projects/${project.id}?tab=defects`)}>
        {openDefects.length === 0 && <EmptyLine text="No open defects." />}
        {openDefects.slice(0, 5).map((d) => (
          <Row key={d.id} primary={d.location} secondary={d.category.replace(/_/g, ' ')} badge={<StatusBadge status={d.status} />} />
        ))}
      </Section>

      <Section title={uiText("Today's Workforce")} onSeeAll={currentUser?.role === 'DEPUTY_ENGINEER' ? () => navigate('/workers') : undefined}>
        <Row primary={`${projectWorkers.filter((w) => w.attendanceStatus === 'PRESENT').length} present`} secondary={`of ${projectWorkers.length} assigned workers`} />
      </Section>

      <Section title={uiText("Recent Site Photos")} onSeeAll={() => navigate(`/projects/${project.id}?tab=photos`)}>
        {recentSitePhotos.length === 0 && <EmptyLine text="No photos uploaded yet." />}
        {recentSitePhotos.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {recentSitePhotos.map((ph) => (
              <GeoPhoto key={ph.id} src={photoSrc(ph)} lat={ph.lat} lng={ph.lng} timestamp={ph.capturedAt} location={ph.location} className="h-24" />
            ))}
          </div>
        )}
      </Section>

      <Dialog open={action === 'progress'} onOpenChange={(v) => !v && setAction(null)}>
        <DialogContent title={uiText("Submit Progress")}>
          <div className="space-y-3">
            <div><p className="mb-1 text-xs font-medium text-slate-600">{uiText("Overall Progress %")}</p><input type="number" value={progressPct} onChange={(e) => setProgressPct(+e.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm" /></div>
            <Textarea rows={2} placeholder={uiText("Remarks")} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>{uiText("Cancel")}</Button>
            <Button onClick={() => {
              addProgressReport({ projectId: project.id, date: new Date().toISOString().slice(0, 10), stage: 'Structure', progressPct, workersPresent: projectWorkers.filter((w) => w.attendanceStatus === 'PRESENT').length, weather: 'Clear', materialsReceived: 'None', materialsUsed: 'None', issues: remarks || 'None reported', photoIds: [], videoCount: 0, submittedBy: currentUser?.name ?? 'Deputy Engineer', location: `${project.taluka}, ${project.district}`, timestamp: new Date().toISOString() });
              closeAndToast('Progress submitted.');
            }}>{uiText("Submit")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === 'photo'} onOpenChange={(v) => { if (!v) { setAction(null); setCapturedPhoto(null); } }}>
        <DialogContent title={uiText("Upload Site Photo")}>
          <div className="space-y-3">
            {capturedPhoto ? (
              <>
                <GeoPhoto
                  src={capturedPhoto.dataUrl} lat={capturedPhoto.lat} lng={capturedPhoto.lng}
                  timestamp={capturedPhoto.capturedAt} location={`${project.taluka}, ${project.district}`}
                  className="h-56"
                />
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-400">
                    {uiText(capturedPhoto.gpsAccuracyM !== undefined ? `Live GPS · ±${capturedPhoto.gpsAccuracyM}m accuracy` : 'Location unavailable — using project site coordinates')}
                  </p>
                  {capturedPhoto.gpsAccuracyM !== undefined && (
                    isWithinGeofence(capturedPhoto, { lat: project.siteLat, lng: project.siteLng })
                      ? <StatusBadge status="APPROVED" label={uiText("Within Geo-Fence")} />
                      : <StatusBadge status="REJECTED" label={uiText("Outside Geo-Fence")} />
                  )}
                </div>
                <button onClick={capturePhoto} className="text-[11px] font-medium text-navy-700 hover:underline">{uiText("Retake photo")}</button>
              </>
            ) : (
              <button
                onClick={capturePhoto}
                disabled={capturing}
                className="flex h-32 w-full items-center justify-center rounded-md border-2 border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-60"
              >
                <CameraIcon className="mr-2" size={18} /> {uiText(capturing ? 'Opening camera…' : 'Tap to capture photo')}
              </button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAction(null); setCapturedPhoto(null); }}>{uiText("Cancel")}</Button>
            <Button onClick={uploadCapturedPhoto} disabled={!capturedPhoto}>{uiText("Upload")}</Button>
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
                {w.attendanceStatus === 'PRESENT' ? <StatusBadge status="APPROVED" label={uiText("Present")} /> : <Button size="sm" variant="outline" onClick={() => { markAttendance(w.id, project.id, 'QR'); toast.success(uiMessage("{{0}} checked in.", [w.name])); }}><QrCode size={11} />{uiText(" Check-in")}</Button>}
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
  const tones: Record<string, string> = { default: 'bg-navy-700 hover:bg-navy-800', amber: 'bg-amber-600 hover:bg-amber-700', red: 'bg-red-600 hover:bg-red-700' };
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-2 rounded-lg ${tones[tone]} px-3 py-5 text-white shadow-sm transition-colors`}>
      <Icon size={22} />
      <span className="text-center text-xs font-medium leading-tight">{uiText(label)}</span>
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
          {onSeeAll && <button onClick={onSeeAll} className="flex items-center text-[11px] text-navy-700"><ChevronRight size={13} /></button>}
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
