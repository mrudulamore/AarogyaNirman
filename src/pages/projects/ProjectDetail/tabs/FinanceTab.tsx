import { uiText, useUiLanguage } from '../../../../i18n/ui';
import { RABillSubmission } from './RABillSubmission';
import { BillEvidence } from './BillEvidence';
import { FundDisbursalReports } from '../../../finance/FundDisbursalReports';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, FileCheck2, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend } from 'recharts';
import type { Project, BillStatus } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardContent, CardHeader, CardTitle, Button, StatusBadge, Table, THead, TBody, Tr, Th, Td } from '../../../../components/ui/primitives';
import { Dialog, DialogContent } from '../../../../components/ui/overlays';
import { KpiCard } from '../../../../components/common/KpiCard';
import { formatCurrency, formatCurrencyFull, formatDate } from '../../../../lib/utils';

// Bill status -> who it's currently pending with, in plain language (Part 22).
const PENDING_WITH: Partial<Record<BillStatus, string>> = {
  DRAFT: 'Contractor', SUBMITTED: 'Site Engineer', SITE_VERIFIED: 'Quality/Executive Engineer',
  QUALITY_VERIFIED: 'Executive Engineer', APPROVED: 'Finance / Commissioner',
};

function ageingDays(dateIso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(dateIso).getTime()) / 86400000));
}

/** Part 20-22: Finance simplified into one Project 360 tab — a senior user should understand
 * financial position within seconds via the primary KPI row, then drill into bill status,
 * payment timeline and variation impact. Answers: "How much has been certified/paid?" */
