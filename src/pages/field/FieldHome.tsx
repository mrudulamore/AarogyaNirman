import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Camera, ClipboardList, AlertTriangle, ShieldCheck, QrCode, Siren, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Card, CardContent, Button, StatusBadge, Textarea } from '../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogFooter } from '../../components/ui/overlays';
import { formatDate } from '../../lib/utils';
import { simulateCapture } from '../../lib/geo';

export function FieldHome() {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const projects = useStore((s) => s.projects);
  const inspections = useStore((s) => s.inspections);
  const defects = useStore((s) => s.defects);
  const workers = useStore((s) => s.workers);
  const addProgressReport = useStore((s) => s.addProgressReport);
  const addPhoto = useStore((s) => s.addPhoto);
  const createDefect = useStore((s) => s.createDefect);
  const markAttendance = useStore((s) => s.markAttendance);

  const myProjects = currentUser ? projects.filter((p) => currentUser.assignedProjectIds.includes(p.id)) : [];
  const [projectId, setProjectId] = useState(myProjects[0]?.id ?? projects[0]?.id ?? '');
  const project = projects.find((p) => p.id === projectId) ?? projects[0];

  const [action, setAction] = useState<null | 'progress' | 'photo' | 'defect' | 'inspection' | 'attendance' | 'emergency'>(null);
  const [progressPct, setProgressPct] = useState(project?.physicalProgress ?? 0);
  const [remarks, setRemarks] = useState('');
  const [defectDesc, setDefectDesc] = useState('');

  const pendingInspections = inspections.filter((i) => i.projectId === project?.id && i.status === 'SCHEDULED');
  const openDefects = defects.filter((d) => d.projectId === project?.id && d.status !== 'CLOSED');
  const projectWorkers = workers.filter((w) => w.projectId === project?.id);

  function closeAndToast(msg: string) { toast.success(msg); setAction(null); setRemarks(''); setDefectDesc(''); }

  if (!project) return <p className="p-6 text-sm text-slate-400">No project assigned.</p>;

  return (
    <div className="mx-auto max-w-md space-y-4 pb-10">
      <div>
        <p className="text-xs text-slate-400">Field Engineer App</p>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>{(myProjects.length ? myProjects : projects).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-slate-800">{project.name}</p>
          <p className="text-xs text-slate-400">{project.taluka}, {project.district}</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <StatusBadge status={project.status} />
            <span className="font-medium text-slate-600">{project.physicalProgress}% physical progress</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <ActionButton icon={ClipboardList} label="Submit Progress" onClick={() => setAction('progress')} />
        <ActionButton icon={Camera} label="Upload Site Photo" onClick={() => setAction('photo')} />
        <ActionButton icon={AlertTriangle} label="Report Defect" onClick={() => setAction('defect')} tone="amber" />
        <ActionButton icon={ShieldCheck} label="Start Inspection" onClick={() => navigate(`/projects/${project.id}?tab=inspections`)} />
        <ActionButton icon={QrCode} label="Mark Attendance" onClick={() => setAction('attendance')} />
        <ActionButton icon={Siren} label="Emergency Alert" onClick={() => setAction('emergency')} tone="red" />
      </div>

      <Section title="Pending Inspections" onSeeAll={() => navigate(`/projects/${project.id}?tab=inspections`)}>
        {pendingInspections.length === 0 && <EmptyLine text="No pending inspections." />}
        {pendingInspections.map((i) => (
          <Row key={i.id} primary={i.category.replace(/_/g, ' ')} secondary={`Scheduled ${formatDate(i.scheduledDate)} · ${i.inspector}`} />
        ))}
      </Section>

      <Section title="Open Defects" onSeeAll={() => navigate(`/projects/${project.id}?tab=defects`)}>
        {openDefects.length === 0 && <EmptyLine text="No open defects." />}
        {openDefects.slice(0, 5).map((d) => (
          <Row key={d.id} primary={d.location} secondary={d.category.replace(/_/g, ' ')} badge={<StatusBadge status={d.status} />} />
        ))}
      </Section>

      <Section title="Today's Workforce" onSeeAll={currentUser?.role === 'DEPUTY_ENGINEER' ? () => navigate('/workers') : undefined}>
        <Row primary={`${projectWorkers.filter((w) => w.attendanceStatus === 'PRESENT').length} present`} secondary={`of ${projectWorkers.length} assigned workers`} />
      </Section>

      <Dialog open={action === 'progress'} onOpenChange={(v) => !v && setAction(null)}>
        <DialogContent title="Submit Progress">
          <div className="space-y-3">
            <div><p className="mb-1 text-xs font-medium text-slate-600">Overall Progress %</p><input type="number" value={progressPct} onChange={(e) => setProgressPct(+e.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm" /></div>
            <Textarea rows={2} placeholder="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Cancel</Button>
            <Button onClick={() => {
              addProgressReport({ projectId: project.id, date: new Date().toISOString().slice(0, 10), stage: 'Structure', progressPct, workersPresent: projectWorkers.filter((w) => w.attendanceStatus === 'PRESENT').length, weather: 'Clear', materialsReceived: 'None', materialsUsed: 'None', issues: remarks || 'None reported', photoIds: [], videoCount: 0, submittedBy: currentUser?.name ?? 'Deputy Engineer', location: `${project.taluka}, ${project.district}`, timestamp: new Date().toISOString() });
              closeAndToast('Progress submitted.');
            }}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === 'photo'} onOpenChange={(v) => !v && setAction(null)}>
        <DialogContent title="Upload Site Photo">
          <div className="flex h-32 items-center justify-center rounded-md border-2 border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400"><Camera className="mr-2" size={18} /> Tap to capture (simulated)</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Cancel</Button>
            <Button onClick={() => {
              addPhoto({ projectId: project.id, stage: 'Structure', type: 'PROGRESS', date: new Date().toISOString().slice(0, 10), location: `${project.taluka}, ${project.district}`, uploadedBy: currentUser?.name ?? 'Deputy Engineer', uploadedByRole: currentUser?.role ?? 'DEPUTY_ENGINEER', description: 'Field-captured site photo', seed: Math.floor(Math.random() * 99999), ...simulateCapture(project) });
              closeAndToast('Photo uploaded with geotag.');
            }}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === 'defect'} onOpenChange={(v) => !v && setAction(null)}>
        <DialogContent title="Report Defect">
          <Textarea rows={3} placeholder="Describe the defect…" value={defectDesc} onChange={(e) => setDefectDesc(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (!defectDesc.trim()) { toast.error('Description required.'); return; }
              createDefect({ projectId: project.id, location: 'Site — field report', category: 'CIVIL', severity: 'MEDIUM', description: defectDesc, imageSeed: Math.floor(Math.random() * 99999), reportedBy: currentUser?.name ?? 'Deputy Engineer', contractorId: project.contractorId, dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) });
              closeAndToast('Defect reported.');
            }}>Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === 'attendance'} onOpenChange={(v) => !v && setAction(null)}>
        <DialogContent title="Mark Attendance">
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {projectWorkers.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-slate-50">
                <span className="text-xs text-slate-700">{w.name}</span>
                {w.attendanceStatus === 'PRESENT' ? <StatusBadge status="APPROVED" label="Present" /> : <Button size="sm" variant="outline" onClick={() => { markAttendance(w.id, project.id, 'QR'); toast.success(`${w.name} checked in.`); }}><QrCode size={11} /> Check-in</Button>}
              </div>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAction(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === 'emergency'} onOpenChange={(v) => !v && setAction(null)}>
        <DialogContent title="Emergency Alert" description="This will immediately notify the Executive Engineer and District Health Officer.">
          <Textarea rows={3} placeholder="Describe the emergency…" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => closeAndToast('Emergency alert sent to district authorities.')}><Siren size={13} /> Send Alert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, tone = 'default' }: { icon: any; label: string; onClick: () => void; tone?: 'default' | 'amber' | 'red' }) {
  const tones: Record<string, string> = { default: 'bg-navy-700 hover:bg-navy-800', amber: 'bg-amber-600 hover:bg-amber-700', red: 'bg-red-600 hover:bg-red-700' };
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-2 rounded-lg ${tones[tone]} px-3 py-5 text-white shadow-sm transition-colors`}>
      <Icon size={22} />
      <span className="text-center text-xs font-medium leading-tight">{label}</span>
    </button>
  );
}
function Section({ title, children, onSeeAll }: { title: string; children: React.ReactNode; onSeeAll?: () => void }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          {onSeeAll && <button onClick={onSeeAll} className="flex items-center text-[11px] text-navy-700"><ChevronRight size={13} /></button>}
        </div>
        <div className="space-y-1">{children}</div>
      </CardContent>
    </Card>
  );
}
function Row({ primary, secondary, badge }: { primary: string; secondary?: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div><p className="text-xs font-medium text-slate-700">{primary}</p>{secondary && <p className="text-[10.5px] text-slate-400">{secondary}</p>}</div>
      {badge}
    </div>
  );
}
function EmptyLine({ text }: { text: string }) {
  return <p className="py-2 text-xs text-slate-400">{text}</p>;
}
