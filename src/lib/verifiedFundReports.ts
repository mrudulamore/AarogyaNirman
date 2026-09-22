import { outstandingBills } from './financeLedger';
import type { StoreState } from '../store/useStore';
import type { Bill, FundInstallment, Project } from '../types';
import { actualTransactions } from './projectControls';
import { buildFundReport, buildContractorFundReport } from './fundDisbursal';

export function verifiedFundReports(state: StoreState, projects: Project[], asOf: string) {
  const tx = projects.flatMap(p => actualTransactions(state, p.id, asOf));
  const installments: FundInstallment[] = tx.filter(r => r.kind === 'RECEIPT').map((r, index) => ({ id: r.id, projectId: r.projectId, number: index + 1, amount: Number(r.fields.amount), plannedDate: r.fields.transactionDate, receivedDate: r.fields.transactionDate, source: r.fields.accountingHead, reference: r.reference, purpose: r.fields.reason || r.reference, releaseCondition: 'Verified transaction', authority: r.reviewedBy! }));
  const paid: Bill[] = tx.filter(r => r.kind === 'PAYMENT').flatMap(r => { const bill = state.bills.find(b => b.id === r.fields.billId); return bill ? [{ ...bill, id: r.id, billNumber: `${bill.billNumber} / ${r.reference}`, netPayable: Number(r.fields.amount), paidDate: r.fields.transactionDate, status: 'PAID' as const }] : []; });
  const pending = outstandingBills(state.bills.filter(b => projects.some(p => p.id === b.projectId)), state.controlRecords, asOf);
  const contractor = buildContractorFundReport(projects, [...paid, ...pending], state.contractors, asOf);
  contractor.kpis = contractor.kpis.map(k => k.label === 'Paid bill count' ? { ...k, label: 'Verified payment count' } : k);
  contractor.summary.columns = contractor.summary.columns.map(c => c === 'Paid bill count' ? 'Verified payment count' : c);
  const references = new Set(installments.filter(r => r.reference).map(r => r.projectId + ":" + r.reference));
  const planned = state.fundInstallments.filter(r => projects.some(p => p.id === r.projectId) && !references.has(r.projectId + ":" + r.reference)).map(r => ({ ...r, receivedDate: undefined }));
  return { government: buildFundReport(projects, [...installments, ...planned], asOf), contractor };
}