export function FinanceTab({ project }: { project: Project }) {
  useUiLanguage();
  const bills = useStore((s) => s.bills).filter((b) => b.projectId === project.id).sort((a, b) => (a.submittedDate < b.submittedDate ? 1 : -1));
  const measurements = useStore((s) => s.measurements).filter((m) => m.projectId === project.id);
  const changeOrders = useStore((s) => s.changeOrders).filter((c) => c.projectId === project.id);
  const currentUser = useStore((s) => s.currentUser);
  const verifyBillSite = useStore((s) => s.verifyBillSite);
  const verifyBillQuality = useStore((s) => s.verifyBillQuality);
  const approveBill = useStore((s) => s.approveBill);
  const rejectBill = useStore((s) => s.rejectBill);
  
  const verifyMeasurement = useStore((s) => s.verifyMeasurement);

  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [submitOpen, setSubmitOpen] = useState(params.get('action') === 'submit-bill' && currentUser?.role === 'CONTRACTOR');
  const [detailId, setDetailId] = useState<string | null>(null);

  const active = bills.find((b) => b.id === detailId);
  const activeMeasurements = measurements.filter((m) => m.billId === detailId);

  // ---- Primary KPIs ----
  const contractValue = project.workOrderValue || project.sanctionedBudget;
  const workCertified = bills.filter((b) => ['QUALITY_VERIFIED', 'APPROVED', 'PAID'].includes(b.status)).reduce((s, b) => s + b.netPayable, 0);
  const amountPaid = bills.filter((b) => b.status === 'PAID').reduce((s, b) => s + b.netPayable, 0);
  const pendingBills = bills.filter((b) => !['PAID', 'REJECTED'].includes(b.status));
  const pendingBillsValue = pendingBills.reduce((s, b) => s + b.netPayable, 0);
  const balanceContractValue = contractValue - amountPaid;

  // ---- Secondary KPIs ----
  const retentionHeld = bills.reduce((s, b) => s + b.retention, 0);
  const approvedVariations = changeOrders.filter((c) => c.status === 'APPROVED').reduce((s, c) => s + c.costImpact, 0);
  const currentApprovedCost = project.sanctionedBudget + approvedVariations;
  const totalDeductions = bills.reduce((s, b) => s + b.deductions, 0);
  const billsUnderReview = bills.filter((b) => ['SUBMITTED', 'SITE_VERIFIED', 'QUALITY_VERIFIED'].includes(b.status)).length;
  const paidBillsWithDates = bills.filter((b) => b.status === 'PAID' && b.paidDate);
  const avgProcessingDays = paidBillsWithDates.length
    ? Math.round(paidBillsWithDates.reduce((s, b) => s + (new Date(b.paidDate!).getTime() - new Date(b.submittedDate).getTime()) / 86400000, 0) / paidBillsWithDates.length)
    : 0;

  const gap = Math.abs(project.financialProgress - project.physicalProgress);

  // ---- Chart data (Part 24) — each chart supports one management decision, capped at 4 ----
  const progressReports = useStore((s) => s.progressReports).filter((r) => r.projectId === project.id).sort((a, b) => (a.date < b.date ? -1 : 1));
  const progressTrend = useMemo(() => {
    const start = new Date(project.startDate).getTime();
    const planned = new Date(project.plannedCompletionDate).getTime();
    const byMonth = new Map<string, { verified: number; count: number }>();
    progressReports.forEach((r) => {
      const key = r.date.slice(0, 7);
      const cur = byMonth.get(key) ?? { verified: 0, count: 0 };
      byMonth.set(key, { verified: Math.max(cur.verified, r.progressPct), count: cur.count + 1 });
    });
    const months = Array.from(byMonth.keys()).sort().slice(-8);
    return months.map((m) => {
      const monthMid = new Date(`${m}-15`).getTime();
      const plannedPct = Math.round(Math.min(100, Math.max(0, ((monthMid - start) / (planned - start)) * 100)));
      return { month: m, planned: plannedPct, verified: byMonth.get(m)!.verified, financial: Math.min(100, byMonth.get(m)!.verified + (project.financialProgress - project.physicalProgress)) };
    });
  }, [progressReports, project.startDate, project.plannedCompletionDate, project.financialProgress, project.physicalProgress]);

  const waterfallData = [
    { name: 'Sanctioned', value: project.sanctionedBudget },
    { name: 'Variations', value: approvedVariations },
    { name: 'Approved Cost', value: currentApprovedCost },
    { name: 'Contract Value', value: contractValue },
    { name: 'Certified', value: workCertified },
    { name: 'Paid', value: amountPaid },
    { name: 'Balance', value: balanceContractValue },
  ];

  const ageingBuckets = useMemo(() => {
    const buckets = { '0-7 Days': 0, '8-15 Days': 0, '16-30 Days': 0, '31-60 Days': 0, '60+ Days': 0 };
    pendingBills.forEach((b) => {
      const age = Math.round((Date.now() - new Date(b.submittedDate).getTime()) / 86400000);
      if (age <= 7) buckets['0-7 Days']++;
      else if (age <= 15) buckets['8-15 Days']++;
      else if (age <= 30) buckets['16-30 Days']++;
      else if (age <= 60) buckets['31-60 Days']++;
      else buckets['60+ Days']++;
    });
    return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
  }, [pendingBills]);

  const paymentTrend = useMemo(() => {
    const byMonth = new Map<string, { certified: number; paid: number }>();
    bills.forEach((b) => {
      if (['QUALITY_VERIFIED', 'APPROVED', 'PAID'].includes(b.status)) {
        const key = b.submittedDate.slice(0, 7);
        const cur = byMonth.get(key) ?? { certified: 0, paid: 0 };
        cur.certified += b.netPayable;
        byMonth.set(key, cur);
      }
      if (b.status === 'PAID' && b.paidDate) {
        const key = b.paidDate.slice(0, 7);
        const cur = byMonth.get(key) ?? { certified: 0, paid: 0 };
        cur.paid += b.netPayable;
        byMonth.set(key, cur);
      }
    });
    return Array.from(byMonth.entries()).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-8).map(([month, v]) => ({ month, ...v }));
  }, [bills]);

  return (
    <div className="space-y-4">
      <FundDisbursalReports projects={[project]} scopeLabel={project.name} />
      {/* A. Financial Summary — primary KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label={uiText("Sanctioned Cost")} value={formatCurrency(project.sanctionedBudget)} />
        <KpiCard label={uiText("Contract Value")} value={formatCurrency(contractValue)} />
        <KpiCard label={uiText("Work Certified")} value={formatCurrency(workCertified)} tone="blue" />
        <KpiCard label={uiText("Amount Paid")} value={formatCurrency(amountPaid)} tone="emerald" />
        <KpiCard label={uiText("Pending Bills")} value={formatCurrency(pendingBillsValue)} tone="amber" />
        <KpiCard label={uiText("Balance Contract Value")} value={formatCurrency(balanceContractValue)} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label={uiText("Financial Progress")} value={`${project.financialProgress}%`} />
        <KpiCard label={uiText("Retention Held")} value={formatCurrency(retentionHeld)} />
        <KpiCard label={uiText("Approved Variations")} value={formatCurrency(approvedVariations)} />
        <KpiCard label={uiText("Total Deductions")} value={formatCurrency(totalDeductions)} />
        <KpiCard label={uiText("Bills Under Review")} value={billsUnderReview} />
        <KpiCard label={uiText("Avg. Bill Processing")} value={`${avgProcessingDays}d`} />
      </div>

      {gap >= 12 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <AlertTriangle size={14} className="shrink-0" />
          <span>
            <strong>{uiText(project.financialProgress > project.physicalProgress ? 'Review Required' : 'Payment Lag')}</strong>{uiText(" — Physical ")}{project.physicalProgress}{uiText("% vs. Financial ")}{project.financialProgress}% ({gap}{uiText(" point gap).")}{uiText(project.financialProgress > project.physicalProgress ? ' Financial progress is ahead of certified physical work.' : ' Certified work is ahead of payments released.')}
          </span>
        </div>
      )}

      {/* Decision-oriented finance charts (max 4, each supports a management decision) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{uiText("Physical vs. Financial Progress")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={progressTrend} margin={{ top: 26, right: 25, bottom: 14, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                <RTooltip formatter={(v: any) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line label={{ position: 'top', fill: '#334155', fontSize: 10, formatter: (value: unknown) => typeof value === 'number' ? `${value}%` : String(value ?? '') }} type="monotone" dataKey="planned" name={uiText("Planned Physical")} stroke="#94a3b8" strokeDasharray="4 3" strokeWidth={2} dot={false} />
                <Line label={{ position: 'top', fill: '#334155', fontSize: 10, formatter: (value: unknown) => typeof value === 'number' ? `${value}%` : String(value ?? '') }} type="monotone" dataKey="verified" name={uiText("Verified Physical")} stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line label={{ position: 'bottom', fill: '#334155', fontSize: 10, formatter: (value: unknown) => typeof value === 'number' ? `${value}%` : String(value ?? '') }} type="monotone" dataKey="financial" name={uiText("Financial")} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{uiText("Sanction to Payment")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={waterfallData} layout="vertical" margin={{ left: 10, right: 55, top: 24, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(v)} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                <RTooltip formatter={(v: any) => formatCurrencyFull(v)} />
                <Bar label={{ position: 'right', fill: '#334155', fontSize: 10, formatter: (value: unknown) => typeof value === 'number' ? formatCurrency(value) : String(value ?? '') }} dataKey="value" fill="#265aa0" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{uiText("Bill Ageing")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ageingBuckets} margin={{ top: 26, right: 25, bottom: 14, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <RTooltip />
                <Bar label={{ position: 'top', fill: '#334155', fontSize: 10, formatter: (value: unknown) => typeof value === 'number' ? Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value) : String(value ?? '') }} dataKey="count" name={uiText("Bills")} radius={[3, 3, 0, 0]}>
                  {ageingBuckets.map((b, i) => <Cell key={i} fill={b.bucket === '60+ Days' || b.bucket === '31-60 Days' ? '#ef4444' : b.bucket === '16-30 Days' ? '#f59e0b' : '#3b82f6'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{uiText("Payment Trend")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={paymentTrend} margin={{ top: 26, right: 25, bottom: 14, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(v)} />
                <RTooltip formatter={(v: any) => formatCurrencyFull(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line label={{ position: 'top', fill: '#334155', fontSize: 10, formatter: (value: unknown) => typeof value === 'number' ? formatCurrency(value) : String(value ?? '') }} type="monotone" dataKey="certified" name={uiText("Certified")} stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line label={{ position: 'bottom', fill: '#334155', fontSize: 10, formatter: (value: unknown) => typeof value === 'number' ? formatCurrency(value) : String(value ?? '') }} type="monotone" dataKey="paid" name={uiText("Paid")} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* B. Bill Status */}
      <Card>
        <CardHeader>
          <CardTitle>{uiText("Bills")}</CardTitle>
          {currentUser?.role === 'CONTRACTOR' && <Button size="sm" onClick={() => setSubmitOpen(true)}><Plus size={13} />{uiText(" Submit RA Bill")}</Button>}
        </CardHeader>
        <Table>
          <THead><Tr><Th>{uiText("Bill No.")}</Th><Th>{uiText("Type")}</Th><Th>{uiText("Period")}</Th><Th>{uiText("Claimed")}</Th><Th>{uiText("Certified")}</Th><Th>{uiText("Paid")}</Th><Th>{uiText("Status")}</Th><Th>{uiText("Pending With")}</Th><Th>{uiText("Ageing")}</Th><Th /></Tr></THead>
          <TBody>
            {bills.map((b) => {
              const certified = ['QUALITY_VERIFIED', 'APPROVED', 'PAID'].includes(b.status) ? b.netPayable : 0;
              const paid = b.status === 'PAID' ? b.netPayable : 0;
              const age = ageingDays(b.submittedDate);
              return (
                <Tr key={b.id} onClick={() => setDetailId(b.id)}>
                  <Td className="font-medium text-slate-800">{uiText(b.billNumber)}</Td>
                  <Td>{uiText("RA Bill")}</Td>
                  <Td>{uiText(formatDate(b.periodFrom))} — {uiText(formatDate(b.periodTo))}</Td>
                  <Td>{uiText(formatCurrency(b.grossAmount))}</Td>
                  <Td>{uiText(certified ? formatCurrency(certified) : '—')}</Td>
                  <Td>{uiText(paid ? formatCurrency(paid) : '—')}</Td>
                  <Td><StatusBadge status={b.status} /></Td>
                  <Td className="text-[11px] text-slate-500">{uiText(PENDING_WITH[b.status] ?? '—')}</Td>
                  <Td className={age > 30 && !['PAID', 'REJECTED'].includes(b.status) ? 'font-medium text-red-600' : ''}>{uiText(['PAID', 'REJECTED'].includes(b.status) ? '—' : `${age}d`)}</Td>
                  <Td className="space-x-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {currentUser?.role === 'DEPUTY_ENGINEER' && b.status === 'SUBMITTED' && <Button size="sm" variant="outline" onClick={() => { try {  verifyBillSite(b.id); toast.success(uiText('Site-verified.'));  } catch (error) { toast.error(uiText((error as Error).message)); } }}>{uiText("Site Verify")}</Button>}
                    {currentUser?.role === 'EXECUTIVE_ENGINEER' && b.status === 'SITE_VERIFIED' && <Button size="sm" variant="outline" onClick={() => { verifyBillQuality(b.id); toast.success(uiText('Quality-verified.')); }}>{uiText("Quality Verify")}</Button>}
                    {currentUser?.role === 'EXECUTIVE_ENGINEER' && b.status === 'QUALITY_VERIFIED' && <Button size="sm" onClick={() => { try {  approveBill(b.id); toast.success(uiText('Bill approved.'));  } catch (error) { toast.error(uiText((error as Error).message)); } }}>{uiText("Approve")}</Button>}
                    {currentUser?.role === 'COMMISSIONER' && b.status === 'APPROVED' && <Button size="sm" variant="success" onClick={() => navigate(`/projects/${project.id}?tab=controls&kind=PAYMENT`)}>{uiText('Record verified payment')}</Button>}
                    {['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'COMMISSIONER'].includes(currentUser?.role ?? '') && ['SUBMITTED', 'SITE_VERIFIED', 'QUALITY_VERIFIED'].includes(b.status) && <Button size="sm" variant="destructive" onClick={() => { rejectBill(b.id, 'Discrepancy in measurement'); toast.error(uiText('Bill returned.')); }}>{uiText("Return")}</Button>}
                  </Td>
                </Tr>
              );
            })}
            {bills.length === 0 && <Tr><Td className="py-8 text-center text-slate-400"><span>{uiText("No bills submitted yet.")}</span></Td></Tr>}
          </TBody>
        </Table>
      </Card>

      {/* D. Variation / Change Impact */}
      {changeOrders.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{uiText("Variation / Change Impact")}</CardTitle></CardHeader>
          <Table>
            <THead><Tr><Th>{uiText("Change")}</Th><Th>{uiText("Cost Impact")}</Th><Th>{uiText("Status")}</Th></Tr></THead>
            <TBody>
              {changeOrders.map((c) => (
                <Tr key={c.id}>
                  <Td className="max-w-[260px] truncate font-medium text-slate-800">{uiText(c.title)}</Td>
                  <Td className={c.costImpact >= 0 ? 'text-amber-600' : 'text-emerald-600'}>{uiText(c.costImpact >= 0 ? '+' : '')}{uiText(formatCurrency(c.costImpact))}</Td>
                  <Td><StatusBadge status={c.status} label={uiText(c.status.replace(/_/g, ' '))} /></Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      {submitOpen && currentUser?.role === 'CONTRACTOR' && <RABillSubmission project={project} onClose={() => setSubmitOpen(false)} />}

      <Dialog open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)}>
        {active && (
          <DialogContent title={uiText(active.billNumber)} description={uiText(project.name)} size="lg">
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <Row label={uiText("Gross Amount")} value={formatCurrencyFull(active.grossAmount)} />
              <Row label={uiText("Deductions")} value={formatCurrencyFull(active.deductions)} />
              <Row label={uiText("GST")} value={formatCurrencyFull(active.gst)} />
              <Row label={uiText("Retention")} value={formatCurrencyFull(active.retention)} />
              <Row label={uiText("Penalty")} value={formatCurrencyFull(active.penalty)} />
              <Row label={uiText("Net Payable")} value={formatCurrencyFull(active.netPayable)} />
              <Row label={uiText("Site Verified By")} value={active.siteVerifiedBy ?? '—'} />
              <Row label={uiText("Quality Verified By")} value={active.qualityVerifiedBy ?? '—'} />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              <Row label={uiText("Work-order reference")} value={active.workOrderReference ?? 'Not recorded'} />
              <Row label={uiText("Bill date")} value={formatDate(active.invoiceDate)} />
              <Row label={uiText("Measurement reference")} value={active.measurementBookId ?? 'Not recorded'} />
              <Row label={uiText("Previous bill reference")} value={active.previousBillReference || 'First bill / not recorded'} />
            </div>
            {active.workDescription && <p className="mt-3 text-xs text-slate-600">{uiText(active.workDescription)}</p>}
            <BillEvidence attachments={active.attachments} />
            <p className="mt-4 mb-2 text-xs font-semibold text-slate-600">{uiText("Measurement Book Extract")}</p>
            <Table>
              <THead><Tr><Th>{uiText("Work Item")}</Th><Th>{uiText("Unit")}</Th><Th>{uiText("Previous")}</Th><Th>{uiText("Current")}</Th><Th>{uiText("Total")}</Th><Th>{uiText("Rate")}</Th><Th>{uiText("Amount")}</Th><Th /></Tr></THead>
              <TBody>
                {activeMeasurements.map((m) => (
                  <Tr key={m.id}>
                    <Td>{uiText(m.workItem)}</Td><Td>{uiText(m.unit)}</Td><Td>{m.previousQty}</Td><Td>{m.currentQty}</Td><Td>{m.totalQty}</Td>
                    <Td>{uiText(formatCurrencyFull(m.rate))}</Td><Td>{uiText(formatCurrencyFull(m.amount))}</Td>
                    <Td>{m.verified ? <StatusBadge status="APPROVED" label={uiText("Verified")} /> : currentUser?.role === 'DEPUTY_ENGINEER' ? <Button size="sm" variant="outline" onClick={() => { try { verifyMeasurement(m.id, currentUser?.name ?? 'Engineer'); } catch (error) { toast.error(uiText((error as Error).message)); } }}><FileCheck2 size={12} />{uiText(" Verify")}</Button> : <span>{uiText("Pending verification")}</span>}</Td>
                  </Tr>
                ))}
                {activeMeasurements.length === 0 && <Tr><Td className="py-4 text-center text-slate-400"><span>{uiText("No linked measurement entries.")}</span></Td></Tr>}
              </TBody>
            </Table>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  useUiLanguage();
  return <div><p className="text-[10.5px] uppercase text-slate-400">{uiText(label)}</p><p className="mt-0.5 font-medium text-slate-700">{uiText(value)}</p></div>;
}
