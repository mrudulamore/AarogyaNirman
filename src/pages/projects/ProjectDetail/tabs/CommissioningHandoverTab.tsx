import { toast } from 'sonner';
import { Check, Circle, Clock, PartyPopper } from 'lucide-react';
import type { Project } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardContent, CardHeader, CardTitle, Button, StatusBadge } from '../../../../components/ui/primitives';
import { cn, formatDate } from '../../../../lib/utils';

export function CommissioningTab({ project }: { project: Project }) {
  const items = useStore((s) => s.commissioning).filter((c) => c.projectId === project.id);
  const updateCommissioningItem = useStore((s) => s.updateCommissioningItem);
  const readyCount = items.filter((i) => i.status === 'READY').length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Commissioning Readiness — {readyCount}/{items.length} Ready</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">{item.item}</p>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-1 text-[10.5px] text-slate-400">{item.remarks}</p>
              <div className="mt-2 flex gap-1.5">
                {(['READY', 'PENDING', 'NOT_READY'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => { updateCommissioningItem(item.id, st, st === 'READY' ? 'Verified and ready.' : st === 'PENDING' ? 'Under final verification.' : 'Not ready.'); if (st === 'READY') toast.success(`${item.item} marked ready.`); }}
                    className={cn('rounded px-2 py-0.5 text-[10px] font-medium', item.status === st ? 'bg-navy-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function HandoverTab({ project }: { project: Project }) {
  const currentUser = useStore((s) => s.currentUser);
  const steps = useStore((s) => s.handoverSteps).filter((h) => h.projectId === project.id).sort((a, b) => a.order - b.order);
  const commissioning = useStore((s) => s.commissioning).filter((c) => c.projectId === project.id);
  const defects = useStore((s) => s.defects).filter((d) => d.projectId === project.id);
  const documents = useStore((s) => s.documents).filter((d) => d.projectId === project.id);
  const advanceHandoverStep = useStore((s) => s.advanceHandoverStep);
  const completeHandoverAndOperationalize = useStore((s) => s.completeHandoverAndOperationalize);
  const readOnly = currentUser?.role !== 'EXECUTIVE_ENGINEER' && currentUser?.role !== 'DEPUTY_ENGINEER';

  const allComplete = steps.every((s) => s.status === 'COMPLETED');
  const nextPendingIndex = steps.findIndex((s) => s.status !== 'COMPLETED');
  const stepsComplete = steps.filter((s) => s.status === 'COMPLETED').length;
  const commissioningReady = commissioning.filter((c) => c.status === 'READY').length;
  const openDefects = defects.filter((d) => d.status !== 'CLOSED').length;
  const criticalDefects = defects.filter((d) => d.severity === 'CRITICAL' && d.status !== 'CLOSED').length;
  const completionCertDoc = documents.find((d) => d.type === 'Completion Certificate' && d.approvalStatus === 'APPROVED');
  const asBuiltDoc = documents.find((d) => d.type === 'Drawings' && d.approvalStatus === 'APPROVED');
  const readinessComponents = [
    { label: 'Handover Steps', done: steps.length > 0 && stepsComplete === steps.length, pct: steps.length ? (stepsComplete / steps.length) * 100 : 0 },
    { label: 'Commissioning', done: commissioning.length > 0 && commissioningReady === commissioning.length, pct: commissioning.length ? (commissioningReady / commissioning.length) * 100 : 0 },
    { label: 'Open Defects Closed', done: openDefects === 0, pct: openDefects === 0 ? 100 : 0 },
    { label: 'Completion Certificate', done: !!completionCertDoc, pct: completionCertDoc ? 100 : 0 },
    { label: 'As-Built Drawings', done: !!asBuiltDoc, pct: asBuiltDoc ? 100 : 0 },
  ];
  const readinessPct = Math.round(readinessComponents.reduce((s, c) => s + c.pct, 0) / readinessComponents.length);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Handover Readiness — {readinessPct}%</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {readinessComponents.map((c) => (
              <div key={c.label} className={cn('rounded-md border p-3', c.done ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50')}>
                <p className={cn('text-[10.5px] font-semibold uppercase tracking-wide', c.done ? 'text-emerald-700' : 'text-amber-700')}>{c.label}</p>
                <p className={cn('mt-1 text-lg font-bold', c.done ? 'text-emerald-800' : 'text-amber-800')}>{c.done ? 'Ready' : 'Pending'}</p>
              </div>
            ))}
          </div>
          {(openDefects > 0 || criticalDefects > 0) && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {openDefects} open defect{openDefects === 1 ? '' : 's'} remaining{criticalDefects > 0 ? ` (${criticalDefects} critical)` : ''} — must be closed before handover.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Handover Workflow</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-0">
            {steps.map((s, i) => (
              <div key={s.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
                    s.status === 'COMPLETED' ? 'border-emerald-500 bg-emerald-500 text-white' : s.status === 'IN_PROGRESS' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-300 bg-white text-slate-400')}>
                    {s.status === 'COMPLETED' ? <Check size={13} /> : s.status === 'IN_PROGRESS' ? <Clock size={12} /> : <Circle size={10} />}
                  </div>
                  {i < steps.length - 1 && <div className={cn('w-0.5 flex-1', s.status === 'COMPLETED' ? 'bg-emerald-300' : 'bg-slate-200')} style={{ minHeight: 30 }} />}
                </div>
                <div className="flex-1 pb-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{s.step}</p>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">Responsible: {s.responsible} {s.date && `· Completed ${formatDate(s.date)}`}</p>
                  {!readOnly && i === nextPendingIndex && (
                    <Button size="sm" className="mt-2" onClick={() => { advanceHandoverStep(s.id); toast.success(`${s.step} marked complete.`); }}>
                      <Check size={12} /> Mark Step Complete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!readOnly && allComplete && project.status !== 'COMPLETED' && (
            <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-center">
              <PartyPopper className="mx-auto mb-2 text-emerald-600" size={22} />
              <p className="text-sm font-semibold text-emerald-800">All handover steps complete.</p>
              <Button variant="success" className="mt-3" onClick={() => { completeHandoverAndOperationalize(project.id); toast.success('Hospital is now OPERATIONAL.'); }}>
                Complete Handover — Mark Hospital Operational
              </Button>
            </div>
          )}
          {project.status === 'COMPLETED' && (
            <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-semibold text-emerald-800">
              This hospital is OPERATIONAL. Handover complete on {formatDate(project.actualCompletionDate)}.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
