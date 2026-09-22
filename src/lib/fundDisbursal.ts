import type { Project, FundInstallment } from '../types';
import type { PdfKpi, PdfSection } from './pdf';

export function todayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function buildFundReport(projects: Project[], installments: FundInstallment[], asOf: string) {
  const ids = new Set(projects.map((p) => p.id));
  const scoped = installments.filter((r) => ids.has(r.projectId));
  const received = scoped.filter((r) => r.receivedDate && r.receivedDate <= asOf)
    .sort((a, b) => a.receivedDate!.localeCompare(b.receivedDate!) || a.id.localeCompare(b.id));
  const pending = scoped.filter((r) => !r.receivedDate || r.receivedDate > asOf)
    .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate) || a.id.localeCompare(b.id));
  const total = received.reduce((sum, r) => sum + r.amount, 0);
  const planned = pending.reduce((sum, r) => sum + r.amount, 0);
  const budget = projects.reduce((sum, p) => sum + p.sanctionedBudget, 0);
  const money = (n: number) => `INR ${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? id;
  const status = (r: FundInstallment) => r.plannedDate < asOf ? 'Overdue' : 'Planned';
  const kpis: PdfKpi[] = [
    { label: 'Disbursed to date (INR)', value: total.toLocaleString('en-IN') },
    { label: 'Installments received', value: String(received.length) },
    { label: 'Planned balance (INR)', value: planned.toLocaleString('en-IN') },
    { label: 'Overdue installments', value: String(pending.filter((r) => status(r) === 'Overdue').length) },
  ];
  const summary: PdfSection = {
    heading: 'Project-wise Funds Received', columns: ['Project', 'Sanctioned', 'Received to date', 'Installments received', 'Last receipt', 'Pending plan'],
    rows: projects.map((p) => {
      const receipts = received.filter((r) => r.projectId === p.id);
      return [p.name, money(p.sanctionedBudget), money(receipts.reduce((sum, r) => sum + r.amount, 0)), receipts.length, receipts.at(-1)?.receivedDate ?? 'No receipts', money(pending.filter((r) => r.projectId === p.id).reduce((sum, r) => sum + r.amount, 0))];
    }),
  };
  const details: PdfSection = {
    heading: 'Installment Receipt Register', columns: ['Project / installment', 'Received on', 'Amount', 'Funding source', 'Reference', 'Purpose'],
    rows: received.map((r) => [`${projectName(r.projectId)} / ${r.number}`, r.receivedDate!, money(r.amount), r.source, r.reference || 'Not recorded', r.purpose]),
  };
  let cumulative = total;
  const roadmap: PdfSection = {
    heading: 'Fund Disbursal Roadmap', columns: ['Project / installment', 'Target date', 'Amount', 'Cumulative funds', 'Status', 'Release condition', 'Responsible authority'],
    rows: pending.map((r) => {
      cumulative += r.amount;
      return [`${projectName(r.projectId)} / ${r.number}`, r.plannedDate, money(r.amount), money(cumulative), status(r), r.releaseCondition, r.authority];
    }),
  };
  return { total, planned, budget, received, pending, kpis, summary, details, roadmap };
}

export function buildContractorFundReport(projects: Project[], bills: import('../types').Bill[], contractors: import('../types').Contractor[], asOf: string) {
  const ids = new Set(projects.map((p) => p.id));
  const scoped = bills.filter((b) => ids.has(b.projectId));
  const paid = scoped.filter((b) => b.status === 'PAID' && b.paidDate && b.paidDate <= asOf)
    .sort((a, b) => a.paidDate!.localeCompare(b.paidDate!));
  const undated = scoped.filter((b) => b.status === 'PAID' && !b.paidDate);
  const pending = scoped.filter((b) => !['PAID', 'REJECTED', 'DRAFT'].includes(b.status) && b.submittedDate <= asOf);
  const total = paid.reduce((sum, b) => sum + b.netPayable, 0);
  const money = (n: number) => `INR ${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const name = (id: string) => projects.find((p) => p.id === id)?.name ?? id;
  const company = (id: string) => contractors.find((c) => c.id === id)?.company ?? id;
  const nextStep: Record<string, string> = {
    SUBMITTED: 'Site Engineer: verify measurements', SITE_VERIFIED: 'Executive Engineer: quality verification',
    QUALITY_VERIFIED: 'Approving authority: approve bill', APPROVED: 'Finance: authorise and release payment',
  };
  const kpis: PdfKpi[] = [
    { label: 'Contractors paid (INR)', value: total.toLocaleString('en-IN') },
    { label: 'Paid bill count', value: String(paid.length) },
    { label: 'Pending bills (INR)', value: pending.reduce((sum, b) => sum + b.netPayable, 0).toLocaleString('en-IN') },
    { label: 'Paid bills missing dates', value: String(undated.length) },
  ];
  const summary: PdfSection = { heading: 'Project-wise Contractor Payments', columns: ['Project', 'Amount paid', 'Paid bill count', 'Last payment'], rows: projects.map((p) => {
    const records = paid.filter((b) => b.projectId === p.id);
    return [p.name, money(records.reduce((sum, b) => sum + b.netPayable, 0)), records.length, records.at(-1)?.paidDate ?? 'No dated payments'];
  }) };
  const details: PdfSection = { heading: 'Contractor Payment Register', columns: ['Project', 'Contractor', 'Bill reference', 'Payment date', 'Net paid'], rows: paid.map((b) => [name(b.projectId), company(b.contractorId), b.billNumber, b.paidDate!, money(b.netPayable)]) };
  const roadmap: PdfSection = { heading: 'Contractor Payment Pipeline (current workflow status)', columns: ['Project / Bill', 'Contractor', 'Submitted on', 'Net payable', 'Status', 'Next action', 'Payment target'], rows: pending.map((b) => [`${name(b.projectId)} / ${b.billNumber}`, company(b.contractorId), b.submittedDate, money(b.netPayable), b.status, nextStep[b.status] ?? 'Review required', 'Not scheduled']) };
  const missing: PdfSection = { heading: 'Paid Bills Excluded: Payment Date Missing', columns: ['Project', 'Bill reference', 'Net payable'], rows: undated.map((b) => [name(b.projectId), b.billNumber, money(b.netPayable)]) };
  return { total, paid, pending, kpis, summary, details, roadmap, missing };
}
