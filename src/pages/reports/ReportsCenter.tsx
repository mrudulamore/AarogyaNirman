import { outstandingBills } from '../../lib/financeLedger';
import { uiText, useUiLanguage } from '../../i18n/ui';
import { FundDisbursalReports } from '../finance/FundDisbursalReports';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Download, FileBarChart } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { Card, CardContent, Button } from '../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ALL_DISTRICTS } from '../../lib/constants';
import { formatCurrency as localizedCurrency } from '../../lib/utils';
import { downloadPdfReport, type PdfKpi, type PdfSection } from '../../lib/pdf';
import type { Project } from '../../types';

interface ReportDef {
  id: string;
  name: string;
  desc: string;
  build: (ctx: BuildCtx) => { kpis: PdfKpi[]; sections: PdfSection[] };
}

interface BuildCtx {
  projects: Project[];
  inRange: (isoDate: string | undefined) => boolean;
}

const store = useStore; // referenced inside build() via getState() to avoid re-rendering churn
// The legacy PDF renderer uses Helvetica; keep its content in its supported language.
const formatCurrency = (amount: number) => localizedCurrency(amount, 'en');

const REPORTS: ReportDef[] = [
  {
    id: 'progress', name: 'Project Progress Report', desc: 'Physical and financial progress across all hospital projects.',
    build: ({ projects }) => ({
      kpis: [
        { label: 'Projects in Scope', value: String(projects.length) },
        { label: 'Avg. Physical Progress', value: `${avg(projects.map((p) => p.physicalProgress))}%` },
        { label: 'Avg. Financial Progress', value: `${avg(projects.map((p) => p.financialProgress))}%` },
        { label: 'Total Sanctioned', value: formatCurrency(sum(projects.map((p) => p.sanctionedBudget))) },
      ],
      sections: [{
        heading: 'Progress by Project', columns: ['Project', 'District', 'Status', 'Reported %', 'Verified %', 'Certified %', 'Financial %'],
        rows: projects.map((p) => [p.name, p.district, p.status, p.reportedProgress, p.verifiedProgress, p.physicalProgress, p.financialProgress]),
      }],
    }),
  },
  {
    id: 'district', name: 'District Project Report', desc: 'District-wise summary of ongoing and completed hospital projects.',
    build: ({ projects }) => {
      const byDistrict = new Map<string, Project[]>();
      projects.forEach((p) => byDistrict.set(p.district, [...(byDistrict.get(p.district) ?? []), p]));
      return {
        kpis: [
          { label: 'Districts Covered', value: String(byDistrict.size) },
          { label: 'Total Projects', value: String(projects.length) },
          { label: 'Completed', value: String(projects.filter((p) => p.status === 'COMPLETED').length) },
          { label: 'Delayed', value: String(projects.filter((p) => p.status === 'DELAYED').length) },
        ],
        sections: [{
          heading: 'Summary by District', columns: ['District', 'Projects', 'Avg. Physical %', 'Total Sanctioned', 'Total Spent'],
          rows: Array.from(byDistrict.entries()).map(([d, ps]) => [d, ps.length, `${avg(ps.map((p) => p.physicalProgress))}%`, formatCurrency(sum(ps.map((p) => p.sanctionedBudget))), formatCurrency(sum(ps.map((p) => p.amountSpent)))]),
        }],
      };
    },
  },
  {
    id: 'financial', name: 'Financial Report', desc: 'Budget, expenditure and billing summary statewide.',
    build: ({ projects, inRange }) => {
      const bills = store.getState().bills.filter((b) => projects.some((p) => p.id === b.projectId) && inRange(b.submittedDate));
      return {
        kpis: [
          { label: 'Sanctioned Budget', value: formatCurrency(sum(projects.map((p) => p.sanctionedBudget))) },
          { label: 'Amount Released', value: formatCurrency(sum(projects.map((p) => p.amountReleased))) },
          { label: 'Amount Spent', value: formatCurrency(sum(projects.map((p) => p.amountSpent))) },
          { label: 'Bills Pending', value: String(outstandingBills(bills, store.getState().controlRecords).length) },
        ],
        sections: [{
          heading: 'Bills in Scope', columns: ['Bill No.', 'Project', 'Gross', 'Net Payable', 'Status', 'Submitted'],
          rows: bills.map((b) => [b.billNumber, projects.find((p) => p.id === b.projectId)?.name ?? '—', formatCurrency(b.grossAmount), formatCurrency(b.netPayable), b.status, b.submittedDate]),
        }],
      };
    },
  },
  {
    id: 'quality', name: 'Quality Report', desc: 'Inspection outcomes and quality scores by category.',
    build: ({ projects, inRange }) => {
      const inspections = store.getState().inspections.filter((i) => projects.some((p) => p.id === i.projectId) && i.status === 'COMPLETED' && inRange(i.completedDate));
      return {
        kpis: [
          { label: 'Inspections Completed', value: String(inspections.length) },
          { label: 'Pass Rate', value: `${inspections.length ? Math.round((inspections.filter((i) => i.overallResult === 'PASS').length / inspections.length) * 100) : 0}%` },
          { label: 'Failed', value: String(inspections.filter((i) => i.overallResult === 'FAIL').length) },
          { label: 'Avg. Score', value: `${avg(inspections.map((i) => i.score))}%` },
        ],
        sections: [{
          heading: 'Inspection Outcomes', columns: ['Project', 'Category', 'Result', 'Score', 'Date', 'Inspector'],
          rows: inspections.map((i) => [projects.find((p) => p.id === i.projectId)?.name ?? '—', i.category, i.overallResult, `${i.score}%`, i.completedDate ?? '—', i.inspector]),
        }],
      };
    },
  },
  {
    id: 'contractor', name: 'Contractor Performance', desc: 'Scorecard of all empanelled contractors.',
    build: ({ projects }) => {
      const contractorIds = new Set(projects.map((p) => p.contractorId));
      const contractors = store.getState().contractors.filter((c) => contractorIds.has(c.id));
      return {
        kpis: [
          { label: 'Contractors in Scope', value: String(contractors.length) },
          { label: 'Avg. Performance Score', value: `${avg(contractors.map((c) => c.performanceScore))}%` },
          { label: 'Avg. Quality Score', value: `${avg(contractors.map((c) => c.qualityScoreAvg))}%` },
          { label: 'Total Open Defects', value: String(sum(contractors.map((c) => c.openDefects))) },
        ],
        sections: [{
          heading: 'Contractor Scorecard', columns: ['Company', 'Performance', 'Schedule', 'Quality', 'Safety', 'Open Defects'],
          rows: contractors.map((c) => [c.company, `${c.performanceScore}%`, `${c.scheduleAdherence}%`, `${c.qualityScoreAvg}%`, `${c.safetyScore}%`, c.openDefects]),
        }],
      };
    },
  },
  {
    id: 'delay', name: 'Delay Report', desc: 'Projects behind schedule with delay reasons and recovery plans.',
    build: ({ projects }) => {
      const delayed = projects.filter((p) => p.delayDays > 0);
      return {
        kpis: [
          { label: 'Delayed Projects', value: String(delayed.length) },
          { label: 'Avg. Delay', value: `${avg(delayed.map((p) => p.delayDays))} days` },
          { label: 'Max Delay', value: `${delayed.length ? Math.max(...delayed.map((p) => p.delayDays)) : 0} days` },
          { label: '% of Portfolio Delayed', value: `${projects.length ? Math.round((delayed.length / projects.length) * 100) : 0}%` },
        ],
        sections: [{
          heading: 'Delayed Projects', columns: ['Project', 'District', 'Delay (days)', 'Reason', 'Recovery Plan'],
          rows: delayed.map((p) => [p.name, p.district, p.delayDays, p.delayReason ?? '—', p.recoveryPlan ?? '—']),
        }],
      };
    },
  },
  {
    id: 'safety', name: 'Safety Report', desc: 'PPE compliance, incidents and corrective actions.',
    build: ({ projects, inRange }) => {
      const records = store.getState().safetyRecords.filter((r) => projects.some((p) => p.id === r.projectId) && inRange(r.date));
      return {
        kpis: [
          { label: 'Safety Records', value: String(records.length) },
          { label: 'Open Issues', value: String(records.filter((r) => r.status === 'OPEN').length) },
          { label: 'Avg. PPE Compliance', value: `${avg(records.map((r) => r.ppeCompliance))}%` },
          { label: 'Accidents Recorded', value: String(records.filter((r) => r.type === 'ACCIDENT').length) },
        ],
        sections: [{
          heading: 'Safety Records', columns: ['Project', 'Type', 'Severity', 'Status', 'PPE %', 'Date'],
          rows: records.map((r) => [projects.find((p) => p.id === r.projectId)?.name ?? '—', r.type, r.severity, r.status, `${r.ppeCompliance}%`, r.date]),
        }],
      };
    },
  },
  {
    id: 'inspection', name: 'Inspection Report', desc: 'Detailed inspection checklist outcomes.',
    build: ({ projects, inRange }) => {
      const inspections = store.getState().inspections.filter((i) => projects.some((p) => p.id === i.projectId) && inRange(i.scheduledDate));
      return {
        kpis: [
          { label: 'Total Inspections', value: String(inspections.length) },
          { label: 'Scheduled', value: String(inspections.filter((i) => i.status === 'SCHEDULED').length) },
          { label: 'Completed', value: String(inspections.filter((i) => i.status === 'COMPLETED').length) },
          { label: 'Re-inspections', value: String(inspections.filter((i) => i.isReinspection).length) },
        ],
        sections: [{
          heading: 'Inspection Register', columns: ['Project', 'Category', 'Status', 'Result', 'Scheduled'],
          rows: inspections.map((i) => [projects.find((p) => p.id === i.projectId)?.name ?? '—', i.category, i.status, i.overallResult, i.scheduledDate]),
        }],
      };
    },
  },
  {
    id: 'workforce', name: 'Workforce Report', desc: 'Worker deployment, attendance and safety training status.',
    build: ({ projects }) => {
      const workers = store.getState().workers.filter((w) => projects.some((p) => p.id === w.projectId));
      return {
        kpis: [
          { label: 'Total Workers', value: String(workers.length) },
          { label: 'Present Today', value: String(workers.filter((w) => w.attendanceStatus === 'PRESENT').length) },
          { label: 'Safety Training Pending', value: String(workers.filter((w) => w.safetyTrainingStatus !== 'COMPLETED').length) },
          { label: 'Skilled Workers', value: String(workers.filter((w) => w.skillLevel === 'Skilled').length) },
        ],
        sections: [{
          heading: 'Workforce by Project', columns: ['Project', 'Total Workers', 'Present', 'Safety Training Pending'],
          rows: projects.map((p) => {
            const pw = workers.filter((w) => w.projectId === p.id);
            return [p.name, pw.length, pw.filter((w) => w.attendanceStatus === 'PRESENT').length, pw.filter((w) => w.safetyTrainingStatus !== 'COMPLETED').length];
          }),
        }],
      };
    },
  },
  {
    id: 'material', name: 'Material Report', desc: 'Material procurement, usage and quality test outcomes.',
    build: ({ projects }) => {
      const materials = store.getState().materials.filter((m) => projects.some((p) => p.id === m.projectId));
      const tests = store.getState().materialTests.filter((t) => projects.some((p) => p.id === t.projectId));
      return {
        kpis: [
          { label: 'Material Line Items', value: String(materials.length) },
          { label: 'Rejected on Delivery', value: String(materials.filter((m) => m.qualityStatus === 'REJECTED').length) },
          { label: 'Material Tests Conducted', value: String(tests.length) },
          { label: 'Test Pass Rate', value: `${tests.length ? Math.round((tests.filter((t) => t.result === 'PASS').length / tests.length) * 100) : 0}%` },
        ],
        sections: [{
          heading: 'Material Quality Status', columns: ['Project', 'Material', 'Ordered', 'Received', 'Quality Status'],
          rows: materials.slice(0, 200).map((m) => [projects.find((p) => p.id === m.projectId)?.name ?? '—', m.name, `${m.orderedQty} ${m.unit}`, `${m.receivedQty} ${m.unit}`, m.qualityStatus]),
        }],
      };
    },
  },
  {
    id: 'handover', name: 'Handover Report', desc: 'Commissioning and handover readiness by project.',
    build: ({ projects }) => {
      const handoverSteps = store.getState().handoverSteps.filter((h) => projects.some((p) => p.id === h.projectId));
      const readiness = (pid: string) => {
        const steps = handoverSteps.filter((h) => h.projectId === pid);
        return steps.length ? Math.round((steps.filter((s) => s.status === 'COMPLETED').length / steps.length) * 100) : 0;
      };
      return {
        kpis: [
          { label: 'Projects Near Handover', value: String(projects.filter((p) => p.physicalProgress >= 85).length) },
          { label: 'Fully Handed Over', value: String(projects.filter((p) => p.status === 'COMPLETED').length) },
          { label: 'Avg. Handover Readiness', value: `${avg(projects.map((p) => readiness(p.id)))}%` },
          { label: 'Commissioning Pending', value: String(projects.filter((p) => p.physicalProgress >= 85 && p.status !== 'COMPLETED').length) },
        ],
        sections: [{
          heading: 'Handover Readiness by Project', columns: ['Project', 'Physical Progress', 'Handover Readiness', 'Status'],
          rows: projects.map((p) => [p.name, `${p.physicalProgress}%`, `${readiness(p.id)}%`, p.status]),
        }],
      };
    },
  },
];

