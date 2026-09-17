import { uiMessage, uiText, useUiLanguage } from '../../../../i18n/ui';
import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Camera, UserCheck, Wrench, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Project, DefectSeverity, InspectionCategory } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, Button, StatusBadge, SeverityBadge, Table, THead, TBody, Tr, Th, Td, Textarea, Input, EmptyState } from '../../../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Dialog, DialogContent, DialogFooter } from '../../../../components/ui/overlays';
import { INSPECTION_CATEGORIES, DEFECT_STATUS_LABELS } from '../../../../lib/constants';
import { formatDate, seededImageUrl } from '../../../../lib/utils';

const SEVERITIES: DefectSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

function ageingDays(dateIso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(dateIso).getTime()) / 86400000));
}

export function DefectsTab({ project }: { project: Project }) {
  useUiLanguage();
  const defects = useStore((s) => s.defects).filter((d) => d.projectId === project.id).sort((a, b) => (a.createdDate < b.createdDate ? 1 : -1));
  const contractors = useStore((s) => s.contractors);
  const contractorPocs = useStore((s) => s.contractorPocs);
  const users = useStore((s) => s.users);
  const currentUser = useStore((s) => s.currentUser);
  const createDefect = useStore((s) => s.createDefect);
  const assignDefect = useStore((s) => s.assignDefect);
  const acknowledgeDefect = useStore((s) => s.acknowledgeDefect);
  const updateDefectStatus = useStore((s) => s.updateDefectStatus);
  const addCorrectiveAction = useStore((s) => s.addCorrectiveAction);
  const closeDefect = useStore((s) => s.closeDefect);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [correctiveOpen, setCorrectiveOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [assignPocId, setAssignPocId] = useState<string>('');
  const [form, setForm] = useState({ location: '', category: INSPECTION_CATEGORIES[0] as InspectionCategory, severity: 'MEDIUM' as DefectSeverity, description: '', dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) });

  const active = defects.find((d) => d.id === detailId);
  const overdueCount = defects.filter((d) => d.status !== 'CLOSED' && new Date(d.dueDate) < new Date()).length;
  const projectPocs = contractorPocs.filter((poc) => poc.contractorId === project.contractorId);
  const isContractor = currentUser?.role === 'CONTRACTOR';
  const readOnly = currentUser?.role === 'MINISTER' || currentUser?.role === 'VIGILANCE_AUDIT' || currentUser?.role === 'MEDICAL_OFFICER';

  function submitCreate() {
    createDefect({
      projectId: project.id, location: form.location || 'Site — general', category: form.category, severity: form.severity,
      description: form.description, imageSeed: Math.floor(Math.random() * 99999), reportedBy: currentUser?.name ?? 'Deputy Engineer',
      contractorId: project.contractorId, dueDate: form.dueDate,
    });
    toast.success(uiText('Defect logged.'));
    setCreateOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {overdueCount > 0 && <div className="flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-700"><AlertTriangle size={13} /> {overdueCount}{uiText(" overdue defect(s)")}</div>}
        {!readOnly && <div className="ml-auto"><Button onClick={() => setCreateOpen(true)}><Plus size={15} />{uiText(" Log Defect")}</Button></div>}
      </div>

      <Card>
        {defects.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={32} />} title={uiText("No defects recorded")} description={uiText("Defects raised from failed inspections or manual observations will appear here.")} />
        ) : (
          <Table>
            <THead><Tr><Th>{uiText("ID")}</Th><Th>{uiText("Location")}</Th><Th>{uiText("Category")}</Th><Th>{uiText("Severity")}</Th><Th>{uiText("Assigned To")}</Th><Th>{uiText("Due Date")}</Th><Th>{uiText("Ageing")}</Th><Th>{uiText("Status")}</Th><Th /></Tr></THead>
            <TBody>
              {defects.map((d) => {
                const poc = contractorPocs.find((p) => p.id === d.assignedPocId);
                const overdue = d.status !== 'CLOSED' && new Date(d.dueDate) < new Date();
                return (
                  <Tr key={d.id} onClick={() => setDetailId(d.id)}>
                    <Td className="font-mono text-[11px] text-slate-500">{d.id}</Td>
                    <Td className="max-w-[140px] truncate">{uiText(d.location)}</Td>
                    <Td>{uiText(d.category.replace(/_/g, ' '))}</Td>
                    <Td><SeverityBadge severity={d.severity} /></Td>
                    <Td className="max-w-[140px] truncate">{poc?.name ?? '—'}</Td>
                    <Td className={overdue ? 'font-medium text-red-600' : ''}>{uiText(formatDate(d.dueDate))}</Td>
                    <Td className={overdue ? 'font-medium text-red-600' : ''}>{uiText(d.status === 'CLOSED' ? '—' : `${ageingDays(d.createdDate)}d${overdue ? ' (overdue)' : ''}`)}</Td>
                    <Td><StatusBadge status={d.status} label={uiText(DEFECT_STATUS_LABELS[d.status])} /></Td>
                    <Td className="whitespace-nowrap">
                      {d.status === 'OPEN' && !isContractor && !readOnly && <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setDetailId(d.id); }}><UserCheck size={12} />{uiText(" Assign")}</Button>}
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent title={uiText("Log New Defect")} description={uiText(project.name)}>
          <div className="space-y-3">
            <div><p className="mb-1 text-xs font-medium text-slate-600">{uiText("Location")}</p><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={uiText("e.g. Ward Block A, Grid B2")} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-600">{uiText("Category")}</p>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as InspectionCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INSPECTION_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{uiText(c.replace(/_/g, ' '))}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-600">{uiText("Severity")}</p>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as DefectSeverity })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{uiText(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><p className="mb-1 text-xs font-medium text-slate-600">{uiText("Due Date")}</p><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
            <div><p className="mb-1 text-xs font-medium text-slate-600">{uiText("Description")}</p><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{uiText("Cancel")}</Button>
            <Button onClick={submitCreate}>{uiText("Log Defect")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)}>
        {active && (
          <DialogContent title={uiMessage("Defect {{0}}", [active.id])} description={uiText(active.location)} size="lg">
            <div className="mb-3 flex gap-2">
              <SeverityBadge severity={active.severity} /><StatusBadge status={active.status} label={uiText(DEFECT_STATUS_LABELS[active.status])} />
            </div>
            <p className="mb-3 text-xs text-slate-600">{active.description}</p>

            <p className="mb-2 text-xs font-semibold text-slate-600">{uiText("Evidence")}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <EvidenceCard label={uiText("BEFORE")} seed={active.imageSeed} category={active.category} date={active.createdDate} by={active.reportedBy} />
              <EvidenceCard label={uiText("RECTIFICATION")} seed={active.correctiveActionPhotoSeed} category={active.category} date={active.acknowledgedDate} by={contractorPocs.find((p) => p.id === active.assignedPocId)?.name} empty="Awaiting contractor rectification evidence" />
              <EvidenceCard label={uiText("AFTER / REINSPECTION")} seed={active.reinspectionPhotoSeed} category={active.category} date={active.closedDate} by={users.find((u) => u.id === active.responsibleEngineerId)?.name} empty="Awaiting reinspection closure evidence" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <Row label={uiText("Category")} value={active.category.replace(/_/g, ' ')} />
              <Row label={uiText("Reported By")} value={active.reportedBy} />
              <Row label={uiText("Contractor")} value={contractors.find((c) => c.id === active.contractorId)?.company ?? '—'} />
              <Row label={uiText("Assigned Contractor POC")} value={contractorPocs.find((p) => p.id === active.assignedPocId)?.name ?? 'Not yet assigned'} />
              <Row label={uiText("Responsible Engineer")} value={users.find((u) => u.id === active.responsibleEngineerId)?.name ?? '—'} />
              <Row label={uiText("Responsible Officer")} value={users.find((u) => u.id === active.responsibleOfficerId)?.name ?? '—'} />
              <Row label={uiText("Due Date")} value={formatDate(active.dueDate)} />
              <Row label={uiText("Created")} value={formatDate(active.createdDate)} />
              {active.acknowledgedDate && <Row label={uiText("Acknowledged")} value={formatDate(active.acknowledgedDate)} />}
              {active.closedDate && <Row label={uiText("Closed")} value={formatDate(active.closedDate)} />}
            </div>
            {active.correctiveActionNotes && (
              <div className="mt-3 rounded-md bg-emerald-50 p-2.5 text-xs">
                <p className="font-medium text-emerald-700">{uiText("Corrective Action Notes")}</p>
                <p className="mt-1 text-emerald-700">{uiText(active.correctiveActionNotes)}</p>
              </div>
            )}

            {active.status === 'OPEN' && !isContractor && !readOnly && (
              <div className="mt-4 rounded-md border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-700">{uiText("Assign to contractor point of contact")}</p>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Select value={assignPocId} onValueChange={setAssignPocId}>
                      <SelectTrigger><SelectValue placeholder={uiText("Select POC")} /></SelectTrigger>
                      <SelectContent>{projectPocs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {uiText(p.role)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => { assignDefect(active.id, assignPocId || undefined); toast.success(uiText('Assigned to contractor.')); }}><UserCheck size={13} />{uiText(" Assign")}</Button>
                </div>
              </div>
            )}
            {active.status === 'ASSIGNED' && isContractor && !active.acknowledgedDate && (
              <div className="mt-4"><Button onClick={() => { acknowledgeDefect(active.id); toast.success(uiText('Defect acknowledged.')); }}><CheckCircle2 size={13} />{uiText(" Acknowledge Defect")}</Button></div>
            )}
            {(active.status === 'ASSIGNED' || active.status === 'IN_PROGRESS') && !readOnly && (
              <div className="mt-4"><Button onClick={() => setCorrectiveOpen(true)}><Wrench size={13} />{uiText(" Upload Corrective Action")}</Button></div>
            )}
            {active.status === 'FIXED' && !isContractor && !readOnly && <div className="mt-4"><Button variant="outline" onClick={() => { updateDefectStatus(active.id, 'IN_PROGRESS'); toast.info(uiText('Awaiting re-inspection from Quality module.')); }}>{uiText("Awaiting Re-inspection")}</Button></div>}
            {(active.status === 'FIXED' || active.status === 'REINSPECTION') && !isContractor && !readOnly && <div className="mt-4"><Button variant="success" onClick={() => { closeDefect(active.id); toast.success(uiText('Defect closed.')); setDetailId(null); }}><CheckCircle2 size={13} />{uiText(" Close Defect")}</Button></div>}
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={correctiveOpen} onOpenChange={setCorrectiveOpen}>
        <DialogContent title={uiText("Upload Corrective Action")} description={uiText("Contractor evidence of rectification")}>
          <div className="space-y-3">
            <div className="flex h-32 items-center justify-center rounded-md border-2 border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
              <div><Camera className="mx-auto mb-1" size={20} />{uiText(" Simulated corrective-action photo upload")}</div>
            </div>
            <Textarea rows={3} placeholder={uiText("Describe the corrective action taken…")} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrectiveOpen(false)}>{uiText("Cancel")}</Button>
            <Button onClick={() => {
              if (active) addCorrectiveAction(active.id, notes || 'Rectification completed as per inspection remarks.', Math.floor(Math.random() * 99999));
              toast.success(uiText('Corrective action submitted. Ready for re-inspection.'));
              setCorrectiveOpen(false); setNotes('');
            }}>{uiText("Submit")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  useUiLanguage();
  return <div className="flex justify-between border-b border-slate-50 pb-1.5"><span className="text-slate-400">{uiText(label)}</span><span className="font-medium text-slate-700">{uiText(value)}</span></div>;
}

export function EvidenceCard({ label, seed, category, date, by, empty }: { label: string; seed?: number; category: string; date?: string; by?: string; empty?: string }) {
  useUiLanguage();
  if (!seed) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{uiText(label)}</p>
        <p className="mt-2 text-[11px] text-slate-400">{uiText(empty ?? 'Not yet available')}</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <img src={seededImageUrl(seed, 320, 200, category)} className="h-28 w-full object-cover" />
      <div className="p-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">{uiText(label)}</p>
        {date && <p className="text-[10.5px] text-slate-400">{uiText(formatDate(date))}</p>}
        {by && <p className="text-[10.5px] text-slate-400">{uiText("By ")}{uiText(by)}</p>}
      </div>
    </div>
  );
}
