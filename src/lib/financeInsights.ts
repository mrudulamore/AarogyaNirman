import type { Project, Bill } from '../types';
import type { ControlRecord } from './projectControls';
import { ledgerTransactions, outstandingBills } from './financeLedger';
import { todayDate } from './fundDisbursal';

export interface FinanceDecision {
  id: string;
  projectId: string;
  category: 'budget' | 'funding' | 'ageing' | 'evidence';
  priority: 'critical' | 'review';
  amount: number;
  days?: number;
  count?: number;
  billId?: string;
  recordId?: string;
}
export function financeInsights(projects: Project[], bills: Bill[], records: ControlRecord[], asOf = todayDate()) {
  const ids = new Set(projects.map(p => p.id));
  const scopedBills = bills.filter(b => ids.has(b.projectId));
  const pending = outstandingBills(scopedBills, records, asOf);
  const decisions: FinanceDecision[] = [];
  let budget = 0, expenditure = 0, fundingGap = 0, agedAmount = 0, agedCount = 0, affectedProjects = 0;
  for (const project of projects) {
    const tx = ledgerTransactions(records, project.id, asOf);
    const paid = tx.filter(r => r.kind === 'PAYMENT');
    const spent = paid.reduce((n,r) => n + Number(r.fields.amount), 0);
    const received = tx.filter(r => r.kind === 'RECEIPT').reduce((n,r) => n + Number(r.fields.amount), 0);
    budget += project.sanctionedBudget;
    expenditure += spent;
    if (spent > project.sanctionedBudget) decisions.push({id:'budget-'+project.id,projectId:project.id,category:'budget',priority:'critical',amount:spent-project.sanctionedBudget});
    const approved = pending.filter(b => b.projectId === project.id && b.status === 'APPROVED').reduce((n,b) => n+b.netPayable,0);
    const gap = Math.max(0,approved-(received-spent));
    fundingGap += gap;
    if (gap > 0) {
      affectedProjects++;
      decisions.push({id:'funding-'+project.id,projectId:project.id,category:'funding',priority:'critical',amount:gap});
    }
    const unlinked = paid.filter(r => !scopedBills.some(b => b.id === r.fields.billId && b.projectId === project.id));
    if (unlinked.length) decisions.push({
      id:'evidence-'+project.id,projectId:project.id,category:'evidence',priority:'review',
      amount:unlinked.reduce((n,r)=>n+Number(r.fields.amount),0),count:unlinked.length,
      recordId:unlinked.length === 1 ? unlinked[0].id : undefined,
    });
  }
  for (const bill of pending) {
    const days = Math.floor((Date.parse(asOf)-Date.parse(bill.submittedDate))/86400000);
    if (days > 30) {
      agedCount++;
      agedAmount += bill.netPayable;
      decisions.push({id:'ageing-'+bill.id,projectId:bill.projectId,category:'ageing',priority:'review',amount:bill.netPayable,days,billId:bill.id});
    }
  }
  decisions.sort((a,b) => (a.priority === 'critical' ? 0 : 1)-(b.priority === 'critical' ? 0 : 1) || b.amount-a.amount || a.id.localeCompare(b.id));
  return { budget, expenditure, utilisation:budget > 0 ? expenditure/budget*100 : null, fundingGap, agedAmount, agedCount, affectedProjects, decisions };
}
