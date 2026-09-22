import type { Bill, Project } from '../types';
import type { ControlRecord } from './projectControls';
import { todayDate } from './fundDisbursal';

/** All expenditure views use verified dated payments, net of dated reversals. */
export function ledgerTransactions(records: ControlRecord[], projectId: string, asOf = todayDate()) {
  const dated = records.filter(r => r.projectId === projectId && r.status === 'VERIFIED' && ['RECEIPT', 'PAYMENT', 'REVERSAL'].includes(r.kind) && !!r.fields.transactionDate && r.fields.transactionDate <= asOf);
  const reversed = new Set(dated.filter(r => r.kind === 'REVERSAL').map(r => r.fields.originalTransactionId));
  return dated.filter(r => r.kind !== 'REVERSAL' && !reversed.has(r.id));
}
export function reconcileProjects(projects: Project[], records: ControlRecord[], asOf = todayDate()): Project[] {
  return projects.map(p => {
    const tx = ledgerTransactions(records, p.id, asOf);
    const amountSpent = tx.filter(r => r.kind === 'PAYMENT').reduce((n,r) => n + Number(r.fields.amount), 0);
    const amountReleased = tx.filter(r => r.kind === 'RECEIPT').reduce((n,r) => n + Number(r.fields.amount), 0);
    return { ...p, amountSpent, amountReleased, financialProgress: p.sanctionedBudget ? Math.round(amountSpent / p.sanctionedBudget * 10000) / 100 : 0 };
  });
}
export function monthlyExpenditure(records: ControlRecord[], projectIds: Set<string>, asOf = todayDate()) {
  const end = new Date(`${asOf}T00:00:00Z`);
  const months = Array.from({ length: 13 }, (_, i) => {
    const date = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 12 + i, 1));
    return { month: date.toISOString().slice(0, 7), amount: 0, change: 0, changePct: null as number | null };
  });
  const eligible = records.filter(r => projectIds.has(r.projectId) && r.status === 'VERIFIED' && r.fields.transactionDate && r.fields.transactionDate <= asOf);
  const reversed = new Set<string>();
  for (const record of eligible) {
    let amount = 0;
    if (record.kind === 'PAYMENT') amount = Number(record.fields.amount);
    if (record.kind === 'REVERSAL' && !reversed.has(record.fields.originalTransactionId)) {
      const original = eligible.find(r => r.id === record.fields.originalTransactionId && r.projectId === record.projectId && r.kind === 'PAYMENT');
      if (original) { amount = -Number(original.fields.amount); reversed.add(original.id); }
    }
    const bucket = months.find(m => m.month === record.fields.transactionDate.slice(0,7));
    if (bucket) bucket.amount += amount;
  }
  return months.slice(1).map((m,i) => ({ ...m, change: m.amount - months[i].amount, changePct: months[i].amount ? (m.amount - months[i].amount) / Math.abs(months[i].amount) * 100 : null }));
}

/** Outstanding submitted liabilities; a legacy PAID label alone cannot settle a bill. */
export function outstandingBills(bills: Bill[], records: ControlRecord[], asOf = todayDate(), includeDrafts = false): Bill[] {
  return bills.filter(b => b.status !== 'REJECTED' && (includeDrafts || b.status !== 'DRAFT') && b.submittedDate <= asOf).flatMap(b => {
    const paid = ledgerTransactions(records, b.projectId, asOf).filter(r => r.kind === 'PAYMENT' && r.fields.billId === b.id).reduce((sum,r) => sum + Number(r.fields.amount), 0);
    const remaining = b.netPayable - paid;
    return remaining > 0.005 ? [{ ...b, status: b.status === 'PAID' ? 'APPROVED' as const : b.status, netPayable: remaining, paidDate: undefined }] : [];
  });
}
