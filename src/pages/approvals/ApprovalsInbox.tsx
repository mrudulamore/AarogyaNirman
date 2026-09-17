import { uiText, useUiLanguage } from '../../i18n/ui';
import { BillEvidence } from '../projects/ProjectDetail/tabs/BillEvidence';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Check, X, RotateCcw, MessageCircleQuestion, Lock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { ROLE_LABELS } from '../../lib/constants';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { Card, StatusBadge, Table, THead, TBody, Tr, Th, Td, Button, Textarea } from '../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogFooter } from '../../components/ui/overlays';
import { KpiCard } from '../../components/common/KpiCard';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { ClipboardCheck, Clock, CheckCircle2, XCircle } from 'lucide-react';

export function ApprovalsInbox() {
  useUiLanguage();
  const { t } = useTranslation();
  const { projects, projectIds } = useProjectScope();
  const allApprovals = useStore((s) => s.approvals);
  const bills = useStore((s) => s.bills);
  const decideApproval = useStore((s) => s.decideApproval);
  const currentUser = useStore((s) => s.currentUser);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const approvals = allApprovals.filter((a) => projectIds.has(a.projectId));
  const myPending = approvals.filter((a) => a.status === 'PENDING' && a.chain[a.currentStepIndex] === currentUser?.role);
  const filtered = statusFilter === 'ALL' ? approvals : approvals.filter((a) => a.status === statusFilter);
  const active = approvals.find((a) => a.id === detailId);
  const canDecide = !!active && !!currentUser && (currentUser.role === active.chain[active.currentStepIndex] || (!active.relatedBillId && currentUser.role === 'COMMISSIONER'));

  function act(decision: 'APPROVED' | 'REJECTED' | 'SENT_BACK' | 'CLARIFICATION_REQUESTED') {
    if (!active) return;
    try { decideApproval(active.id, decision, comment || `${decision.replace('_', ' ')} by reviewing officer.`); }
    catch (error) { toast.error(uiText(error instanceof Error ? error.message : 'Unable to record decision.')); return; }
    toast[decision === 'APPROVED' ? 'success' : decision === 'REJECTED' ? 'error' : 'info'](`Request ${decision.replace('_', ' ').toLowerCase()}.`);
    setComment(''); setDetailId(null);
  }

  return (
    <div>
      <PageHeader title={uiText(t('pages.approvals.title'))} description={uiText(t('pages.approvals.desc'))} />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label={uiText("Awaiting My Action")} value={myPending.length} icon={ClipboardCheck} tone="amber" onClick={() => setStatusFilter('PENDING')} />
        <KpiCard label={uiText("Total Pending")} value={approvals.filter((a) => a.status === 'PENDING').length} icon={Clock} />
        <KpiCard label={uiText("Approved")} value={approvals.filter((a) => a.status === 'APPROVED').length} icon={CheckCircle2} tone="emerald" />
        <KpiCard label={uiText("Rejected")} value={approvals.filter((a) => a.status === 'REJECTED').length} icon={XCircle} tone="red" />
      </div>

      <div className="mb-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{uiText("All Statuses")}</SelectItem>
            {['PENDING', 'APPROVED', 'REJECTED', 'SENT_BACK', 'CLARIFICATION_REQUESTED'].map((s) => <SelectItem key={s} value={s}>{uiText(s.replace('_', ' '))}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <THead><Tr><Th>{uiText("Type")}</Th><Th>{uiText("Project")}</Th><Th>{uiText("Amount")}</Th><Th>{uiText("Submitted By")}</Th><Th>{uiText("Date")}</Th><Th>{uiText("Current Step")}</Th><Th>{uiText("Status")}</Th></Tr></THead>
          <TBody>
            {filtered.map((a) => (
              <Tr key={a.id} onClick={() => setDetailId(a.id)}>
                <Td className="font-medium text-slate-800">{uiText(a.type.replace(/_/g, ' '))}</Td>
                <Td className="max-w-[180px] truncate">{projects.find((p) => p.id === a.projectId)?.name}</Td>
                <Td>{uiText(a.amount ? formatCurrency(a.amount) : '—')}</Td>
                <Td>{uiText(a.submittedBy)}</Td>
                <Td>{uiText(formatDateTime(a.submittedDate))}</Td>
                <Td>{uiText(a.status === 'PENDING' ? a.chain[a.currentStepIndex]?.replace(/_/g, ' ') : '—')}</Td>
                <Td><StatusBadge status={a.status} /></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>

      <Dialog open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)}>
        {active && (
          <DialogContent title={uiText(active.type.replace(/_/g, ' '))} description={uiText(projects.find((p) => p.id === active.projectId)?.name)} size="lg">
            <p className="text-xs text-slate-600">{uiText(active.comments)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {active.chain.map((step, i) => (
                <span key={step} className={`rounded-full border px-2.5 py-1 text-[10.5px] font-medium ${i < active.currentStepIndex ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : i === active.currentStepIndex && active.status === 'PENDING' ? 'border-govblue-300 bg-govblue-50 text-govblue-700' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                  {uiText(step.replace(/_/g, ' '))}
                </span>
              ))}
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
