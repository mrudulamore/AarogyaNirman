import { uiText, useUiLanguage } from '../../../../i18n/ui';
import { Check } from 'lucide-react';
import type { Project } from '../../../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/primitives';
import { PROJECT_STAGES } from '../../../../lib/constants';
import { formatCurrencyFull, cn } from '../../../../lib/utils';
import { useStore } from '../../../../store/useStore';
import { isMilestoneDelivered } from '../../../../lib/milestones';
import { ContractorSummaryCard } from '../../../../components/common/ContractorSummaryCard';

export function OverviewTab({ project }: { project: Project }) {
  useUiLanguage();
  const stageIndex = PROJECT_STAGES.indexOf(project.stage);
  const milestones = useStore((s) => s.milestones).filter((m) => m.projectId === project.id);
  const completedMilestones = milestones.filter((m) => isMilestoneDelivered(m.status)).length;
  const contractors = useStore((s) => s.contractors);
  const defects = useStore((s) => s.defects);
  const contractor = contractors.find((c) => c.id === project.contractorId);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>{uiText("Project Description")}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-slate-600">{project.description}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label={uiText("Start Date")} value={project.startDate} />
            <Stat label={uiText("Planned Completion")} value={project.plannedCompletionDate} />
            <Stat label={uiText("Bed Count")} value={String(project.bedCount)} />
            <Stat label={uiText("PMC")} value={project.pmcName} />
            <Stat label={uiText("Quality Score")} value={`${project.qualityScore}%`} />
            <Stat label={uiText("Milestones Complete")} value={`${completedMilestones}/${milestones.length}`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{uiText("Financial Snapshot")}</CardTitle></CardHeader>
        <CardContent className="space-y-2.5 text-xs">
          <Row label={uiText("Sanctioned Budget")} value={formatCurrencyFull(project.sanctionedBudget)} />
          <Row label={uiText("Tender Amount")} value={formatCurrencyFull(project.tenderAmount)} />
          <Row label={uiText("Work Order Value")} value={formatCurrencyFull(project.workOrderValue)} />
          <Row label={uiText("Revised Estimate")} value={formatCurrencyFull(project.revisedEstimate)} />
          <Row label={uiText("Amount Released")} value={formatCurrencyFull(project.amountReleased)} />
          <Row label={uiText("Amount Spent")} value={formatCurrencyFull(project.amountSpent)} bold />
          <Row label={uiText("Remaining Budget")} value={formatCurrencyFull(project.sanctionedBudget - project.amountSpent)} />
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader><CardTitle>{uiText("Project Lifecycle Stage")}</CardTitle></CardHeader>
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
                {uiText(stage.replace(/_/g, ' '))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {contractor && (
        <div className="lg:col-span-3">
          <ContractorSummaryCard
            contractor={contractor}
            projectId={project.id}
            openDefects={defects.filter((d) => d.contractorId === contractor.id && d.status !== 'CLOSED').length}
            totalDefects={defects.filter((d) => d.projectId === project.id && d.contractorId === contractor.id).length}
          />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  useUiLanguage();
  return <div><p className="text-[10.5px] uppercase tracking-wide text-slate-400">{uiText(label)}</p><p className="mt-0.5 text-[13px] font-medium text-slate-700">{uiText(value)}</p></div>;
}
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  useUiLanguage();
  return <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">{uiText(label)}</span><span className={bold ? 'font-semibold text-slate-800' : 'text-slate-700'}>{uiText(value)}</span></div>;
}
