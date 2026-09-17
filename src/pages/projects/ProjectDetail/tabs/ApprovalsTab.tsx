import { uiText, useUiLanguage } from '../../../../i18n/ui';
import { BillEvidence } from './BillEvidence';
import { useState } from 'react';
import { toast } from 'sonner';
import { Check, X, RotateCcw, MessageCircleQuestion, Lock } from 'lucide-react';
import type { Project } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { ROLE_LABELS } from '../../../../lib/constants';
import { Card, Button, StatusBadge, Table, THead, TBody, Tr, Th, Td, Textarea, EmptyState } from '../../../../components/ui/primitives';
import { Dialog, DialogContent, DialogFooter } from '../../../../components/ui/overlays';
import { formatCurrency, formatDateTime } from '../../../../lib/utils';
import { ClipboardCheck } from 'lucide-react';

export function ApprovalsTab({ project }: { project: Project }) {
  useUiLanguage();
  const approvals = useStore((s) => s.approvals).filter((a) => a.projectId === project.id).sort((a, b) => (a.submittedDate < b.submittedDate ? 1 : -1));
  const bills = useStore((s) => s.bills);
  const decideApproval = useStore((s) => s.decideApproval);
  const currentUser = useStore((s) => s.currentUser);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const active = approvals.find((a) => a.id === detailId);
  const canDecide = !!active && !!currentUser && (currentUser.role === active.chain[active.currentStepIndex] || (!active.relatedBillId && currentUser.role === 'COMMISSIONER'));

  function act(decision: 'APPROVED' | 'REJECTED' | 'SENT_BACK' | 'CLARIFICATION_REQUESTED') {
    if (!active) return;
    try { decideApproval(active.id, decision, comment || `${decision.replace('_', ' ')} by reviewing officer.`); }
    catch (error) { toast.error(uiText(error instanceof Error ? error.message : 'Unable to record decision.')); return; }
    toast[decision === 'APPROVED' ? 'success' : decision === 'REJECTED' ? 'error' : 'info'](`Request ${decision.replace('_', ' ').toLowerCase()}.`);
    setComment('');
    setDetailId(null);
  }

  return (
    <div className="space-y-4">
      <Card>
        {approvals.length === 0 ? <EmptyState icon={<ClipboardCheck size={32} />} title={uiText("No approval requests for this project")} /> : (
          <Table>
            <THead><Tr><Th>{uiText("Type")}</Th><Th>{uiText("Amount")}</Th><Th>{uiText("Submitted By")}</Th><Th>{uiText("Date")}</Th><Th>{uiText("Current Step")}</Th><Th>{uiText("Status")}</Th></Tr></THead>
            <TBody>
              {approvals.map((a) => (
                <Tr key={a.id} onClick={() => setDetailId(a.id)}>
                  <Td className="font-medium text-slate-800">{uiText(a.type.replace(/_/g, ' '))}</Td>
                  <Td>{uiText(a.amount ? formatCurrency(a.amount) : '—')}</Td>
                  <Td>{uiText(a.submittedBy)}</Td>
                  <Td>{uiText(formatDateTime(a.submittedDate))}</Td>
                  <Td>{uiText(a.status === 'PENDING' ? a.chain[a.currentStepIndex]?.replace(/_/g, ' ') : '—')}</Td>
                  <Td><StatusBadge status={a.status} /></Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)}>
        {active && (
          <DialogContent title={uiText(active.type.replace(/_/g, ' '))} description={uiText(project.name)} size="lg">
            <div className="space-y-2 text-xs">
              <p className="text-slate-600">{uiText(active.comments)}</p>
              <div className="flex flex-wrap gap-1.5">
                {active.chain.map((step, i) => (
                  <span key={step} className={`rounded-full border px-2.5 py-1 text-[10.5px] font-medium ${i < active.currentStepIndex ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : i === active.currentStepIndex && active.status === 'PENDING' ? 'border-govblue-300 bg-govblue-50 text-govblue-700' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                    {uiText(step.replace(/_/g, ' '))}
                  </span>
                ))}
              </div>
            </div>

            <div>{active.relatedBillId && <BillEvidence attachments={bills.find((bill) => bill.id === active.relatedBillId)?.attachments} />}</div>
            <p className="mb-2 mt-4 text-xs font-semibold text-slate-600">{uiText("Approval History & Audit Trail")}</p>
            <div className="space-y-2">
              {active.history.length === 0 && <p className="text-xs text-slate-400">{uiText("No decisions recorded yet.")}</p>}
              {active.history.map((h, i) => (
                <div key={i} className="rounded-md border border-slate-100 bg-slate-50 p-2.5 text-xs">
                  <div className="flex justify-between"><span className="font-medium text-slate-700">{uiText(h.approver)} · {uiText(h.designation)}</span><StatusBadge status={h.decision} /></div>
                  <p className="mt-1 text-slate-500">{h.comment}</p>
                  <p className="mt-1 text-[10.5px] text-slate-400">{uiText(formatDateTime(h.timestamp))}</p>
                </div>
              ))}
            </div>

            {active.status === 'PENDING' && canDecide && (
              <div className="mt-4">
                <Textarea rows={2} placeholder={uiText("Add a comment (optional)")} value={comment} onChange={(e) => setComment(e.target.value)} />
                <DialogFooter>
                  <Button variant="outline" onClick={() => act('CLARIFICATION_REQUESTED')}><MessageCircleQuestion size={13} />{uiText(" Request Clarification")}</Button>
                  <Button variant="outline" onClick={() => act('SENT_BACK')}><RotateCcw size={13} />{uiText(" Send Back")}</Button>
                  <Button variant="destructive" onClick={() => act('REJECTED')}><X size={13} />{uiText(" Reject")}</Button>
                  <Button variant="success" onClick={() => act('APPROVED')}><Check size={13} />{uiText(" Approve")}</Button>
                </DialogFooter>
              </div>
            )}
            {active.status === 'PENDING' && !canDecide && (
              <div className="mt-4 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                <Lock size={13} className="shrink-0" />{uiText(" Awaiting action from ")}{uiText(ROLE_LABELS[active.chain[active.currentStepIndex]])}{uiText(". This step isn't assigned to your role.")}</div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
