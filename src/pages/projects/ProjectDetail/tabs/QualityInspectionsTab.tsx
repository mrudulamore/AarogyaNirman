import { ProgressDocumentLinks } from '../../../../components/common/ProgressDocuments';
import { saveBillFiles } from '../../../../lib/billAttachments';
import { InspectionDetails } from '../../../../components/common/InspectionDetails';
import { InspectionAllocation } from '../../../../components/common/InspectionAllocation';
import { canReviewInspection, canManageInspection } from '../../../../lib/inspectionAccess';
import { drawingWarning } from '../../../../lib/pendingWork';
import { uiMessage, uiText, useUiLanguage } from '../../../../i18n/ui';
import { useState } from 'react';
import { toast } from 'sonner';
import { CalendarPlus, ClipboardCheck, ShieldCheck, ShieldAlert, RefreshCw, FileWarning, FileBarChart2, Download } from 'lucide-react';
import type { Project, ChecklistItem, Inspection, InspectionResult } from '../../../../types';
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
  useUiLanguage();
  const inspections = useStore((s) => s.inspections).filter((i) => i.projectId === project.id);
  const [detailId, setDetailId] = useState<string | null>(null);
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
    const latest = [...catInspections].sort((a, b) => (b.completedDate || b.scheduledDate).localeCompare(a.completedDate || a.scheduledDate))[0];
    return { cat, latest, count: catInspections.length };
  }).filter((x) => x.count > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <KpiCard label={uiText("Total Inspections")} value={inspections.length} icon={ClipboardCheck} />
        <KpiCard label={uiText("Passed")} value={passed} icon={ShieldCheck} tone="emerald" />
        <KpiCard label={uiText("Conditional Pass")} value={conditional} icon={ShieldAlert} tone="amber" />
        <KpiCard label={uiText("Failed")} value={failed} icon={ShieldAlert} tone="red" />
        <KpiCard label={uiText("Critical Failures")} value={qualityFailures.filter((f) => f.severity === 'CRITICAL').length} icon={FileWarning} tone="red" />
        <KpiCard label={uiText("Reinspection Pending")} value={reinspectionPending} icon={RefreshCw} tone="amber" />
        <KpiCard label={uiText("Quality Score")} value={`${project.qualityScore}%`} icon={ShieldCheck} />
        <KpiCard label={uiText("Reports Pending")} value={reportsPending} icon={FileBarChart2} tone={reportsPending > 0 ? 'amber' : 'default'} />
      </div>

      {qualityFailures.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileWarning size={15} />{uiText(" Critical Quality Failures")}</CardTitle></CardHeader>
          <Table>
            <THead><Tr><Th>{uiText("Failure ID")}</Th><Th>{uiText("Location")}</Th><Th>{uiText("Category")}</Th><Th>{uiText("Severity")}</Th><Th>{uiText("Inspection Date")}</Th><Th>{uiText("Reinspection")}</Th></Tr></THead>
            <TBody>
              {qualityFailures.map((f) => (
                <Tr key={f.id} onClick={() => setActiveFailureId(f.id)}>
                  <Td className="font-mono text-[11px] text-slate-500">{f.id}</Td>
                  <Td>{uiText(f.location)}</Td>
                  <Td>{uiText(f.category.replace(/_/g, ' '))}</Td>
                  <Td><SeverityBadge severity={f.severity} /></Td>
                  <Td>{uiText(formatDate(f.inspectionDate))}</Td>
                  <Td><StatusBadge status={f.reinspectionStatus} /></Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>{uiText("Category Breakdown")}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {byCategory.map(({ cat, latest }) => (
            <button type="button" key={cat} onClick={() => setDetailId(latest.id)} className="rounded-md border border-slate-200 p-3 text-left hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">{uiText(cat.replace(/_/g, ' '))}</p>
                <StatusBadge status={latest.overallResult} />
              </div>
              <p className="mt-1 text-[10.5px] text-slate-400">{uiText("Last inspected ")}{uiText(formatDate(latest.completedDate))}{uiText(" by ")}{uiText(latest.inspector)}</p>
              <p className="mt-1 text-[11px] font-medium text-slate-600">{uiText("Score: ")}{latest.score}%</p>
            </button>
          ))}
          {byCategory.length === 0 && <p className="col-span-full py-8 text-center text-xs text-slate-400">{uiText("No inspections completed yet.")}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileBarChart2 size={15} />{uiText(" Quality Reports")}</CardTitle></CardHeader>
        {qualityReports.length === 0 ? <EmptyState title={uiText("No quality reports filed for this project")} /> : (
          <Table>
            <THead><Tr><Th>{uiText("Report No.")}</Th><Th>{uiText("Type")}</Th><Th>{uiText("Date")}</Th><Th>{uiText("Inspector")}</Th><Th>{uiText("Agency")}</Th><Th>{uiText("Test Type")}</Th><Th>{uiText("Status")}</Th></Tr></THead>
            <TBody>
              {qualityReports.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-mono text-[11px] text-slate-500">{uiText(r.reportNo)}</Td>
                  <Td>{uiText(r.reportType)}</Td>
                  <Td>{uiText(formatDate(r.date))}</Td>
                  <Td>{uiText(r.inspector)}</Td>
                  <Td className="max-w-[160px] truncate">{uiText(r.agency)}</Td>
                  <Td>{uiText(r.testType)}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                  <Td>
                    <Button size="sm" variant="ghost" onClick={() => {
                      downloadDocumentRecord({
                        heading: `${r.reportType} — ${r.reportNo}`, filename: `${r.reportNo.replace(/\//g, '_')}.pdf`,
                        fields: [
                          { label: 'Report No.', value: r.reportNo }, { label: 'Type', value: r.reportType },
                          { label: 'Date', value: formatDate(r.date, 'en-IN') }, { label: 'Inspector', value: r.inspector },
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

      <InspectionDetails inspection={inspections.find(i => i.id === detailId)} onClose={() => setDetailId(null)} />
      <Dialog open={!!activeFailureId} onOpenChange={(v) => !v && setActiveFailureId(null)}>
        {activeFailure && (
          <DialogContent title={uiMessage("Quality Failure {{0}}", [activeFailure.id])} description={uiText(activeFailure.location)} size="lg">
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2"><SeverityBadge severity={activeFailure.severity} /><StatusBadge status={activeFailure.reinspectionStatus} /></div>
              <Row label={uiText("Category")} value={activeFailure.category.replace(/_/g, ' ')} />
              <Row label={uiText("Inspector")} value={activeFailure.inspector} />
              <Row label={uiText("Inspection Date")} value={formatDate(activeFailure.inspectionDate)} />
              <Row label={uiText("Assigned Contractor")} value={contractors.find((c) => c.id === activeFailure.assignedContractorId)?.company ?? '—'} />
              <Row label={uiText("Target Closure")} value={formatDate(activeFailure.targetClosure)} />
              <div className="rounded-md bg-slate-50 p-2.5">
                <p className="font-semibold text-slate-600">{uiText("Failure Description")}</p>
                <p className="mt-1 text-slate-600">{activeFailure.description}</p>
              </div>
              <div className="rounded-md bg-red-50 p-2.5">
                <p className="font-semibold text-red-700">{uiText("Possible Impact")}</p>
                <p className="mt-1 text-red-700">{uiText(activeFailure.possibleImpact)}</p>
              </div>
              <div className="rounded-md bg-amber-50 p-2.5">
                <p className="font-semibold text-amber-700">{uiText("Required Corrective Action")}</p>
                <p className="mt-1 text-amber-700">{uiText(activeFailure.requiredAction)}</p>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  useUiLanguage();
  return <div className="flex justify-between border-b border-slate-50 pb-1.5"><span className="text-slate-400">{uiText(label)}</span><span className="font-medium text-slate-700">{uiText(value)}</span></div>;
}

export function InspectionsTab({ project }: { project: Project }) {
  const controlState = useStore();
  useUiLanguage();
  const currentUser = useStore((s) => s.currentUser);
  const inspections = useStore((s) => s.inspections).filter((i) => i.projectId === project.id).sort((a, b) => (a.scheduledDate < b.scheduledDate ? 1 : -1));
  const defects = useStore((s) => s.defects).filter((d) => d.projectId === project.id);
  const appointments = useStore((s) => s.inspectionAppointments).filter((a) => a.projectId === project.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const canSchedule = canReviewInspection(currentUser);
  const startInspection = useStore(s => s.startInspection);
  const submitInspection = useStore((s) => s.submitInspection);
  const reinspect = useStore((s) => s.reinspect);


  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [comments, setComments] = useState('');
  const [uploading, setUploading] = useState(false);

  const active = inspections.find((i) => i.id === checklistId);

  function openChecklist(insp: Inspection) {
    try { startInspection(insp.id); } catch (error) { toast.error(uiText((error as Error).message)); return; }
    const reqs = CHECKLIST_REQUIREMENTS[insp.category];
    setItems(insp.items.length ? insp.items : reqs.map((r, idx) => ({
      id: `chk-${idx}`, requirement: r, measurement: '', standard: CHECKLIST_STANDARDS[insp.category], result: 'NOT_INSPECTED', evidence: '', remarks: '',
    })));
    setComments(insp.comments);
    setChecklistId(insp.id);
  }

  function submit() {
    if (items.some(item => item.result !== 'PASS' && !item.remarks.trim())) {
      toast.error(uiText('Add a comment for every checklist item that has not passed.'));
      return;
    }
    const anyFail = items.some((i) => i.result === 'FAIL');
    const anyConditional = items.some((i) => i.result === 'CONDITIONAL');
    const result: InspectionResult = anyFail ? 'FAIL' : anyConditional ? 'CONDITIONAL' : items.some(i => i.result === 'NOT_INSPECTED') ? 'NOT_INSPECTED' : 'PASS';
    try { submitInspection(checklistId!, items, result, comments); }
    catch (error) { toast.error(uiText((error as Error).message)); return; }
    toast.success(uiText('Inspection submitted for EE review.'));
    setChecklistId(null);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{uiText('EE assigns > JE inspects and uploads documents / comments > EE reviews > Approve, raise defect or reverify')}</p>
      <div className="flex justify-end">
        {canSchedule && <Button onClick={() => setScheduleOpen(true)}><CalendarPlus size={15} /> {uiText('Add inspection')}</Button>}
      </div>

      {appointments.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{uiText("Inspection Appointments")}</CardTitle></CardHeader>
          <Table>
            <THead><Tr><Th>{uiText("Type")}</Th><Th>{uiText("Requested By")}</Th><Th>{uiText("Assigned by")}</Th><Th>{uiText("Inspector")}</Th><Th>{uiText("Date")}</Th><Th>{uiText("Time")}</Th><Th>{uiText("Status")}</Th><Th /></Tr></THead>
            <TBody>
              {appointments.map((a) => (
                <Tr key={a.id}>
                  <Td className="font-medium text-slate-800">{uiText(a.inspectionType.replace(/_/g, ' '))}</Td>
                  <Td>{uiText(a.requestedBy)}</Td>
                  <Td>{a.assignedBy ?? '?'}</Td>
                  <Td>{uiText(a.assignedInspector ?? '—')}</Td>
                  <Td>{uiText(formatDate(a.date))}</Td>
                  <Td>{uiText(a.time)}</Td>
                  <Td><StatusBadge status={a.status} /></Td>

                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      <Card>
        <Table>
          <THead><Tr><Th>{uiText("Category")}</Th><Th>{uiText("Scheduled")}</Th><Th>{uiText("Inspector")}</Th><Th>{uiText("Status")}</Th><Th>{uiText("Result")}</Th><Th>{uiText("Score")}</Th><Th /></Tr></THead>
          <TBody>
            {inspections.map((insp) => {
              const canConduct = canManageInspection(currentUser, insp);
              const canReinspectSource = defects.find((d) => d.sourceInspectionId === insp.id && d.status === 'FIXED');
              return (
                <Tr key={insp.id} onClick={() => setDetailId(insp.id)}>
                  <Td className="font-medium text-slate-800">{insp.isReinspection && <RefreshCw size={11} className="mr-1 inline text-purple-500" />}{uiText(insp.category.replace(/_/g, ' '))}</Td>
                  <Td>{uiText(formatDate(insp.scheduledDate))}</Td>
                  <Td>{uiText(insp.inspector)}</Td>
                  <Td><StatusBadge status={insp.status} /></Td>
                  <Td><StatusBadge status={insp.overallResult} /></Td>
                  <Td>{uiText(insp.status === 'COMPLETED' ? `${insp.score}%` : '—')}</Td>
                  <Td className="space-x-1.5 whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={event => { event.stopPropagation(); setDetailId(insp.id); }}>{uiText(canSchedule && insp.status === 'PENDING_REVIEW' ? 'Review inspection' : 'View details')}</Button>
                    {canSchedule && ['SCHEDULED', 'REVERIFY'].includes(insp.status) && <Button size="sm" variant="outline" onClick={event => { event.stopPropagation(); setAssignId(insp.id); }}>{uiText('Reassign')}</Button>}
                    {canConduct && ['SCHEDULED', 'IN_PROGRESS', 'REVERIFY'].includes(insp.status) && <Button size="sm" variant="outline" onClick={event => { event.stopPropagation(); openChecklist(insp); }}><ClipboardCheck size={12} /> {uiText(insp.isReinspection ? 'Submit Result' : 'Start Inspection')}</Button>}
                    {canSchedule && canReinspectSource && (
                      <Button size="sm" onClick={event => { event.stopPropagation(); try { const r = reinspect(canReinspectSource.id); toast.success(uiText('Reinspection assigned to JE.')); setDetailId(r.id); } catch (error) { toast.error(uiText((error as Error).message)); } }}>
                        <RefreshCw size={12} />{uiText(" Re-inspect")}</Button>
                    )}
                    {!canConduct && insp.status === 'COMPLETED' && <span className="text-[11px] text-slate-400">{uiText("View only")}</span>}
                  </Td>
                </Tr>
              );
            })}
            {inspections.length === 0 && <Tr><Td className="py-8 text-center text-slate-400"><span>{uiText("No inspections recorded.")}</span></Td></Tr>}
          </TBody>
        </Table>
      </Card>

      <div className="space-y-2">{inspections.filter(i => drawingWarning(controlState, project.id, i.drawingId)).map(i => <p role="alert" key={i.id} className="rounded bg-amber-50 p-3 text-sm text-amber-800">{i.id}: {uiText(drawingWarning(controlState, project.id, i.drawingId))}</p>)}</div>
      {scheduleOpen && <InspectionAllocation project={project} onClose={() => setScheduleOpen(false)} />}
      {assignId && <InspectionAllocation project={project} inspection={inspections.find(i => i.id === assignId)} onClose={() => setAssignId(null)} />}

      <InspectionDetails inspection={inspections.find(i => i.id === detailId)} onClose={() => setDetailId(null)} />
      <Dialog open={!!checklistId} onOpenChange={(v) => !v && setChecklistId(null)}>
        {active && (
          <DialogContent title={uiMessage("{{0}} Inspection Checklist", [active.category.replace(/_/g, ' ')])} description={uiText(project.name)} size="lg">
            <div className="space-y-3">
              <label className="block text-sm font-medium">{uiText('Supporting documents (required)')}
                <input type="file" multiple accept="application/pdf,.pdf" disabled={uploading} className="mt-2 block w-full text-sm" onChange={async event => {
                  const files = Array.from(event.target.files ?? []);
                  event.target.value = '';
                  if (!files.length) return;
                  setUploading(true);
                  try {
                    if (files.some(file => file.type !== 'application/pdf') || files.length + (active.attachments?.length ?? 0) > 5) throw new Error('Upload 1 to 5 PDF documents, up to 5 MB each.');
                    const attachments = await saveBillFiles(files.map(file => ({ file, category: 'SUPPORTING' })));
                    controlState.setInspectionDocuments(active.id, [...(active.attachments ?? []), ...attachments]);
                  } catch (error) { toast.error(uiText((error as Error).message)); }
                  finally { setUploading(false); }
                }} />
              </label>
              <p className="text-xs text-slate-500">{uiText('Upload 1 to 5 PDF documents, up to 5 MB each.')}</p>
              <ProgressDocumentLinks attachments={active.attachments} />
              {active.attachments?.map(file => <button key={file.id} type="button" disabled={uploading} className="block min-h-10 text-xs text-red-600" onClick={() => {
                try { controlState.setInspectionDocuments(active.id, active.attachments!.filter(item => item.id !== file.id)); }
                catch (error) { toast.error(uiText((error as Error).message)); }
              }}>{uiText('Remove')}: {file.name}</button>)}
              {items.map((it, idx) => (
                <div key={it.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-700">{uiText(it.requirement)}</p>
                    <Select value={it.result} onValueChange={(v) => setItems(items.map((x, i2) => i2 === idx ? { ...x, result: v as ChecklistItem['result'] } : x))}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PASS">{uiText("PASS")}</SelectItem>
                        <SelectItem value="FAIL">{uiText("FAIL")}</SelectItem>
                        <SelectItem value="CONDITIONAL">{uiText("CONDITIONAL")}</SelectItem>
                        <SelectItem value="NOT_INSPECTED">{uiText("NOT INSPECTED")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="mt-1 text-[10.5px] text-slate-400">{uiText("Standard: ")}{uiText(it.standard)}{uiText(" · Evidence: ")}{uiText(it.evidence)}</p>
                  <label htmlFor={`checklist-comment-${it.id}`} className="mb-1 mt-3 block text-xs font-medium text-slate-600">{uiText(it.result === 'PASS' ? 'Item comments (optional)' : 'Item comments (required)')}</label>
                  <Textarea id={`checklist-comment-${it.id}`} rows={1} className="min-h-12 h-12 resize-y" required={it.result !== 'PASS'} value={it.remarks} onChange={e => setItems(items.map((item, itemIndex) => itemIndex === idx ? { ...item, remarks: e.target.value } : item))} />
                </div>
              ))}
              <div>
                <p className="mb-1 text-xs font-medium text-slate-600">{uiText("Inspector Comments")}</p>
                <Textarea rows={1} className="min-h-12 h-12 resize-y" value={comments} onChange={(e) => setComments(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setChecklistId(null)}>{uiText("Cancel")}</Button>
              <Button onClick={submit} disabled={uploading}><ShieldAlert size={14} />{uiText('Submit for review')}</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
