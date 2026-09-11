import { Check } from 'lucide-react';
import type { Project } from '../../../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/primitives';
import { PROJECT_STAGES } from '../../../../lib/constants';
import { formatCurrencyFull, cn } from '../../../../lib/utils';
import { useStore } from '../../../../store/useStore';
import { isMilestoneDelivered } from '../../../../lib/milestones';

export function OverviewTab({ project }: { project: Project }) {
  const stageIndex = PROJECT_STAGES.indexOf(project.stage);
  const milestones = useStore((s) => s.milestones).filter((m) => m.projectId === project.id);
  const completedMilestones = milestones.filter((m) => isMilestoneDelivered(m.status)).length;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Project Description</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-slate-600">{project.description}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Start Date" value={project.startDate} />
            <Stat label="Planned Completion" value={project.plannedCompletionDate} />
            <Stat label="Bed Count" value={String(project.bedCount)} />
            <Stat label="PMC" value={project.pmcName} />
            <Stat label="Quality Score" value={`${project.qualityScore}%`} />
            <Stat label="Milestones Complete" value={`${completedMilestones}/${milestones.length}`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Financial Snapshot</CardTitle></CardHeader>
        <CardContent className="space-y-2.5 text-xs">
          <Row label="Sanctioned Budget" value={formatCurrencyFull(project.sanctionedBudget)} />
          <Row label="Tender Amount" value={formatCurrencyFull(project.tenderAmount)} />
          <Row label="Work Order Value" value={formatCurrencyFull(project.workOrderValue)} />
          <Row label="Revised Estimate" value={formatCurrencyFull(project.revisedEstimate)} />
          <Row label="Amount Released" value={formatCurrencyFull(project.amountReleased)} />
          <Row label="Amount Spent" value={formatCurrencyFull(project.amountSpent)} bold />
          <Row label="Remaining Budget" value={formatCurrencyFull(project.sanctionedBudget - project.amountSpent)} />
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader><CardTitle>Project Lifecycle Stage</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PROJECT_STAGES.map((stage, i) => (
              <div key={stage} className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium',
                i < stageIndex ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                i === stageIndex ? 'border-govblue-300 bg-govblue-50 text-govblue-700 ring-1 ring-govblue-300' :
                'border-slate-200 bg-slate-50 text-slate-400',
              )}>
                {i < stageIndex && <Check size={11} />}
                {stage.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10.5px] uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 text-[13px] font-medium text-slate-700">{value}</p></div>;
}
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">{label}</span><span className={bold ? 'font-semibold text-slate-800' : 'text-slate-700'}>{value}</span></div>;
}
