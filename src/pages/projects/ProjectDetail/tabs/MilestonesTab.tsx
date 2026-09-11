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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4">
          <p className="text-[11px] font-medium uppercase text-slate-400">Certified Contract Value</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{certifiedWeightage}% <span className="text-sm font-normal text-slate-400">of {totalWeightage}%</span></p>
          <ProgressBar value={totalWeightage ? (certifiedWeightage / totalWeightage) * 100 : 0} className="mt-2" />
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-[11px] font-medium uppercase text-slate-400">Overdue Milestones</p>
          <p className={`mt-1 text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>{overdueCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-[11px] font-medium uppercase text-slate-400">Total Milestones</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{milestones.length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <Table>
          <THead><Tr><Th>Milestone</Th><Th>Weightage</Th><Th>Planned Finish</Th><Th>Claimed</Th><Th>Certified</Th><Th>Status</Th><Th /></Tr></THead>
          <TBody>
            {milestones.map((m) => {
              const overdue = isMilestoneOverdue(m);
              return (
                <Tr key={m.id} onClick={() => openMilestone(m.id)}>
                  <Td className="font-medium text-slate-800">{m.name}</Td>
                  <Td>{m.weightagePct}%</Td>
                  <Td className={overdue ? 'text-red-600' : ''}>{formatDate(m.plannedDate)}{overdue && <AlertTriangle size={11} className="ml-1 inline" />}</Td>
                  <Td>{m.claimedValue ? formatCurrency(m.claimedValue) : '—'}</Td>
                  <Td>{m.certifiedValue ? formatCurrency(m.certifiedValue) : '—'}</Td>
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
          <DialogContent title={active.name} description={active.description} size="lg">
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <F label="Status"><StatusBadge status={active.status} /></F>
              <F label="Weightage" value={`${active.weightagePct}%`} />
              <F label="Planned Value" value={formatCurrency(active.plannedValue)} />
              <F label="Planned Start" value={formatDate(active.plannedStart)} />
              <F label="Planned Finish" value={formatDate(active.plannedDate)} />
              <F label="Actual Finish" value={active.actualDate ? formatDate(active.actualDate) : '—'} />
              <F label="Claimed Value" value={active.claimedValue ? formatCurrency(active.claimedValue) : '—'} />
              <F label="Certified Value" value={active.certifiedValue ? formatCurrency(active.certifiedValue) : '—'} />
              <F label="Payment Slab" value={active.paymentSlabPct ? `${active.paymentSlabPct}%` : '—'} />
              <F label="Evidence Items" value={String(active.evidenceCount)} />
              <F label="Inspection Required" value={active.inspectionRequired ? 'Yes' : 'No'} />
              <F label="Responsible Contractor" value={project.contractorId === active.responsibleContractorId ? 'Assigned firm' : '—'} />
            </div>

            {isMilestoneOverdue(active) && (
              <p className="mt-3 flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                <AlertTriangle size={13} /> This milestone is overdue against its planned finish date.
              </p>
            )}
            {!dependenciesSatisfied(active, allMilestones) && (
              <p className="mt-2 flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
                <Lock size={13} /> A preceding milestone hasn't been certified yet — dependency not yet satisfied.
              </p>
            )}

            <p className="mt-3 rounded-md bg-slate-50 p-2.5 text-xs text-slate-600">{active.comments}</p>

            {/* Workflow actions, gated by role and current status */}
            {(active.status === 'NOT_STARTED' || active.status === 'IN_PROGRESS' || active.status === 'CORRECTION_REQUIRED') && canSubmit && (
              <div className="mt-4 rounded-md border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-700">Submit work for verification</p>
                <div className="flex items-end gap-2">
                  <div className="flex-1"><p className="mb-1 text-[11px] text-slate-500">Claimed Value (₹)</p><Input type="number" value={claimValue} onChange={(e) => setClaimValue(+e.target.value)} /></div>
                  <Button onClick={() => { submitMilestone(active.id, claimValue); toast.success('Submitted for verification.'); setActiveId(null); }}>Submit</Button>
                </div>
              </div>
            )}

            {(active.status === 'SUBMITTED_FOR_VERIFICATION' || active.status === 'INSPECTION_PENDING') && canVerify && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="success" onClick={() => { verifyMilestone(active.id); toast.success('Field-verified.'); setActiveId(null); }}>Verify</Button>
                <Button variant="destructive" onClick={() => setCorrectionNotes(' ')}>Request Correction</Button>
              </div>
            )}
            {correctionNotes && (active.status === 'SUBMITTED_FOR_VERIFICATION' || active.status === 'INSPECTION_PENDING') && (
              <div className="mt-2">
                <Textarea rows={2} placeholder="Describe what needs correction…" value={correctionNotes.trim()} onChange={(e) => setCorrectionNotes(e.target.value)} />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCorrectionNotes('')}>Cancel</Button>
                  <Button variant="destructive" onClick={() => { requestMilestoneCorrection(active.id, correctionNotes.trim() || 'Corrective resubmission required.'); toast.error('Correction requested.'); setActiveId(null); }}>Send</Button>
                </DialogFooter>
              </div>
            )}

            {active.status === 'VERIFIED' && canCertify && (
              <div className="mt-4 rounded-md border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-700">Certify milestone</p>
                <div className="flex items-end gap-2">
                  <div className="flex-1"><p className="mb-1 text-[11px] text-slate-500">Certified Value (₹)</p><Input type="number" value={certifyValue} onChange={(e) => setCertifyValue(+e.target.value)} /></div>
                  <Button variant="success" onClick={() => { certifyMilestone(active.id, certifyValue); toast.success('Milestone certified.'); setActiveId(null); }}>Certify</Button>
                </div>
              </div>
            )}

            {active.status === 'CERTIFIED' && canProcessPayment && (
              <div className="mt-4">
                <Button onClick={() => { markMilestoneBillEligible(active.id); toast.success('Marked bill-eligible.'); setActiveId(null); }}>Mark Bill Eligible</Button>
              </div>
            )}
            {active.status === 'BILL_ELIGIBLE' && canProcessPayment && (
              <div className="mt-4">
                <Button variant="success" onClick={() => { markMilestonePaid(active.id); toast.success('Payment recorded.'); setActiveId(null); }}>Record Payment Released</Button>
              </div>
            )}

            {!canSubmit && !canVerify && !canCertify && !canProcessPayment && (
              <p className="mt-4 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                <Lock size={13} className="shrink-0" /> Your role doesn't act on this workflow step — this is a read-only view.
              </p>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function F({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-0.5 font-medium text-slate-700">{children ?? value}</div>
    </div>
  );
}
