import { uiText, useUiLanguage } from '../../i18n/ui';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Contractor } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, ProgressBar } from '../ui/primitives';
import { formatCurrency, formatDate } from '../../lib/utils';

/** Contract Summary + Performance Scorecard — previously only visible on the standalone
 * ContractorProfile page. Surfaced inline here too (Project Overview, Team tab) so a reviewer
 * doesn't have to leave the project to see it, per the recurring "why do I have to navigate away
 * to see contractor performance" feedback. Pass `projectId` so the "View Full Profile" link can
 * carry a `from` breadcrumb back to this project. */
export function ContractorSummaryCard({ contractor, projectId, openDefects, totalDefects }: {
  contractor: Contractor;
  projectId: string;
  openDefects?: number;
  totalDefects?: number;
}) {
  useUiLanguage();
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>{uiText("Performance Scorecard — ")}{uiText(contractor.company)}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { l: 'Overall Performance', v: contractor.performanceScore },
            { l: 'Schedule Adherence', v: contractor.scheduleAdherence },
            { l: 'Quality Score', v: contractor.qualityScoreAvg },
            { l: 'Safety / Compliance Score', v: contractor.safetyScore },
            { l: 'Bill Processing Score', v: contractor.billProcessingScore },
          ].map((m) => (
            <div key={m.l}>
              <div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">{uiText(m.l)}</span><span className="font-semibold text-slate-800">{m.v}%</span></div>
              <ProgressBar value={m.v} colorClass={m.v >= 75 ? 'bg-emerald-500' : m.v >= 55 ? 'bg-amber-500' : 'bg-red-500'} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{uiText("Contract Summary")}</CardTitle>
          <button onClick={() => navigate(`/contractors/${contractor.id}?from=${projectId}`)} className="flex items-center gap-1 text-xs font-medium text-navy-700 underline">{uiText("View Full Contractor Profile ")}<ArrowRight size={12} />
          </button>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <Row label={uiText("Registration ID")} value={contractor.regId} />
          <Row label={uiText("Classification")} value={contractor.classification} />
          <Row label={uiText("Contract Amount (latest)")} value={formatCurrency(contractor.contractAmount)} />
          <Row label={uiText("Contract Period")} value={`${formatDate(contractor.startDate)} — ${formatDate(contractor.endDate)}`} />
          <Row label={uiText("Open Defects")} value={String(openDefects ?? contractor.openDefects)} />
          {totalDefects !== undefined && <Row label={uiText("Total Defects (this project)")} value={String(totalDefects)} />}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  useUiLanguage();
  return <div className="flex justify-between border-b border-slate-50 pb-1.5"><span className="text-slate-400">{uiText(label)}</span><span className="font-medium text-slate-700">{uiText(value)}</span></div>;
}
