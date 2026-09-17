import { uiMessage, uiText, useUiLanguage } from '../../../../i18n/ui';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Landmark, AlertTriangle, ShieldAlert, ArrowRight, Flag, Camera } from 'lucide-react';
import type { Project } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardContent, CardHeader, CardTitle, StatusBadge, SeverityBadge, ProgressBar, Table, THead, TBody, Tr, Th, Td } from '../../../../components/ui/primitives';
import { Dialog, DialogContent } from '../../../../components/ui/overlays';
import { KpiCard } from '../../../../components/common/KpiCard';
import { GeoPhoto } from '../../../../components/common/GeoPhoto';
import { DEFECT_STATUS_LABELS } from '../../../../lib/constants';
import { photoSrc, formatCurrency, formatDate, cn } from '../../../../lib/utils';
import { isMilestoneDelivered } from '../../../../lib/milestones';
import { GovernanceTab } from './GovernanceTab';
import { EvidenceCard } from './DefectsTab';

type RiskSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

interface RiskItem {
  category: string;
  severity: RiskSeverity;
  description: string;
  owner: string;
  ageingDays?: number;
  tab: string;
}

/** The Ministry/Secretary "Overview" combines what would otherwise be separate Governance,
 * Risk, Defect and Finance tabs into one executive read — the whole point of the Ministry
 * experience is summary + exception + evidence, not module-by-module navigation. */