function avg(nums: number[]): number { return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0; }
function sum(nums: number[]): number { return nums.reduce((a, b) => a + b, 0); }

export function ReportsCenter() {
  useUiLanguage();
  const { t } = useTranslation();
  const { projects: scopedProjects, scopeLabel } = useProjectScope();
  const currentUser = useStore((s) => s.currentUser);
  const [district, setDistrict] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const projects = useMemo(() => district === 'ALL' ? scopedProjects : scopedProjects.filter((p) => p.district === district), [scopedProjects, district]);
  const inRange = (isoDate: string | undefined) => {
    if (!isoDate) return true;
    if (fromDate && isoDate < fromDate) return false;
    if (toDate && isoDate > toDate) return false;
    return true;
  };

  function exportReport(report: ReportDef) {
    const { kpis, sections } = report.build({ projects, inRange });
    if (sections.every((s) => s.rows.length === 0)) {
      toast.warning(uiText('No records match the selected filters — nothing to export.'));
      return;
    }
    downloadPdfReport({
      title: report.name,
      subtitle: report.desc,
      scopeLine: `${district === 'ALL' ? scopeLabel : district}${fromDate || toDate ? ` · ${fromDate || 'earliest'} to ${toDate || 'today'}` : ''}`,
      generatedBy: currentUser ? `${currentUser.name} (${currentUser.designation})` : 'System',
      kpis, sections,
      filename: `${report.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  }

  return (
    <div>
      <PageHeader title={uiText(t('pages.reports.title'))} description={uiText(t('pages.reports.desc'))} />

      <FundDisbursalReports projects={scopedProjects} scopeLabel={scopeLabel} />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <div>
            <p className="mb-1 text-[11px] font-medium text-slate-500">{uiText("District")}</p>
            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">{uiText("All Districts (within your jurisdiction)")}</SelectItem>{ALL_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{uiText(d)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-medium text-slate-500">{uiText("From Date")}</p>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm" />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-medium text-slate-500">{uiText("To Date")}</p>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy-700"><FileBarChart size={16} /></div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{uiText(r.name)}</p>
                  <p className="mt-0.5 text-[11.5px] text-slate-400">{uiText(r.desc)}</p>
                </div>
              </div>
              <div className="mt-3 flex justify-between">
                <span className="text-[10.5px] text-slate-400">{uiText(district === 'ALL' ? 'Statewide' : district)} · {projects.length}{uiText(" projects in scope")}</span>
                <Button size="sm" variant="outline" onClick={() => exportReport(r)}><Download size={12} />{uiText(" Export PDF")}</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
