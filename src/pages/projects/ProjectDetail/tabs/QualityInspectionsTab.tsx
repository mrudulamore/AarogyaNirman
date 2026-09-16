import { useState } from 'react';
import { toast } from 'sonner';
import { CalendarPlus, ClipboardCheck, ShieldCheck, ShieldAlert, RefreshCw, FileWarning, FileBarChart2, Download } from 'lucide-react';
import type { Project, ChecklistItem, InspectionCategory, InspectionResult } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardContent, CardHeader, CardTitle, Button, StatusBadge, SeverityBadge, Table, THead, TBody, Tr, Th, Td, EmptyState } from '../../../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Dialog, DialogContent, DialogFooter } from '../../../../components/ui/overlays';
import { KpiCard } from '../../../../components/common/KpiCard';
import { Textarea } from '../../../../components/ui/primitives';
import { INSPECTION_CATEGORIES } from '../../../../lib/constants';
import { CHECKLIST_REQUIREMENTS, CHECKLIST_STANDARDS } from '../../../../lib/checklists';
import { formatDate } from '../../../../lib/utils';
import { downloadDocumentRecord } from '../../../../lib/pdf';

export function QualityTab({ project }: { project: Project }) {
  const inspections = useStore((s) => s.inspections).filter((i) => i.projectId === project.id);
  const completed = inspections.filter((i) => i.status === 'COMPLETED');
  const passed = completed.filter((i) => i.overallResult === 'PASS').length;
  const conditional = completed.filter((i) => i.overallResult === 'CONDITIONAL').length;
  const failed = completed.filter((i) => i.overallResult === 'FAIL').length;
  const qualityFailures = useStore((s) => s.qualityFailures).filter((f) => f.projectId === project.id);
  const qualityReports = useStore((s) => s.qualityReports).filter((r) => r.projectId === project.id);
  const reinspectionPending = qualityFailures.filter((f) => f.reinspectionStatus === 'PENDING' || f.reinspectionStatus === 'SCHEDULED').length;
  const reportsPending = qualityReports.filter((r) => r.status === 'PENDING').length;
  const [activeFailureId, setActiveFailureId] = useState<string | null>(null);
  const activeFailure = qualityFailures.find((f) => f.id === activeFailureId);
  const contractors = useStore((s) => s.contractors);

  const byCategory = INSPECTION_CATEGORIES.map((cat) => {
    const catInspections = completed.filter((i) => i.category === cat);
    const latest = catInspections[0];
    return { cat, latest, count: catInspections.length };
  }).filter((x) => x.count > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <KpiCard label="Total Inspections" value={inspections.length} icon={ClipboardCheck} />
        <KpiCard label="Passed" value={passed} icon={ShieldCheck} tone="emerald" />
        <KpiCard label="Conditional Pass" value={conditional} icon={ShieldAlert} tone="amber" />
        <KpiCard label="Failed" value={failed} icon={ShieldAlert} tone="red" />
        <KpiCard label="Critical Failures" value={qualityFailures.filter((f) => f.severity === 'CRITICAL').length} icon={FileWarning} tone="red" />
        <KpiCard label="Reinspection Pending" value={reinspectionPending} icon={RefreshCw} tone="amber" />
        <KpiCard label="Quality Score" value={`${project.qualityScore}%`} icon={ShieldCheck} />
        <KpiCard label="Reports Pending" value={reportsPending} icon={FileBarChart2} tone={reportsPending > 0 ? 'amber' : 'default'} />
      </div>

      {qualityFailures.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileWarning size={15} /> Critical Quality Failures</CardTitle></CardHeader>
          <Table>
            <THead><Tr><Th>Failure ID</Th><Th>Location</Th><Th>Category</Th><Th>Severity</Th><Th>Inspection Date</Th><Th>Reinspection</Th></Tr></THead>
            <TBody>
              {qualityFailures.map((f) => (
                <Tr key={f.id} onClick={() => setActiveFailureId(f.id)}>
                  <Td className="font-mono text-[11px] text-slate-500">{f.id}</Td>
                  <Td>{f.location}</Td>
                  <Td>{f.category.replace(/_/g, ' ')}</Td>
                  <Td><SeverityBadge severity={f.severity} /></Td>
                  <Td>{formatDate(f.inspectionDate)}</Td>
                  <Td><StatusBadge status={f.reinspectionStatus} /></Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Category Breakdown</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {byCategory.map(({ cat, latest }) => (
            <div key={cat} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">{cat.replace(/_/g, ' ')}</p>
                <StatusBadge status={latest.overallResult} />
              </div>
              <p className="mt-1 text-[10.5px] text-slate-400">Last inspected {formatDate(latest.completedDate)} by {latest.inspector}</p>
              <p className="mt-1 text-[11px] font-medium text-slate-600">Score: {latest.score}%</p>
            </div>
          ))}
          {byCategory.length === 0 && <p className="col-span-full py-8 text-center text-xs text-slate-400">No inspections completed yet.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileBarChart2 size={15} /> Quality Reports</CardTitle></CardHeader>
        {qualityReports.length === 0 ? <EmptyState title="No quality reports filed for this project" /> : (
          <Table>
            <THead><Tr><Th>Report No.</Th><Th>Type</Th><Th>Date</Th><Th>Inspector</Th><Th>Agency</Th><Th>Test Type</Th><Th>Status</Th><Th /></Tr></THead>
            <TBody>
              {qualityReports.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-mono text-[11px] text-slate-500">{r.reportNo}</Td>
                  <Td>{r.reportType}</Td>
                  <Td>{formatDate(r.date)}</Td>
                  <Td>{r.inspector}</Td>
                  <Td className="max-w-[160px] truncate">{r.agency}</Td>
                  <Td>{r.testType}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                  <Td>
                    <Button size="sm" variant="ghost" onClick={() => {
                      downloadDocumentRecord({
                        heading: `${r.reportType} — ${r.reportNo}`, filename: `${r.reportNo.replace(/\//g, '_')}.pdf`,
                        fields: [
                          { label: 'Report No.', value: r.reportNo }, { label: 'Type', value: r.reportType },
                          { label: 'Date', value: formatDate(r.date) }, { label: 'Inspector', value: r.inspector },
                          { label: 'Agency', value: r.agency }, { label: 'Test Type', value: r.testType },
                          { label: 'Status', value: r.status }, { label: 'Observations', value: r.observations },
                        ],
                      });
                    }}><Download size={12} /></Button>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!activeFailureId} onOpenChange={(v) => !v && setActiveFailureId(null)}>
        {activeFailure && (
          <DialogContent title={`Quality Failure ${activeFailure.id}`} description={activeFailure.location} size="lg">
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2"><SeverityBadge severity={activeFailure.severity} /><StatusBadge status={activeFailure.reinspectionStatus} /></div>
              <Row label="Category" value={activeFailure.category.replace(/_/g, ' ')} />
              <Row label="Inspector" value={activeFailure.inspector} />
              <Row label="Inspection Date" value={formatDate(activeFailure.inspectionDate)} />
              <Row label="Assigned Contractor" value={contractors.find((c) => c.id === activeFailure.assignedContractorId)?.company ?? '—'} />
              <Row label="Target Closure" value={formatDate(activeFailure.targetClosure)} />
              <div className="rounded-md bg-slate-50 p-2.5">
                <p className="font-semibold text-slate-600">Failure Description</p>
                <p className="mt-1 text-slate-600">{activeFailure.description}</p>
              </div>
              <div className="rounded-md bg-red-50 p-2.5">
                <p className="font-semibold text-red-700">Possible Impact</p>
                <p className="mt-1 text-red-700">{activeFailure.possibleImpact}</p>
              </div>
              <div className="rounded-md bg-amber-50 p-2.5">
                <p className="font-semibold text-amber-700">Required Corrective Action</p>
                <p className="mt-1 text-amber-700">{activeFailure.requiredAction}</p>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between border-b border-slate-50 pb-1.5"><span className="text-slate-400">{label}</span><span className="font-medium text-slate-700">{value}</span></div>;
}

// Part 15 permission matrix — the label AND availability of the scheduling action both depend
// on role, rather than one button being manually hidden per page.
const APPOINTMENT_ACTION_LABEL: Partial<Record<string, string>> = {
  CONTRACTOR: 'Request Inspection',
  DEPUTY_ENGINEER: 'Propose Appointment',
  EXECUTIVE_ENGINEER: 'Schedule Inspection',
};

export function InspectionsTab({ project }: { project: Project }) {
  const currentUser = useStore((s) => s.currentUser);
  const inspections = useStore((s) => s.inspections).filter((i) => i.projectId === project.id).sort((a, b) => (a.scheduledDate < b.scheduledDate ? 1 : -1));
  const defects = useStore((s) => s.defects).filter((d) => d.projectId === project.id);
  const appointments = useStore((s) => s.inspectionAppointments).filter((a) => a.projectId === project.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const requestAppointment = useStore((s) => s.requestAppointment);
  const scheduleAppointment = useStore((s) => s.scheduleAppointment);
  const cancelAppointment = useStore((s) => s.cancelAppointment);
  const canSchedule = currentUser?.role === 'EXECUTIVE_ENGINEER';
  const canRequest = currentUser?.role === 'CONTRACTOR' || currentUser?.role === 'DEPUTY_ENGINEER';
  const canConduct = currentUser?.role === 'DEPUTY_ENGINEER' || currentUser?.role === 'EXECUTIVE_ENGINEER';
  const appointmentActionLabel = currentUser ? (APPOINTMENT_ACTION_LABEL[currentUser.role] ?? 'Schedule Inspection') : 'Schedule Inspection';
  const [scheduleTargetId, setScheduleTargetId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const users = useStore((s) => s.users).filter((u) => u.role === 'DEPUTY_ENGINEER');
  const scheduleInspection = useStore((s) => s.scheduleInspection);
  const submitInspection = useStore((s) => s.submitInspection);
  const reinspect = useStore((s) => s.reinspect);
  const passReinspection = useStore((s) => s.passReinspection);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [schedForm, setSchedForm] = useState({ category: INSPECTION_CATEGORIES[0] as InspectionCategory, date: new Date().toISOString().slice(0, 10), inspector: users[0]?.name ?? 'Deputy Engineer' });
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [comments, setComments] = useState('');

  const active = inspections.find((i) => i.id === checklistId);

  function openChecklist(insp: { id: string; category: InspectionCategory; items: ChecklistItem[]; comments: string }) {
    const reqs = CHECKLIST_REQUIREMENTS[insp.category];
    setItems(insp.items.length ? insp.items : reqs.map((r, idx) => ({
      id: `chk-${idx}`, requirement: r, measurement: 'Within tolerance', standard: CHECKLIST_STANDARDS[insp.category], result: 'PASS', evidence: 'Photo & instrument reading logged', remarks: '',
    })));
    setComments(insp.comments);
    setChecklistId(insp.id);
  }

  function submit() {
    const anyFail = items.some((i) => i.result === 'FAIL');
    const anyConditional = items.some((i) => i.result === 'CONDITIONAL');
    const result: InspectionResult = anyFail ? 'FAIL' : anyConditional ? 'CONDITIONAL' : 'PASS';
    submitInspection(checklistId!, items, result, comments);
    toast[result === 'FAIL' ? 'error' : 'success'](result === 'FAIL' ? 'Inspection marked FAIL — a defect has been created automatically.' : `Inspection marked ${result}.`);
    setChecklistId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {(canSchedule || canRequest) && <Button onClick={() => setScheduleOpen(true)}><CalendarPlus size={15} /> {appointmentActionLabel}</Button>}
      </div>

      {appointments.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Inspection Appointments</CardTitle></CardHeader>
          <Table>
            <THead><Tr><Th>Type</Th><Th>Requested By</Th><Th>Inspector</Th><Th>Date</Th><Th>Time</Th><Th>Status</Th><Th /></Tr></THead>
            <TBody>
              {appointments.map((a) => (
                <Tr key={a.id}>
                  <Td className="font-medium text-slate-800">{a.inspectionType.replace(/_/g, ' ')}</Td>
                  <Td>{a.requestedBy}</Td>
                  <Td>{a.assignedInspector ?? '—'}</Td>
                  <Td>{formatDate(a.date)}</Td>
                  <Td>{a.time}</Td>
                  <Td><StatusBadge status={a.status} /></Td>
                  <Td className="space-x-1.5 whitespace-nowrap">
                    {canSchedule && (a.status === 'REQUESTED' || a.status === 'RESCHEDULED') && (
                      <Button size="sm" variant="outline" onClick={() => { setScheduleTargetId(a.id); setScheduleDate(a.date); setScheduleTime(a.time); }}>Schedule</Button>
                    )}
                    {canSchedule && a.status !== 'CANCELLED' && a.status !== 'COMPLETED' && (
                      <Button size="sm" variant="destructive" onClick={() => { cancelAppointment(a.id, 'Cancelled by Executive Engineer.'); toast.error('Appointment cancelled.'); }}>Cancel</Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      <Card>
        <Table>
          <THead><Tr><Th>Category</Th><Th>Scheduled</Th><Th>Inspector</Th><Th>Status</Th><Th>Result</Th><Th>Score</Th><Th /></Tr></THead>
          <TBody>
            {inspections.map((insp) => {
              const canReinspectSource = insp.overallResult === 'FAIL' && defects.find((d) => d.sourceInspectionId === insp.id && d.status === 'FIXED');
              return (
                <Tr key={insp.id}>
                  <Td className="font-medium text-slate-800">{insp.isReinspection && <RefreshCw size={11} className="mr-1 inline text-purple-500" />}{insp.category.replace(/_/g, ' ')}</Td>
                  <Td>{formatDate(insp.scheduledDate)}</Td>
                  <Td>{insp.inspector}</Td>
                  <Td><StatusBadge status={insp.status} /></Td>
                  <Td><StatusBadge status={insp.overallResult} /></Td>
                  <Td>{insp.status === 'COMPLETED' ? `${insp.score}%` : '—'}</Td>
                  <Td className="space-x-1.5 whitespace-nowrap">
                    {canConduct && insp.status !== 'COMPLETED' && <Button size="sm" variant="outline" onClick={() => openChecklist(insp)}><ClipboardCheck size={12} /> {insp.isReinspection ? 'Submit Result' : 'Start Inspection'}</Button>}
                    {canConduct && canReinspectSource && (
                      <Button size="sm" onClick={() => { const r = reinspect(canReinspectSource.id); toast.success('Re-inspection started.'); openChecklist(r); }}>
                        <RefreshCw size={12} /> Re-inspect
                      </Button>
                    )}
                    {!canConduct && insp.status === 'COMPLETED' && <span className="text-[11px] text-slate-400">View only</span>}
                  </Td>
                </Tr>
              );
            })}
            {inspections.length === 0 && <Tr><Td className="py-8 text-center text-slate-400"><span>No inspections recorded.</span></Td></Tr>}
          </TBody>
        </Table>
      </Card>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent title={appointmentActionLabel} description={project.name}>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Inspection Type</p>
              <Select value={schedForm.category} onValueChange={(v) => setSchedForm({ ...schedForm, category: v as InspectionCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INSPECTION_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">{canSchedule ? 'Scheduled Date' : 'Preferred Date'}</p>
              <input type="date" value={schedForm.date} onChange={(e) => setSchedForm({ ...schedForm, date: e.target.value })} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm" />
            </div>
            {canSchedule && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-600">Inspector</p>
                <Select value={schedForm.inspector} onValueChange={(v) => setSchedForm({ ...schedForm, inspector: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (canSchedule) {
                scheduleInspection({ projectId: project.id, category: schedForm.category, scheduledDate: schedForm.date, inspector: schedForm.inspector, comments: '' });
                requestAppointment({ projectId: project.id, inspectionType: schedForm.category, requestedBy: currentUser?.name ?? 'Executive Engineer', requestedByRole: currentUser?.role ?? 'EXECUTIVE_ENGINEER', assignedInspector: schedForm.inspector, date: schedForm.date, time: '10:00', site: `${project.taluka}, ${project.district}`, attendees: [], requiredDocuments: [], remarks: '' });
                toast.success('Inspection scheduled.');
              } else {
                requestAppointment({ projectId: project.id, inspectionType: schedForm.category, requestedBy: currentUser?.name ?? 'Field Team', requestedByRole: currentUser?.role ?? 'CONTRACTOR', date: schedForm.date, time: '10:00', site: `${project.taluka}, ${project.district}`, attendees: [], requiredDocuments: [], remarks: '' });
                toast.success('Inspection appointment requested — awaiting scheduling by Executive Engineer.');
              }
              setScheduleOpen(false);
            }}>{canSchedule ? 'Schedule' : 'Submit Request'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!scheduleTargetId} onOpenChange={(v) => !v && setScheduleTargetId(null)}>
        <DialogContent title="Confirm Appointment" description={project.name}>
          <div className="space-y-3">
            <div><p className="mb-1 text-xs font-medium text-slate-600">Date</p><input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm" /></div>
            <div><p className="mb-1 text-xs font-medium text-slate-600">Time</p><input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm" /></div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Inspector</p>
              <Select value={schedForm.inspector} onValueChange={(v) => setSchedForm({ ...schedForm, inspector: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleTargetId(null)}>Cancel</Button>
            <Button onClick={() => {
              if (scheduleTargetId) scheduleAppointment(scheduleTargetId, scheduleDate, scheduleTime, schedForm.inspector);
              toast.success('Appointment confirmed.'); setScheduleTargetId(null);
            }}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!checklistId} onOpenChange={(v) => !v && setChecklistId(null)}>
        {active && (
          <DialogContent title={`${active.category.replace(/_/g, ' ')} Inspection Checklist`} description={project.name} size="lg">
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={it.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-700">{it.requirement}</p>
                    <Select value={it.result} onValueChange={(v) => setItems(items.map((x, i2) => i2 === idx ? { ...x, result: v as ChecklistItem['result'] } : x))}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PASS">PASS</SelectItem>
                        <SelectItem value="FAIL">FAIL</SelectItem>
                        <SelectItem value="CONDITIONAL">CONDITIONAL</SelectItem>
                        <SelectItem value="NOT_INSPECTED">NOT INSPECTED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="mt-1 text-[10.5px] text-slate-400">Standard: {it.standard} · Evidence: {it.evidence}</p>
                </div>
              ))}
              <div>
                <p className="mb-1 text-xs font-medium text-slate-600">Inspector Comments</p>
                <Textarea rows={2} value={comments} onChange={(e) => setComments(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setChecklistId(null)}>Cancel</Button>
              {active.isReinspection ? (
                <Button variant="success" onClick={() => { passReinspection(active.id); toast.success('Re-inspection PASSED. Defect closed and project progress updated.'); setChecklistId(null); }}>
                  <ShieldCheck size={14} /> Confirm PASS
                </Button>
              ) : (
                <Button onClick={submit}><ShieldAlert size={14} /> Submit Result</Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