export function MinistryOverviewTab({ project }: { project: Project }) {
  useUiLanguage();
  const [, setParams] = useSearchParams();
  const users = useStore((s) => s.users);
  const contractors = useStore((s) => s.contractors);
  const contractorPocs = useStore((s) => s.contractorPocs);
  const defects = useStore((s) => s.defects).filter((d) => d.projectId === project.id);
  const bills = useStore((s) => s.bills).filter((b) => b.projectId === project.id);
  const approvals = useStore((s) => s.approvals).filter((a) => a.projectId === project.id);
  const changeOrders = useStore((s) => s.changeOrders).filter((c) => c.projectId === project.id);
  const extensionsOfTime = useStore((s) => s.extensionsOfTime).filter((e) => e.projectId === project.id);
  const qualityFailures = useStore((s) => s.qualityFailures).filter((f) => f.projectId === project.id);
  const safetyRecords = useStore((s) => s.safetyRecords).filter((r) => r.projectId === project.id);
  const handoverSteps = useStore((s) => s.handoverSteps).filter((h) => h.projectId === project.id);
  const milestones = useStore((s) => s.milestones).filter((m) => m.projectId === project.id).sort((a, b) => a.order - b.order);
  const photos = useStore((s) => s.photos).filter((p) => p.projectId === project.id);
  const [governanceOpen, setGovernanceOpen] = useState(false);
  const [defectId, setDefectId] = useState<string | null>(null);
  const [milestoneId, setMilestoneId] = useState<string | null>(null);
  const activeDefect = defects.find((d) => d.id === defectId);
  const activeMilestone = milestones.find((m) => m.id === milestoneId);
  // Milestone names (Foundation, Structure, Roofing, MEP, Finishing, Medical Infrastructure) map
  // 1:1 onto SitePhoto.stage, so geo-tagged evidence can be shown per milestone without a
  // separate linking table.
  const activeMilestonePhotos = activeMilestone ? photos.filter((p) => p.stage === activeMilestone.name) : [];

  const ee = users.find((u) => u.id === project.executiveEngineerId);
  const contractor = contractors.find((c) => c.id === project.contractorId);
  const now = Date.now();

  // ---- Governance summary numbers ----
  const approvedEot = extensionsOfTime.filter((e) => e.status === 'APPROVED').reduce((s, e) => s + (e.approvedDays ?? 0), 0);
  const approvedChangeValue = changeOrders.filter((c) => c.status === 'APPROVED').reduce((s, c) => s + c.costImpact, 0);
  const currentApprovedCost = project.sanctionedBudget + approvedChangeValue;

  // ---- Overall project health ----
  const criticalDefects = defects.filter((d) => d.severity === 'CRITICAL' && d.status !== 'CLOSED').length;
  const health: 'On Track' | 'At Risk' | 'Critical' = project.status === 'DELAYED' || criticalDefects > 0 ? 'Critical' : project.status === 'AT_RISK' ? 'At Risk' : 'On Track';

  // ---- Risk section (Part 7) ----
  const elapsedRatio = Math.min(1, Math.max(0, (now - new Date(project.startDate).getTime()) / (new Date(project.plannedCompletionDate).getTime() - new Date(project.startDate).getTime())));
  const scheduleGap = Math.round(elapsedRatio * 100) - project.physicalProgress;
  const pendingBillsOver30 = bills.filter((b) => !['PAID', 'REJECTED'].includes(b.status) && (now - new Date(b.submittedDate).getTime()) / 86400000 > 30);
  const openQualityFailures = qualityFailures.filter((f) => f.reinspectionStatus !== 'PASS');
  const oldestPendingApproval = approvals.filter((a) => a.status === 'PENDING').sort((a, b) => (a.submittedDate < b.submittedDate ? -1 : 1))[0];
  const oldestApprovalDays = oldestPendingApproval ? Math.round((now - new Date(oldestPendingApproval.submittedDate).getTime()) / 86400000) : 0;
  const criticalSafety = safetyRecords.filter((r) => r.severity === 'CRITICAL' && r.status === 'OPEN');
  const handoverPending = handoverSteps.filter((h) => h.status !== 'COMPLETED').length;
  const nearHandover = project.physicalProgress >= 85 && project.status !== 'COMPLETED';

  const risks: RiskItem[] = [
    { category: 'Schedule Risk', severity: scheduleGap >= 15 ? 'HIGH' : scheduleGap >= 5 ? 'MEDIUM' : 'LOW', description: scheduleGap >= 5 ? `Project is ${scheduleGap}% behind planned physical progress.` : 'Physical progress is tracking close to plan.', owner: ee?.name ?? 'Executive Engineer', ageingDays: project.delayDays || undefined, tab: 'timeline' },
    { category: 'Financial Risk', severity: pendingBillsOver30.length >= 2 ? 'HIGH' : pendingBillsOver30.length === 1 ? 'MEDIUM' : 'LOW', description: pendingBillsOver30.length > 0 ? `${pendingBillsOver30.length} running bill${pendingBillsOver30.length === 1 ? '' : 's'} pending beyond 30 days.` : 'No bills overdue beyond 30 days.', owner: 'Finance / Commissioner', tab: 'finance' },
    { category: 'Quality Risk', severity: openQualityFailures.filter((f) => f.severity === 'CRITICAL').length > 0 ? 'HIGH' : openQualityFailures.length > 0 ? 'MEDIUM' : 'LOW', description: openQualityFailures.length > 0 ? `${openQualityFailures.length} critical quality failure${openQualityFailures.length === 1 ? '' : 's'} awaiting reinspection.` : 'No unresolved quality failures.', owner: ee?.name ?? 'Executive Engineer', tab: 'inspections' },
    { category: 'Contractor Risk', severity: (contractor?.performanceScore ?? 100) < 60 ? 'HIGH' : (contractor?.performanceScore ?? 100) < 75 ? 'MEDIUM' : 'LOW', description: contractor ? `${contractor.company} performance score ${contractor.performanceScore}%, ${contractor.openDefects} open defect(s).` : 'No contractor data.', owner: contractor?.company ?? '—', tab: 'team' },
    { category: 'Approval Risk', severity: oldestApprovalDays >= 15 ? 'HIGH' : oldestApprovalDays >= 7 ? 'MEDIUM' : 'LOW', description: oldestPendingApproval ? `${oldestPendingApproval.type.replace(/_/g, ' ')} approval pending for ${oldestApprovalDays} days.` : 'No pending approvals.', owner: 'Approving Authority', ageingDays: oldestApprovalDays || undefined, tab: 'approvals' },
    { category: 'Safety Risk', severity: criticalSafety.length > 0 ? 'HIGH' : 'LOW', description: criticalSafety.length > 0 ? `${criticalSafety.length} open critical safety observation(s).` : 'No open critical safety observations.', owner: 'Site Safety Officer', tab: 'safety & commissioning' },
    { category: 'Handover Risk', severity: nearHandover && handoverPending > 2 ? 'MEDIUM' : 'LOW', description: nearHandover ? `${handoverPending} handover step(s) still pending as project nears completion.` : 'Handover not yet due.', owner: ee?.name ?? 'Executive Engineer', tab: 'handover' },
  ];
  const activeRisks = risks.filter((r) => r.severity !== 'LOW');

  // ---- Defect summary (Part 8) ----
  const openDefects = defects.filter((d) => d.status !== 'CLOSED');
  const overdueDefects = openDefects.filter((d) => new Date(d.dueDate) < new Date());
  const reinspectionPendingDefects = defects.filter((d) => d.status === 'REINSPECTION');
  const closedWithDates = defects.filter((d) => d.status === 'CLOSED' && d.closedDate);
  const avgClosureDays = closedWithDates.length ? Math.round(closedWithDates.reduce((s, d) => s + (new Date(d.closedDate!).getTime() - new Date(d.createdDate).getTime()) / 86400000, 0) / closedWithDates.length) : 0;
  const topCriticalDefects = [...openDefects].filter((d) => d.severity === 'CRITICAL' || d.severity === 'HIGH').sort((a, b) => (a.createdDate < b.createdDate ? -1 : 1)).slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Progress KPI row — four separate numbers, never combined */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label={uiText("Reported Progress")} value={`${project.reportedProgress}%`} />
        <KpiCard label={uiText("Verified Progress")} value={`${project.verifiedProgress}%`} tone="blue" />
        <KpiCard label={uiText("Certified Progress")} value={`${project.physicalProgress}%`} tone="emerald" />
        <KpiCard label={uiText("Financial Progress")} value={`${project.financialProgress}%`} tone="amber" />
        <KpiCard label={uiText("Days Delayed")} value={project.delayDays > 0 ? `${project.delayDays}` : '0'} tone={project.delayDays > 0 ? 'red' : 'default'} />
        <KpiCard label={uiText("Overall Project Health")} value={health} tone={health === 'Critical' ? 'red' : health === 'At Risk' ? 'amber' : 'emerald'} />
      </div>

      {/* Governance summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Landmark size={15} />{uiText(" Governance Summary")}</CardTitle>
          <button onClick={() => setGovernanceOpen(true)} className="text-xs font-medium text-navy-700 underline">{uiText("View Governance Details →")}</button>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 p-5 text-xs sm:grid-cols-3 lg:grid-cols-4">
          <GField label={uiText("Administrative Approval")} value={formatDate(project.startDate)} />
          <GField label={uiText("Technical Sanction")} value={formatDate(project.startDate)} />
          <GField label={uiText("Original Sanctioned Cost")} value={formatCurrency(project.sanctionedBudget)} />
          <GField label={uiText("Current Approved Cost")} value={formatCurrency(currentApprovedCost)} tone={approvedChangeValue !== 0 ? 'amber' : undefined} />
          <GField label={uiText("Contract Value")} value={formatCurrency(project.workOrderValue || project.sanctionedBudget)} />
          <GField label={uiText("Original Completion")} value={formatDate(project.originalCompletionDate)} />
          <GField label={uiText("Current Approved Completion")} value={formatDate(project.plannedCompletionDate)} tone={project.plannedCompletionDate !== project.originalCompletionDate ? 'amber' : undefined} />
          <GField label={uiText("Extension of Time")} value={approvedEot > 0 ? `+${approvedEot} days` : 'None'} tone={approvedEot > 0 ? 'amber' : undefined} />
          <GField label={uiText("Change Orders")} value={String(changeOrders.length)} />
          <GField label={uiText("Approved Cost Variation")} value={formatCurrency(approvedChangeValue)} tone={approvedChangeValue !== 0 ? 'amber' : undefined} />
          <GField label={uiText("Funding Scheme")} value={project.scheme} />
          <GField label={uiText("Executing Authority")} value="Public Works Department (Health Wing)" />
        </CardContent>
      </Card>

      {/* Milestones — description, % completion and geo-tagged photo evidence, read-only */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Flag size={15} />{uiText(" Milestones — Description, Completion & Geo-Tagged Evidence")}</CardTitle></CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2.5">
            {milestones.map((m) => {
              const pctComplete = isMilestoneDelivered(m.status) ? 100 : m.status === 'VERIFIED' || m.status === 'SUBMITTED_FOR_VERIFICATION' || m.status === 'INSPECTION_PENDING' ? 60 : m.status === 'IN_PROGRESS' ? 30 : 0;
              const milestonePhotoCount = photos.filter((p) => p.stage === m.name).length;
              return (
                <button
                  key={m.id}
                  onClick={() => setMilestoneId(m.id)}
                  className="flex w-full items-start justify-between gap-3 rounded-md border border-slate-200 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold text-slate-800">{m.name}</p>
                      <StatusBadge status={m.status} />
                      <span className="text-[10.5px] text-slate-400">{uiText("Weightage ")}{m.weightagePct}%</span>
                      {milestonePhotoCount > 0 && <span className="flex items-center gap-1 text-[10.5px] text-slate-400"><Camera size={11} /> {milestonePhotoCount}{uiText(" geo-tagged photo")}{uiText(milestonePhotoCount === 1 ? '' : 's')}</span>}
                    </div>
                    <p className="mt-1 line-clamp-1 text-[11.5px] text-slate-500">{m.description}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <ProgressBar value={pctComplete} className="h-1.5 w-32" colorClass={pctComplete === 100 ? 'bg-emerald-500' : 'bg-blue-500'} />
                      <span className="text-[10.5px] font-medium text-slate-500">{pctComplete}{uiText("% complete")}</span>
                    </div>
                  </div>
                  <ArrowRight size={13} className="mt-0.5 shrink-0 text-slate-300" />
                </button>
              );
            })}
            {milestones.length === 0 && <p className="text-xs text-slate-400">{uiText("No milestones recorded for this project.")}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Executive risk section */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle size={15} />{uiText(" Executive Risk Summary")}</CardTitle></CardHeader>
        <CardContent className="space-y-2 p-4">
          {activeRisks.length === 0 && <p className="text-xs text-slate-400">{uiText("No elevated risks identified across schedule, finance, quality, contractor, approvals, safety or handover.")}</p>}
          {activeRisks.map((r) => (
            <button
              key={r.category}
              onClick={() => setParams({ tab: r.tab })}
              className={cn(
                'flex w-full items-start justify-between gap-3 rounded-md border px-3 py-2.5 text-left transition-colors',
                r.severity === 'HIGH' ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'border-amber-200 bg-amber-50 hover:bg-amber-100',
              )}
            >
              <div>
                <p className={cn('text-xs font-semibold', r.severity === 'HIGH' ? 'text-red-700' : 'text-amber-700')}>{uiText(r.category)} — {uiText(r.severity)}</p>
                <p className={cn('mt-0.5 text-[11.5px]', r.severity === 'HIGH' ? 'text-red-700' : 'text-amber-700')}>{r.description}</p>
                <p className="mt-1 text-[10.5px] text-slate-500">{uiText("Owner: ")}{uiText(r.owner)}{uiText(r.ageingDays ? ` · Ageing: ${r.ageingDays} days` : '')}</p>
              </div>
              <ArrowRight size={13} className={cn('mt-0.5 shrink-0', r.severity === 'HIGH' ? 'text-red-400' : 'text-amber-400')} />
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Defect summary — read-only */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert size={15} />{uiText(" Defect Summary (Read Only)")}</CardTitle></CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <MiniKpi label={uiText("Open Defects")} value={openDefects.length} />
            <MiniKpi label={uiText("Critical")} value={defects.filter((d) => d.severity === 'CRITICAL' && d.status !== 'CLOSED').length} tone="red" />
            <MiniKpi label={uiText("Overdue")} value={overdueDefects.length} tone="red" />
            <MiniKpi label={uiText("Reinspection Pending")} value={reinspectionPendingDefects.length} tone="amber" />
            <MiniKpi label={uiText("Avg. Closure Time")} value={`${avgClosureDays}d`} />
          </div>
          {topCriticalDefects.length > 0 && (
            <Table>
              <THead><Tr><Th>{uiText("ID")}</Th><Th>{uiText("Location")}</Th><Th>{uiText("Severity")}</Th><Th>{uiText("Assigned Contractor")}</Th><Th>{uiText("Ageing")}</Th><Th>{uiText("Status")}</Th></Tr></THead>
              <TBody>
                {topCriticalDefects.map((d) => (
                  <Tr key={d.id} onClick={() => setDefectId(d.id)}>
                    <Td className="font-mono text-[11px] text-slate-500">{d.id}</Td>
                    <Td className="max-w-[160px] truncate">{uiText(d.location)}</Td>
                    <Td><SeverityBadge severity={d.severity} /></Td>
                    <Td className="max-w-[160px] truncate">{contractors.find((c) => c.id === d.contractorId)?.company ?? '—'}</Td>
                    <Td>{Math.round((now - new Date(d.createdDate).getTime()) / 86400000)}d</Td>
                    <Td><StatusBadge status={d.status} label={uiText(DEFECT_STATUS_LABELS[d.status])} /></Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={governanceOpen} onOpenChange={setGovernanceOpen}>
        <DialogContent title={uiText("Governance Details (Read Only)")} description={uiText(project.name)} size="xl">
          <GovernanceTab project={project} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!milestoneId} onOpenChange={(v) => !v && setMilestoneId(null)}>
        {activeMilestone && (
          <DialogContent title={uiText(activeMilestone.name)} description={uiMessage("{{0}} — Read Only", [project.name])} size="lg">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={activeMilestone.status} />
              <span className="text-xs text-slate-500">{uiText("Weightage ")}{activeMilestone.weightagePct}{uiText("% of contract value")}</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">{activeMilestone.description}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 rounded-md bg-slate-50 p-3 text-xs sm:grid-cols-4">
              <DField label={uiText("Planned Finish")} value={formatDate(activeMilestone.plannedDate)} />
              <DField label={uiText("Actual Finish")} value={activeMilestone.actualDate ? formatDate(activeMilestone.actualDate) : '—'} />
              <DField label={uiText("Planned Value")} value={formatCurrency(activeMilestone.plannedValue)} />
              <DField label={uiText("Certified Value")} value={activeMilestone.certifiedValue ? formatCurrency(activeMilestone.certifiedValue) : '—'} />
            </div>
            <p className="mb-2 mt-4 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><Camera size={13} />{uiText(" Geo-Tagged Progress Photos (")}{activeMilestonePhotos.length})</p>
            {activeMilestonePhotos.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">{uiText("No geo-tagged photo evidence submitted for this milestone yet.")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {activeMilestonePhotos.map((p) => (
                  <GeoPhoto key={p.id} src={photoSrc(p)} lat={p.lat} lng={p.lng} timestamp={p.capturedAt} location={p.location} className="h-28" />
                ))}
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!defectId} onOpenChange={(v) => !v && setDefectId(null)}>
        {activeDefect && (
          <DialogContent title={uiMessage("Defect {{0}} (Read Only)", [activeDefect.id])} description={uiText(activeDefect.location)} size="xl">
            <div className="mb-3 flex gap-2">
              <SeverityBadge severity={activeDefect.severity} /><StatusBadge status={activeDefect.status} label={uiText(DEFECT_STATUS_LABELS[activeDefect.status])} />
            </div>
            <p className="mb-3 text-xs text-slate-600">{activeDefect.description}</p>
            <p className="mb-2 text-xs font-semibold text-slate-600">{uiText("Evidence")}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <EvidenceCard label={uiText("BEFORE")} seed={activeDefect.imageSeed} category={activeDefect.category} date={activeDefect.createdDate} by={activeDefect.reportedBy} />
              <EvidenceCard label={uiText("RECTIFICATION")} seed={activeDefect.correctiveActionPhotoSeed} category={activeDefect.category} date={activeDefect.acknowledgedDate} empty="Awaiting contractor rectification evidence" />
              <EvidenceCard label={uiText("AFTER / REINSPECTION")} seed={activeDefect.reinspectionPhotoSeed} category={activeDefect.category} date={activeDefect.closedDate} empty="Awaiting reinspection closure evidence" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <DField label={uiText("Category")} value={activeDefect.category.replace(/_/g, ' ')} />
              <DField label={uiText("Contractor")} value={contractors.find((c) => c.id === activeDefect.contractorId)?.company ?? '—'} />
              <DField label={uiText("Assigned POC")} value={contractorPocs.find((p) => p.id === activeDefect.assignedPocId)?.name ?? 'Not yet assigned'} />
              <DField label={uiText("Government Engineer")} value={users.find((u) => u.id === activeDefect.responsibleEngineerId)?.name ?? '—'} />
              <DField label={uiText("Due Date")} value={formatDate(activeDefect.dueDate)} />
              <DField label={uiText("Created")} value={formatDate(activeDefect.createdDate)} />
            </div>
            {activeDefect.correctiveActionNotes && (
              <div className="mt-3 rounded-md bg-emerald-50 p-2.5 text-xs">
                <p className="font-medium text-emerald-700">{uiText("Corrective Action Notes")}</p>
                <p className="mt-1 text-emerald-700">{uiText(activeDefect.correctiveActionNotes)}</p>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function DField({ label, value }: { label: string; value: string }) {
  useUiLanguage();
  return <div><p className="text-[10.5px] uppercase tracking-wide text-slate-400">{uiText(label)}</p><p className="mt-0.5 font-medium text-slate-700">{uiText(value)}</p></div>;
}

function GField({ label, value, tone }: { label: string; value: string; tone?: 'amber' }) {
  useUiLanguage();
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wide text-slate-400">{uiText(label)}</p>
      <p className={cn('mt-0.5 font-medium', tone === 'amber' ? 'text-amber-700' : 'text-slate-700')}>{uiText(value)}</p>
    </div>
  );
}

function MiniKpi({ label, value, tone }: { label: string; value: string | number; tone?: 'red' | 'amber' }) {
  useUiLanguage();
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="text-[10.5px] font-medium uppercase text-slate-400">{uiText(label)}</p>
      <p className={cn('mt-1 text-xl font-bold', tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : 'text-slate-800')}>{uiText(value)}</p>
    </div>
  );
}
