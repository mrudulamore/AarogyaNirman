import { useState } from 'react';
import { ClipboardCheck, ShieldCheck, ShieldAlert, RefreshCw, FileWarning, FileBarChart2 } from 'lucide-react';
import type { Inspection, QualityFailure, QualityReport } from '../../types';
import { uiText, useUiLanguage } from '../../i18n/ui';
import { Dialog, DialogContent } from '../ui/overlays';
import { StatusBadge } from '../ui/primitives';
import { formatDate } from '../../lib/utils';

export function QualitySummary({ inspections, failures, reports, score, onInspection, onFailure }: {
  inspections: Inspection[]; failures: QualityFailure[]; reports: QualityReport[]; score: number;
  onInspection: (id: string) => void; onFailure: (id: string) => void;
}) {
  useUiLanguage();
  const [filter, setFilter] = useState<string | null>(null);
  const [report, setReport] = useState<QualityReport | null>(null);
  const completed = inspections.filter(i => i.status === 'COMPLETED');
  const metrics = [
    { label: 'Total Inspections', value: inspections.length, key: 'all', icon: ClipboardCheck, color: 'bg-slate-500' },
    { label: 'Passed', value: completed.filter(i => i.overallResult === 'PASS').length, key: 'PASS', icon: ShieldCheck, color: 'bg-emerald-500' },
    { label: 'Conditional Pass', value: completed.filter(i => i.overallResult === 'CONDITIONAL').length, key: 'CONDITIONAL', icon: ShieldAlert, color: 'bg-amber-500' },
    { label: 'Failed', value: completed.filter(i => i.overallResult === 'FAIL').length, key: 'FAIL', icon: ShieldAlert, color: 'bg-red-500' },
    { label: 'Critical Failures', value: failures.filter(f => f.severity === 'CRITICAL').length, key: 'critical', icon: FileWarning, color: 'bg-red-500' },
    { label: 'Reinspection Pending', value: failures.filter(f => ['PENDING', 'SCHEDULED'].includes(f.reinspectionStatus)).length, key: 'reinspection', icon: RefreshCw, color: 'bg-amber-500' },
    { label: 'Quality Score', value: `${score}%`, key: 'score', icon: ShieldCheck, color: 'bg-slate-500' },
    { label: 'Reports Pending', value: reports.filter(r => r.status === 'PENDING').length, key: 'reports', icon: FileBarChart2, color: 'bg-amber-500' },
  ];
  const label = metrics.find(m => m.key === filter)?.label;
  const inspectionRows = filter === 'all' ? inspections : filter === 'score' ? completed : completed.filter(i => i.overallResult === filter);
  const failureRows = failures.filter(f => filter === 'critical' ? f.severity === 'CRITICAL' : ['PENDING', 'SCHEDULED'].includes(f.reinspectionStatus));
  const reportRows = reports.filter(r => filter === 'all-reports' || r.status === 'PENDING');
  const rows = filter === 'critical' || filter === 'reinspection'
    ? failureRows.map(f => ({ id: f.id, title: f.description, detail: f.location, status: f.reinspectionStatus, open: () => { setFilter(null); onFailure(f.id); } }))
    : filter === 'reports' || filter === 'all-reports'
      ? reportRows.map(r => ({ id: r.id, title: r.reportNo, detail: `${uiText(r.reportType)} · ${r.inspector}`, status: r.status, open: () => { setFilter(null); setReport(r); } }))
      : inspectionRows.map(i => ({ id: i.id, title: uiText(i.category.replaceAll('_', ' ')), detail: `${i.inspector} · ${formatDate(i.completedDate || i.scheduledDate)} · ${i.score}%`, status: i.status === 'COMPLETED' ? i.overallResult : i.status, open: () => { setFilter(null); onInspection(i.id); } }));
  return <>
    <div className="grid min-w-0 gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))' }} aria-label={uiText('Quality summary')}>
      {metrics.map(({ icon: Icon, ...metric }) => <button key={metric.key} type="button" onClick={() => setFilter(metric.key)} aria-label={`${uiText(metric.label)}: ${metric.value}`} className="min-w-0 rounded-2xl border border-slate-200 border-t-4 border-t-blue-400 bg-gradient-to-br from-blue-50 to-white p-4 text-left shadow-sm transition-colors hover:border-blue-500 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <span className="flex min-h-12 items-start justify-between gap-2"><span className="min-w-0 break-words text-sm font-medium leading-6 text-slate-600">{uiText(metric.label)}</span><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${metric.color}`}><Icon size={19} /></span></span>
        <span className="mt-3 block text-3xl font-semibold tabular-nums text-blue-950">{metric.value}</span>
      </button>)}
    </div>
    <Dialog open={filter !== null} onOpenChange={open => { if (!open) setFilter(null); }}>
      <DialogContent title={uiText(label ?? 'Inspections')}>
        <div className="max-h-[65vh] space-y-2 overflow-y-auto">
          {filter === 'score' && <p className="text-sm text-slate-500">{uiText('Quality Score')}: {score}% · {uiText('Completed inspections')}</p>}
          {!rows.length && <p className="py-6 text-center text-sm text-slate-500">{uiText('No matching records')}</p>}
          {rows.map(row => <button key={row.id} type="button" onClick={row.open} className="flex min-h-11 w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-left hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500">
            <span className="min-w-0 flex-1 break-words"><span className="block text-sm font-medium">{row.title}</span><span className="block text-xs text-slate-500">{row.detail}</span></span><StatusBadge status={row.status} />
          </button>)}
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={!!report} onOpenChange={open => { if (!open) setReport(null); }}>
      <DialogContent title={report?.reportNo ?? ''}>
        {report && <div className="max-h-[65vh] space-y-3 overflow-y-auto break-words text-sm"><StatusBadge status={report.status} />
          <dl className="space-y-3">{[['Type', report.reportType], ['Date', formatDate(report.date)], ['Inspector', report.inspector], ['Agency', report.agency], ['Test Type', report.testType], ['Observations', report.observations]].map(([key, value]) => <div key={key}><dt className="text-xs text-slate-500">{uiText(key)}</dt><dd>{uiText(value || 'Not provided')}</dd></div>)}</dl>
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}
