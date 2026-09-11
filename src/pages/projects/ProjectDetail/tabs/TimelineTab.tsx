import { Check, Clock, Circle } from 'lucide-react';
import type { Project } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardContent } from '../../../../components/ui/primitives';
import { formatDate, cn } from '../../../../lib/utils';
import { isMilestoneDelivered } from '../../../../lib/milestones';

type StepState = 'DONE' | 'ACTIVE' | 'PENDING';

export function TimelineTab({ project }: { project: Project }) {
  const tender = useStore((s) => s.tenders).find((t) => t.id === project.tenderId);
  const milestones = useStore((s) => s.milestones).filter((m) => m.projectId === project.id).sort((a, b) => a.order - b.order);
  const handoverSteps = useStore((s) => s.handoverSteps).filter((h) => h.projectId === project.id);
  const inspections = useStore((s) => s.inspections).filter((i) => i.projectId === project.id);

  const certifiedCount = milestones.filter((m) => isMilestoneDelivered(m.status)).length;
  const inspectionsDone = inspections.filter((i) => i.status === 'COMPLETED').length;
  const handoverComplete = handoverSteps.length > 0 && handoverSteps.every((h) => h.status === 'COMPLETED');
  const handoverStarted = handoverSteps.some((h) => h.status !== 'PENDING');

  const steps: { label: string; date?: string; state: StepState; note?: string }[] = [
    { label: 'Administrative Approval', date: tender?.publishDate, state: 'DONE', note: 'Sanctioned under the state hospital infrastructure programme.' },
    { label: 'Technical Sanction', date: tender?.publishDate, state: 'DONE' },
    { label: 'Tender Published', date: tender?.publishDate, state: tender ? 'DONE' : 'PENDING' },
    { label: 'Bid Evaluation', date: tender?.technicalOpeningDate, state: tender?.technicalOpeningDate ? 'DONE' : tender ? 'ACTIVE' : 'PENDING' },
    { label: 'LOA Issued', date: tender?.loaDate, state: tender?.loaDate ? 'DONE' : 'PENDING' },
    { label: 'Agreement Signed', date: tender?.agreementDate, state: tender?.agreementDate ? 'DONE' : 'PENDING' },
    { label: 'Work Order Issued', date: tender?.workOrderDate, state: tender?.workOrderDate ? 'DONE' : 'PENDING' },
    { label: 'Site Handover', date: project.startDate, state: 'DONE' },
    {
      label: 'Construction Milestones', date: undefined,
      state: certifiedCount === 0 ? 'PENDING' : certifiedCount === milestones.length ? 'DONE' : 'ACTIVE',
      note: `${certifiedCount} of ${milestones.length} milestones certified`,
    },
    {
      label: 'Quality Inspections', date: undefined,
      state: inspectionsDone === 0 ? 'PENDING' : 'ACTIVE',
      note: `${inspectionsDone} inspection${inspectionsDone === 1 ? '' : 's'} completed`,
    },
    { label: 'RA Bills & Payments', date: undefined, state: project.amountSpent > 0 ? (project.status === 'COMPLETED' ? 'DONE' : 'ACTIVE') : 'PENDING' },
    { label: 'Completion', date: project.actualCompletionDate, state: project.actualCompletionDate ? 'DONE' : project.physicalProgress >= 90 ? 'ACTIVE' : 'PENDING' },
    { label: 'Handover', date: undefined, state: handoverComplete ? 'DONE' : handoverStarted ? 'ACTIVE' : 'PENDING' },
    { label: 'Defect Liability Period', date: undefined, state: project.status === 'COMPLETED' ? 'ACTIVE' : 'PENDING', note: project.status === 'COMPLETED' ? '12-month defect liability period from handover.' : undefined },
  ];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={step.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
                  step.state === 'DONE' ? 'border-emerald-500 bg-emerald-500 text-white' :
                  step.state === 'ACTIVE' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-300 bg-white text-slate-400',
                )}>
                  {step.state === 'DONE' ? <Check size={13} /> : step.state === 'ACTIVE' ? <Clock size={12} /> : <Circle size={8} />}
                </div>
                {i < steps.length - 1 && <div className={cn('w-0.5 flex-1', step.state === 'DONE' ? 'bg-emerald-300' : 'bg-slate-200')} style={{ minHeight: 30 }} />}
              </div>
              <div className="flex-1 pb-5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={cn('text-sm font-semibold', step.state === 'PENDING' ? 'text-slate-400' : 'text-slate-800')}>{step.label}</p>
                  {step.date && <span className="text-[11px] text-slate-400">{formatDate(step.date)}</span>}
                </div>
                {step.note && <p className="mt-0.5 text-[11.5px] text-slate-500">{step.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
