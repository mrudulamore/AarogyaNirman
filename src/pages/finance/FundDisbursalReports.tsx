import { uiMessage, uiText, useUiLanguage } from '../../i18n/ui';
import { useState } from 'react';
import type { Project } from '../../types';
import { useStore } from '../../store/useStore';
import { buildFundReport, buildContractorFundReport, todayDate } from '../../lib/fundDisbursal';
import { downloadPdfReport, type PdfSection } from '../../lib/pdf';
import { formatCurrency } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent, Button, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/primitives';
import { KpiCard } from '../../components/common/KpiCard';
import { Download } from 'lucide-react';

const titles = { government: 'Government Fund Receipts', contractor: 'Contractor Payments', roadmap: 'Fund Disbursal Roadmap' };
type ReportKind = keyof typeof titles;

export function FundDisbursalReports({ projects, scopeLabel }: { projects: Project[]; scopeLabel: string }) {
  useUiLanguage();
  const installments = useStore((s) => s.fundInstallments);
  const bills = useStore((s) => s.bills);
  const contractors = useStore((s) => s.contractors);
  const user = useStore((s) => s.currentUser);
  const [projectId, setProjectId] = useState('ALL');
  const [asOf, setAsOf] = useState(todayDate);
  const [kind, setKind] = useState<ReportKind>('government');
  const selected = projectId === 'ALL' ? projects : projects.filter((p) => p.id === projectId);
  const government = buildFundReport(selected, installments, asOf);
  const contractor = buildContractorFundReport(selected, bills, contractors, asOf);
  const valid = !!asOf && asOf <= todayDate();
  const sections = kind === 'government' ? [government.summary, government.details]
    : kind === 'contractor' ? [contractor.summary, contractor.details, ...(contractor.missing.rows.length ? [contractor.missing] : [])]
    : [government.roadmap, contractor.roadmap];
  function exportPdf() {
    downloadPdfReport({ title: titles[kind], subtitle: `As of ${asOf} | Prototype data; funding plans are illustrative.`,
      scopeLine: selected.length === 1 ? selected[0].name : scopeLabel,
      generatedBy: user?.name ?? 'System', kpis: kind === 'contractor' ? contractor.kpis : government.kpis,
      sections: [...sections, { heading: 'Report basis', columns: ['Notes'], rows: [
        ['Government installments and targets are illustrative demo data, not an approved disbursal schedule.'],
        ['Contractor payment counts represent paid bills, not individual bank transfer installments.'],
        ['Paid bills without payment dates are excluded. Pending bill workflow statuses are current; payment target dates are not recorded.'],
      ] }], filename: `${kind}_fund_report_${asOf}.pdf` });
  }
  return <Card className="my-4">
    <CardHeader><CardTitle>{uiText("Fund Disbursal Reports")}</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-xs text-slate-500">{uiText("Track government receipts and contractor payments separately. Government installment entries and release conditions are illustrative demo data reconciled to the prototype totals.")}</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-medium text-slate-600">{uiText("Project")}<select className="h-9 rounded-md border border-slate-300 bg-white px-2" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="ALL">{uiText("All projects in scope")}</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">{uiText("As of date")}<input type="date" max={todayDate()} value={asOf} onChange={(e) => setAsOf(e.target.value)} className="h-9 rounded-md border border-slate-300 px-2" />
        </label>
        <Button variant="outline" onClick={exportPdf} disabled={!valid || !selected.length}><Download size={14} />{uiText(" Export ")}{uiText(kind === 'roadmap' ? 'Roadmap' : 'Report')}{uiText(" PDF")}</Button>
      </div>
      {!valid ? <p role="alert" className="text-sm text-red-600">{uiText("Choose a valid date up to today.")}</p> : <>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <KpiCard label={uiText("Government funds received")} value={formatCurrency(government.total)} sub={uiMessage('{{0}} installments received by {{1}}', [government.received.length, asOf])} />
          <KpiCard label={uiText("Contractors paid")} value={formatCurrency(contractor.total)} sub={uiMessage('{{0}} paid bills with payment dates', [contractor.paid.length])} />
          <KpiCard label={uiText("Government releases planned")} value={formatCurrency(government.planned)} sub={uiMessage('{{0}} installments outstanding', [government.pending.length])} />
          <KpiCard label={uiText("Contractor bills pending")} value={formatCurrency(contractor.pending.reduce((sum, b) => sum + b.netPayable, 0))} sub={uiText('Current workflow; payment dates not scheduled')} />
        </div>
        <div className="flex flex-wrap gap-2" aria-label={uiText("Fund report type")}>
          {(Object.keys(titles) as ReportKind[]).map((key) => <Button key={key} variant={kind === key ? 'primary' : 'outline'} aria-pressed={kind === key} onClick={() => setKind(key)}>{uiText(titles[key])}</Button>)}
        </div>
        {kind === 'contractor' && <p className="text-xs text-slate-500">{uiText("Each paid bill is one recorded payment. Bank transfer installments and transaction references are not recorded in the current billing data. Undated payments are excluded from date-based totals.")}</p>}
        {kind === 'roadmap' && <p className="text-xs text-slate-500">{uiText("Government targets are indicative and subject to approval. Cumulative funds include receipts through the selected date plus scheduled releases in date order. Contractor workflow statuses are current, not a historical snapshot; future payment dates are not yet recorded.")}</p>}
        {sections.map((section) => <ReportTable key={section.heading} section={section} />)}
      </>}
    </CardContent>
  </Card>;
}

function ReportTable({ section }: { section: PdfSection }) {
  useUiLanguage();
  return <section>
    <h3 className="mb-2 text-sm font-semibold text-slate-800">{uiText(section.heading)}</h3>
    {section.rows.length ? <div className="max-h-96 overflow-auto rounded-md border border-slate-200">
      <Table><THead><Tr>{section.columns.map((c) => <Th key={c}>{uiText(c)}</Th>)}</Tr></THead>
        <TBody>{section.rows.map((row, i) => <Tr key={i}>{row.map((cell, j) => <Td key={j}>{uiText(cell)}</Td>)}</Tr>)}</TBody>
      </Table>
    </div> : <p className="rounded-md bg-slate-50 p-4 text-xs text-slate-500">{uiText("No records for the selected project and date.")}</p>}
  </section>;
}
