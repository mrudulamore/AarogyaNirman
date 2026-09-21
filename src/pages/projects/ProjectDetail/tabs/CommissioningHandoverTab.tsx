import { activeControls, validControl, handoverGaps, CERTIFICATES } from '../../../../lib/projectControls';
import { uiMessage, uiText, useUiLanguage } from '../../../../i18n/ui';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Check, Circle, Clock, PartyPopper } from 'lucide-react';
import type { Project } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardContent, CardHeader, CardTitle, Button, StatusBadge } from '../../../../components/ui/primitives';
import { cn, formatDate } from '../../../../lib/utils';
import { RegulatoryCertificateGrid } from '../../../../components/common/RegulatoryCertificateGrid';

export function CommissioningTab({ project }: { project: Project }) {
  useUiLanguage();
  const items = useStore((s) => s.commissioning).filter((c) => c.projectId === project.id);
  const updateCommissioningItem = useStore((s) => s.updateCommissioningItem);
  const readyCount = items.filter((i) => i.status === 'READY').length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>{uiText("Commissioning Readiness — ")}{readyCount}/{items.length}{uiText(" Ready")}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">{uiText(item.item)}</p>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-1 text-[10.5px] text-slate-400">{item.remarks}</p>
              <div className="mt-2 flex gap-1.5">
                {(['READY', 'PENDING', 'NOT_READY'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => { try {  updateCommissioningItem(item.id, st, st === 'READY' ? 'Verified and ready.' : st === 'PENDING' ? 'Under final verification.' : 'Not ready.'); if (st === 'READY') toast.success(uiMessage("{{0}} marked ready.", [item.item]));  } catch (error) { toast.error(uiText((error as Error).message)); } }}
                    className={cn('rounded px-2 py-0.5 text-[10px] font-medium', item.status === st ? 'bg-navy-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}
                  >
                    {uiText(st.replace('_', ' '))}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <RegulatoryCertificateGrid projectId={project.id}/>
    </div>
  );
}

export function HandoverTab({ project }: { project: Project }) {
  useUiLanguage();
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const steps = useStore((s) => s.handoverSteps).filter((h) => h.projectId === project.id).sort((a, b) => a.order - b.order);
  const commissioning = useStore((s) => s.commissioning).filter((c) => c.projectId === project.id);
  const defects = useStore((s) => s.defects).filter((d) => d.projectId === project.id);
  const controlState = useStore();
  const certificates = activeControls(controlState, project.id).filter(r => r.kind === 'CERTIFICATE' && validControl(r));
  const gaps = handoverGaps(controlState, project.id);
  const advanceHandoverStep = useStore((s) => s.advanceHandoverStep);
  const completeHandoverAndOperationalize = useStore((s) => s.completeHandoverAndOperationalize);
  const readOnly = !['SUPERADMIN', 'EXECUTIVE_ENGINEER', 'COMMISSIONER', 'CIVIL_SURGEON'].includes(currentUser?.role ?? '');
  function openGap(gap: string) {
    const tab = gap === 'Open Defects' ? 'defects' : gap === 'Unresolved failed inspections' ? 'inspections' : gap === 'Commissioning Pending' ? 'safety & commissioning' : gap === 'Handover Steps' ? 'handover' : 'controls';
    const query = new URLSearchParams({ tab });
    if (tab === 'controls') query.set('kind', 'CERTIFICATE');
    navigate(`/projects/${project.id}?${query}`);
  }

  const allComplete = steps.every((s) => s.status === 'COMPLETED');
  const nextPendingIndex = steps.findIndex((s) => s.status !== 'COMPLETED');
  const stepsComplete = steps.filter((s) => s.status === 'COMPLETED').length;
  const commissioningReady = commissioning.filter((c) => c.status === 'READY').length;
  const openDefects = defects.filter((d) => d.status !== 'CLOSED').length;
  const criticalDefects = defects.filter((d) => d.severity === 'CRITICAL' && d.status !== 'CLOSED').length;
  const readinessComponents = [
    { label: 'Handover Steps', done: steps.length > 0 && stepsComplete === steps.length, pct: steps.length ? (stepsComplete / steps.length) * 100 : 0 },
    { label: 'Commissioning', done: commissioning.length > 0 && commissioningReady === commissioning.length, pct: commissioning.length ? (commissioningReady / commissioning.length) * 100 : 0 },
    { label: 'Open Defects Closed', done: openDefects === 0, pct: openDefects === 0 ? 100 : 0 },
    { label: 'Unresolved failed inspections', done: !gaps.includes('Unresolved failed inspections'), pct: gaps.includes('Unresolved failed inspections') ? 0 : 100 },
    ...CERTIFICATES.map(category => ({ label: category, done: certificates.some(r => r.category === category), pct: certificates.some(r => r.category === category) ? 100 : 0 })),
  ];
  const readinessPct = Math.round(readinessComponents.reduce((s, c) => s + c.pct, 0) / readinessComponents.length);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>{uiText("Handover Readiness — ")}{readinessPct}%</CardTitle></CardHeader>
        <CardContent>
          {gaps.length > 0 && <div role="status" className="mb-4 rounded bg-amber-50 p-3"><p className="font-semibold">{uiText('Handover requirements remaining')}</p><ul className="mt-2 space-y-1 text-sm">{gaps.map(g => <li key={g}><button type="button" className="min-h-9 text-left text-blue-800 underline underline-offset-2" onClick={() => openGap(g)}>{uiText(g)} →</button></li>)}</ul></div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {readinessComponents.map((c) => (
              <div key={c.label} className={cn('rounded-md border p-3', c.done ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50')}>
                <p className={cn('text-[10.5px] font-semibold uppercase tracking-wide', c.done ? 'text-emerald-700' : 'text-amber-700')}>{uiText(c.label)}</p>
                <p className={cn('mt-1 text-lg font-bold', c.done ? 'text-emerald-800' : 'text-amber-800')}>{uiText(c.done ? 'Ready' : 'Pending')}</p>
              </div>
            ))}
          </div>
          {(openDefects > 0 || criticalDefects > 0) && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {openDefects}{uiText(" open defect")}{uiText(openDefects === 1 ? '' : 's')}{uiText(" remaining")}{uiText(criticalDefects > 0 ? ` (${criticalDefects} critical)` : '')}{uiText(" — must be closed before handover.")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{uiText("Handover Workflow")}</CardTitle></CardHeader>
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
                    <p className="text-sm font-semibold text-slate-800">{uiText(s.step)}</p>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">{uiText("Responsible: ")}{uiText(s.responsible)} {uiText(s.date && `· Completed ${formatDate(s.date)}`)}</p>
                  {!readOnly && i === nextPendingIndex && (
                    <Button size="sm" className="mt-2" onClick={() => { try {  advanceHandoverStep(s.id); toast.success(uiMessage("{{0}} marked complete.", [s.step]));  } catch (error) { toast.error(uiText((error as Error).message)); } }}>
                      <Check size={12} />{uiText(" Mark Step Complete")}</Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!readOnly && allComplete && project.status !== 'COMPLETED' && (
            <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-center">
              <PartyPopper className="mx-auto mb-2 text-emerald-600" size={22} />
              <p className="text-sm font-semibold text-emerald-800">{uiText("All handover steps complete.")}</p>
              <p className="text-xs text-amber-700">{gaps.map(g => uiText(g)).join(", ")}</p><Button disabled={gaps.length > 0} variant="success" className="mt-3" onClick={() => { try {  completeHandoverAndOperationalize(project.id); toast.success(uiText('Hospital is now OPERATIONAL.'));  } catch (error) { toast.error(uiText((error as Error).message)); } }}>{uiText("Complete Handover — Mark Hospital Operational")}</Button>
            </div>
          )}
          {project.status === 'COMPLETED' && (
            <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-semibold text-emerald-800">{uiText("This hospital is OPERATIONAL. Handover complete on ")}{uiText(formatDate(project.actualCompletionDate))}.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
