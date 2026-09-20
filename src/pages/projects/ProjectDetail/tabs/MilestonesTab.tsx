import { uiText, useUiLanguage } from '../../../../i18n/ui';
import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Lock } from 'lucide-react';
import type { Project } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardContent, Button, StatusBadge, ProgressBar, Table, THead, TBody, Tr, Th, Td, Textarea, Input } from '../../../../components/ui/primitives';
import { Dialog, DialogContent, DialogFooter } from '../../../../components/ui/overlays';
import { formatCurrency, formatDate } from '../../../../lib/utils';
import { isMilestoneDelivered, isMilestoneOverdue, dependenciesSatisfied } from '../../../../lib/milestones';

export function MilestonesTab({ project }: { project: Project }) {
  useUiLanguage();
  const allMilestones = useStore((s) => s.milestones);
  const milestones = allMilestones.filter((m) => m.projectId === project.id).sort((a, b) => a.order - b.order);
  const currentUser = useStore((s) => s.currentUser);
  const submitMilestone = useStore((s) => s.submitMilestone);
  const requestMilestoneCorrection = useStore((s) => s.requestMilestoneCorrection);
  const verifyMilestone = useStore((s) => s.verifyMilestone);
  const certifyMilestone = useStore((s) => s.certifyMilestone);
  const markMilestoneBillEligible = useStore((s) => s.markMilestoneBillEligible);
  const markMilestonePaid = useStore((s) => s.markMilestonePaid);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [claimValue, setClaimValue] = useState(0);
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [certifyValue, setCertifyValue] = useState(0);

  const active = milestones.find((m) => m.id === activeId);
  const role = currentUser?.role;
  const canSubmit = role === 'CONTRACTOR';
  const canVerify = role === 'DEPUTY_ENGINEER' || role === 'EXECUTIVE_ENGINEER';
  const canCertify = role === 'EXECUTIVE_ENGINEER';
  const canProcessPayment = role === 'COMMISSIONER' || role === 'EXECUTIVE_ENGINEER';

  const totalWeightage = milestones.reduce((s, m) => s + m.weightagePct, 0);
  const certifiedWeightage = milestones.filter((m) => isMilestoneDelivered(m.status)).reduce((s, m) => s + m.weightagePct, 0);
  const overdueCount = milestones.filter((m) => isMilestoneOverdue(m)).length;

  function openMilestone(id: string) {
    const m = milestones.find((x) => x.id === id);
    setActiveId(id);
    setClaimValue(m?.plannedValue ?? 0);
    setCertifyValue(m?.claimedValue ?? 0);
    setCorrectionNotes('');
  }

  return (
    <div className="space-y-4">
      <Card className="construction-timeline"><CardContent>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{uiText('Construction milestone timeline')}</h2>
        <p className="mt-1 text-sm text-slate-500">{uiText('Planned and actual delivery, separate from the administrative lifecycle. Select a milestone to review its details.')}</p>
        <ol className="mt-6 space-y-3">{milestones.map((m, index) => <li key={m.id}>
          <button type="button" onClick={() => openMilestone(m.id)} className="flex w-full items-start gap-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/70 to-white p-4 text-left transition hover:border-blue-300">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white font-semibold text-blue-700 shadow-sm">{String(index + 1).padStart(2, '0')}</span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{uiText(m.name)}</span><span className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-2"><span>{uiText('Planned')}: {formatDate(m.plannedStart)} — {formatDate(m.plannedDate)}</span><span>{uiText('Actual')}: {m.actualStart ? formatDate(m.actualStart) : uiText('Not started')} — {m.actualDate ? formatDate(m.actualDate) : uiText('Not completed')}</span></span><span className="mt-2 block"><StatusBadge status={m.status}/></span></span>
            <span aria-hidden="true" className="text-2xl text-blue-600">›</span>
          </button>
        </li>)}</ol>
      </CardContent></Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4">
          <p className="text-[11px] font-medium uppercase text-slate-400">{uiText("Certified Contract Value")}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{certifiedWeightage}% <span className="text-sm font-normal text-slate-400">{uiText("of ")}{totalWeightage}%</span></p>
          <ProgressBar value={totalWeightage ? (certifiedWeightage / totalWeightage) * 100 : 0} className="mt-2" />
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-[11px] font-medium uppercase text-slate-400">{uiText("Overdue Milestones")}</p>
          <p className={`mt-1 text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>{overdueCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-[11px] font-medium uppercase text-slate-400">{uiText("Total Milestones")}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{milestones.length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <Table>
          <THead><Tr><Th>{uiText("Milestone")}</Th><Th>{uiText("Weightage")}</Th><Th>{uiText("Planned Finish")}</Th><Th>{uiText("Claimed")}</Th><Th>{uiText("Certified")}</Th><Th>{uiText("Status")}</Th><Th /></Tr></THead>
          <TBody>
            {milestones.map((m) => {
              const overdue = isMilestoneOverdue(m);
              return (
                <Tr key={m.id} onClick={() => openMilestone(m.id)}>
                  <Td className="font-medium text-slate-800">{m.name}</Td>
                  <Td>{m.weightagePct}%</Td>
                  <Td className={overdue ? 'text-red-600' : ''}>{uiText(formatDate(m.plannedDate))}{overdue && <AlertTriangle size={11} className="ml-1 inline" />}</Td>
                  <Td>{uiText(m.claimedValue ? formatCurrency(m.claimedValue) : '—')}</Td>
                  <Td>{uiText(m.certifiedValue ? formatCurrency(m.certifiedValue) : '—')}</Td>
                  <Td><StatusBadge status={m.status} /></Td>
                  <Td />
                </Tr>
              );
            })}
          </TBody>
        </Table>
      </Card>

      <Dialog open={!!activeId} onOpenChange={(v) => !v && setActiveId(null)}>
        {active && (
          <DialogContent title={uiText(active.name)} description={uiText(active.description)} size="lg">
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <F label={uiText("Status")}><StatusBadge status={active.status} /></F>
              <F label={uiText("Weightage")} value={`${active.weightagePct}%`} />
              <F label={uiText("Planned Value")} value={formatCurrency(active.plannedValue)} />
              <F label={uiText("Planned Start")} value={formatDate(active.plannedStart)} />
              <F label={uiText("Planned Finish")} value={formatDate(active.plannedDate)} />
              <F label={uiText("Actual Finish")} value={active.actualDate ? formatDate(active.actualDate) : '—'} />
              <F label={uiText("Claimed Value")} value={active.claimedValue ? formatCurrency(active.claimedValue) : '—'} />
              <F label={uiText("Certified Value")} value={active.certifiedValue ? formatCurrency(active.certifiedValue) : '—'} />
              <F label={uiText("Payment Slab")} value={active.paymentSlabPct ? `${active.paymentSlabPct}%` : '—'} />
              <F label={uiText("Evidence Items")} value={String(active.evidenceCount)} />
              <F label={uiText("Inspection Required")} value={active.inspectionRequired ? 'Yes' : 'No'} />
              <F label={uiText("Responsible Contractor")} value={project.contractorId === active.responsibleContractorId ? 'Assigned firm' : '—'} />
            </div>

            {isMilestoneOverdue(active) && (
              <p className="mt-3 flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                <AlertTriangle size={13} />{uiText(" This milestone is overdue against its planned finish date.")}</p>
            )}
            {!dependenciesSatisfied(active, allMilestones) && (
              <p className="mt-2 flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
                <Lock size={13} />{uiText(" A preceding milestone hasn't been certified yet — dependency not yet satisfied.")}</p>
            )}

            <p className="mt-3 rounded-md bg-slate-50 p-2.5 text-xs text-slate-600">{uiText(active.comments)}</p>

            {/* Workflow actions, gated by role and current status */}
            {(active.status === 'NOT_STARTED' || active.status === 'IN_PROGRESS' || active.status === 'CORRECTION_REQUIRED') && canSubmit && (
              <div className="mt-4 rounded-md border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-700">{uiText("Submit work for verification")}</p>
                <div className="flex items-end gap-2">
                  <div className="flex-1"><p className="mb-1 text-[11px] text-slate-500">{uiText("Claimed Value (₹)")}</p><Input type="number" value={claimValue} onChange={(e) => setClaimValue(+e.target.value)} /></div>
                  <Button onClick={() => { submitMilestone(active.id, claimValue); toast.success(uiText('Submitted for verification.')); setActiveId(null); }}>{uiText("Submit")}</Button>
                </div>
              </div>
            )}

            {(active.status === 'SUBMITTED_FOR_VERIFICATION' || active.status === 'INSPECTION_PENDING') && canVerify && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="success" onClick={() => { verifyMilestone(active.id); toast.success(uiText('Field-verified.')); setActiveId(null); }}>{uiText("Verify")}</Button>
                <Button variant="destructive" onClick={() => setCorrectionNotes(' ')}>{uiText("Request Correction")}</Button>
              </div>
            )}
            {correctionNotes && (active.status === 'SUBMITTED_FOR_VERIFICATION' || active.status === 'INSPECTION_PENDING') && (
              <div className="mt-2">
                <Textarea rows={2} placeholder={uiText("Describe what needs correction…")} value={correctionNotes.trim()} onChange={(e) => setCorrectionNotes(e.target.value)} />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCorrectionNotes('')}>{uiText("Cancel")}</Button>
                  <Button variant="destructive" onClick={() => { requestMilestoneCorrection(active.id, correctionNotes.trim() || 'Corrective resubmission required.'); toast.error(uiText('Correction requested.')); setActiveId(null); }}>{uiText("Send")}</Button>
                </DialogFooter>
              </div>
            )}

            {active.status === 'VERIFIED' && canCertify && (
              <div className="mt-4 rounded-md border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-700">{uiText("Certify milestone")}</p>
                <div className="flex items-end gap-2">
                  <div className="flex-1"><p className="mb-1 text-[11px] text-slate-500">{uiText("Certified Value (₹)")}</p><Input type="number" value={certifyValue} onChange={(e) => setCertifyValue(+e.target.value)} /></div>
                  <Button variant="success" onClick={() => { certifyMilestone(active.id, certifyValue); toast.success(uiText('Milestone certified.')); setActiveId(null); }}>{uiText("Certify")}</Button>
                </div>
              </div>
            )}

            {active.status === 'CERTIFIED' && canProcessPayment && (
              <div className="mt-4">
                <Button onClick={() => { markMilestoneBillEligible(active.id); toast.success(uiText('Marked bill-eligible.')); setActiveId(null); }}>{uiText("Mark Bill Eligible")}</Button>
              </div>
            )}
            {active.status === 'BILL_ELIGIBLE' && canProcessPayment && (
              <div className="mt-4">
                <Button variant="success" onClick={() => { markMilestonePaid(active.id); toast.success(uiText('Payment recorded.')); setActiveId(null); }}>{uiText("Record Payment Released")}</Button>
              </div>
            )}

            {!canSubmit && !canVerify && !canCertify && !canProcessPayment && (
              <p className="mt-4 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                <Lock size={13} className="shrink-0" />{uiText(" Your role doesn't act on this workflow step — this is a read-only view.")}</p>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function F({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  useUiLanguage();
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wide text-slate-400">{uiText(label)}</p>
      <div className="mt-0.5 font-medium text-slate-700">{children ?? value}</div>
    </div>
  );
}
