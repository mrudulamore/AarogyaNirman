import type { BillAttachment, Role } from '../types';
import type { StoreState } from '../store/useStore';
import { computeProjectScope } from './scope';
import { todayDate } from './fundDisbursal';
import { readBillFile } from './billAttachments';

export type ControlKind = 'CERTIFICATE' | 'PROCUREMENT' | 'VARIATION' | 'EXTENSION' | 'CONTRACT' | 'QUALITY' | 'RECEIPT' | 'PAYMENT' | 'REVERSAL' | 'RELEASE' | 'MONTHLY' | 'DOCUMENT';
export interface ControlRecord {
  id: string; projectId: string; kind: ControlKind; category: string; reference: string;
  fields: Record<string, string>; attachments: BillAttachment[]; status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  submittedBy: string; submittedAt: string; reviewedBy?: string; reviewedAt?: string; decision?: string;
  supersedesId?: string;
}
export type ControlInput = Omit<ControlRecord, 'id' | 'status' | 'submittedBy' | 'submittedAt' | 'reviewedBy' | 'reviewedAt' | 'decision'>;
export interface ControlActions {
  submitControl: (input: ControlInput) => Promise<void>;
  reviewControl: (id: string, approve: boolean, decision: string) => Promise<void>;
  issueWorkOrder: (projectId: string) => void;
}
export const CERTIFICATES = ['Building / occupancy', 'Fire approval', 'Electrical safety', 'Lift permission', 'MPCB consent / BMW', 'AERB licence', 'Completion certificate', 'As-built drawings', 'Commissioning acceptance', 'Health authority acceptance'];
export const PROCUREMENT = ['DPR', 'Land / site possession', 'Administrative approval', 'Expenditure sanction', 'Technical sanction', 'Approved drawings / estimate', 'Budget availability', 'Tender publication / corrigenda', 'Bidder eligibility', 'Evaluation minutes', 'Conflict declarations', 'Award approval', 'Performance security', 'Insurance'];
export const KIND_LABELS: Record<ControlKind, string> = { CERTIFICATE: 'Certificate register', PROCUREMENT: 'Procurement file', VARIATION: 'Contract variation', EXTENSION: 'Extension of Time', CONTRACT: 'Contract terms', QUALITY: 'Quality evidence', RECEIPT: 'Government receipt', PAYMENT: 'Contractor payment', REVERSAL: 'Transaction reversal', RELEASE: 'Security release', MONTHLY: 'Monthly report', DOCUMENT: 'Submit Documents' };
export const CONTROL_FIELDS: Record<ControlKind, string[]> = {
  CERTIFICATE: ['authority', 'issueDate', 'expiryDate', 'applicability', 'reason'],
  PROCUREMENT: ['authority', 'issueDate', 'expiryDate', 'portalReference', 'version', 'amount', 'reason'],
  VARIATION: ['contractClause', 'reason', 'boqItemId', 'quantityDelta', 'rate', 'scheduleDays', 'authority'],
  EXTENSION: ['contractClause', 'reason', 'scheduleDays', 'authority', 'hindranceReference'],
  CONTRACT: ['authority', 'contractClause', 'commencementDate', 'liabilityMonths', 'liabilityEndDate', 'reason'],
  QUALITY: ['inspectionId', 'defectId', 'testPlanReference', 'sampleReference', 'laboratory', 'standardVersion', 'drawingVersion', 'result', 'reason'],
  RECEIPT: ['transactionDate', 'accountingHead', 'amount', 'reason'],
  PAYMENT: ['billId', 'transactionDate', 'accountingHead', 'amount', 'reason'],
  REVERSAL: ['originalTransactionId', 'transactionDate', 'accountingHead', 'reason'],
  RELEASE: ['contractId', 'authority', 'reason'],
  MONTHLY: ['month', 'progress', 'workSummary', 'workforce', 'issues', 'nextMonthPlan'],
  DOCUMENT: ['documentType', 'version', 'reason'],
};
const reviewers: Role[] = ['EXECUTIVE_ENGINEER', 'COMMISSIONER', 'CIVIL_SURGEON'];
const financeKinds: ControlKind[] = ['RECEIPT', 'PAYMENT', 'REVERSAL', 'RELEASE'];
export function controlAccess(s: StoreState, projectId: string, roles?: Role[]) {
  const user = s.currentUser;
  if (!user || roles && !roles.includes(user.role) || !computeProjectScope(user, s.projects, s.contractors).projectIds.has(projectId)) throw new Error('This action requires an assigned, authorized user.');
  return user;
}
export function activeControls(s: Pick<StoreState, 'controlRecords'>, projectId: string) {
  const records = s.controlRecords.filter(r => r.projectId === projectId && r.status === 'VERIFIED');
  return records.filter(r => !records.some(next => next.supersedesId === r.id));
}
export function validControl(r: ControlRecord, date = todayDate()) {
  return r.status === 'VERIFIED' && (!r.fields.expiryDate || r.fields.expiryDate >= date) && (!r.fields.issueDate || r.fields.issueDate <= date);
}
export function workOrderGaps(s: StoreState, projectId: string) {
  const records = activeControls(s, projectId);
  const gaps = PROCUREMENT.filter(category => !records.some(r => r.kind === 'PROCUREMENT' && r.category === category && validControl(r)));
  if (!records.some(r => r.kind === 'CONTRACT')) gaps.push('Contract terms');
  const project = s.projects.find(p => p.id === projectId);
  const budget = records.find(r => r.kind === 'PROCUREMENT' && r.category === 'Budget availability');
  if (budget && Number(budget.fields.amount) < (project?.workOrderValue || project?.tenderAmount || project?.sanctionedBudget || 0)) gaps.push('Insufficient approved budget');
  return gaps;
}
export function handoverGaps(s: StoreState, projectId: string) {
  const records = activeControls(s, projectId);
  const gaps = CERTIFICATES.filter(category => !records.some(r => r.kind === 'CERTIFICATE' && r.category === category && validControl(r)));
  if (s.defects.some(d => d.projectId === projectId && d.status !== 'CLOSED')) gaps.push('Open Defects');
  if (s.inspections.some(i => i.projectId === projectId && i.overallResult === 'FAIL' && !s.inspections.some(next => next.parentInspectionId === i.id && next.overallResult === 'PASS' && records.some(r => r.kind === 'QUALITY' && r.fields.inspectionId === next.id && r.fields.result === 'PASS')))) gaps.push('Unresolved failed inspections');
  const items = s.commissioning.filter(c => c.projectId === projectId);
  if (!items.length || items.some(c => c.status !== 'READY')) gaps.push('Commissioning Pending');
  const steps = s.handoverSteps.filter(h => h.projectId === projectId);
  if (!steps.length || steps.some(h => h.status !== 'COMPLETED')) gaps.push('Handover Steps');
  return gaps;
}
export function actualTransactions(s: StoreState, projectId: string, asOf = todayDate()) {
  const records = activeControls(s, projectId).filter(r => !['PAYMENT', 'RECEIPT', 'REVERSAL'].includes(r.kind) || r.fields.transactionDate <= asOf);
  return records.filter(r => ['PAYMENT', 'RECEIPT'].includes(r.kind) && !records.some(reversal => reversal.kind === 'REVERSAL' && reversal.fields.originalTransactionId === r.id));
}
const positive = (v: string) => Number.isFinite(Number(v)) && Number(v) > 0;
const dateValid = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
export function validateControl(s: StoreState, input: ControlInput, reviewing = false) {
  const user = controlAccess(s, input.projectId);
  if (!Object.hasOwn(CONTROL_FIELDS, input.kind)) throw new Error('Invalid record type.');
  if (['MINISTER', 'VIGILANCE_AUDIT', 'IT_ADMIN'].includes(user.role)) throw new Error('Read-only role.');
  if (financeKinds.includes(input.kind) && !['COMMISSIONER', 'EXECUTIVE_ENGINEER'].includes(user.role)) throw new Error('Only finance reviewers can record transactions.');
  if (!reviewing && input.kind === 'MONTHLY' && user.role !== 'CONTRACTOR') throw new Error('Only contractors can submit monthly reports.');
  if (!input.reference.trim() || !input.attachments.length) throw new Error('A reference and uploaded evidence are required.');
  if (input.attachments.length > 6 || new Set(input.attachments.map(a => a.id)).size !== input.attachments.length) throw new Error('Attach up to six distinct evidence files.');
  if (s.controlRecords.some(r => r.id !== (input as ControlRecord).id && r.projectId === input.projectId && r.kind === input.kind && r.reference.toLowerCase().trim() === input.reference.toLowerCase().trim())) throw new Error('This reference already exists.');
  const f = input.fields;
  if (input.supersedesId) {
    if (!['CERTIFICATE', 'PROCUREMENT', 'CONTRACT', 'DOCUMENT', 'MONTHLY', 'QUALITY'].includes(input.kind)) throw new Error('Transactions and contract adjustments cannot be overwritten.');
    const old = s.controlRecords.find(r => r.id === input.supersedesId && r.projectId === input.projectId && r.kind === input.kind && r.category === input.category && r.status === 'VERIFIED');
    if (!old || !activeControls(s, input.projectId).some(r => r.id === old.id)) throw new Error('Only the current verified version may be superseded.');
  }
  if (['CERTIFICATE', 'PROCUREMENT', 'CONTRACT'].includes(input.kind) && activeControls(s, input.projectId).some(r => r.kind === input.kind && r.category === input.category) && !input.supersedesId) throw new Error('Link the current verified version before submitting a replacement.');
  for (const key of ['issueDate', 'expiryDate', 'transactionDate', 'commencementDate', 'liabilityEndDate']) if (f[key] && !dateValid(f[key])) throw new Error('Enter valid calendar dates.');
  if (f.issueDate && (f.issueDate > todayDate() || f.expiryDate && f.expiryDate < f.issueDate)) throw new Error('Certificate dates are inconsistent.');
  if (input.kind === 'CERTIFICATE') {
    if (!CERTIFICATES.includes(input.category) || !f.authority?.trim() || !['APPLICABLE', 'NOT_APPLICABLE'].includes(f.applicability)) throw new Error('Specify the certificate authority and applicability.');
    if (f.applicability === 'NOT_APPLICABLE' ? !f.reason?.trim() : !f.issueDate || !f.expiryDate) throw new Error('Provide certificate dates or a supported not-applicable reason.');
  }
  if (input.kind === 'PROCUREMENT' && (!PROCUREMENT.includes(input.category) || !f.authority?.trim() || !f.issueDate || !f.version?.trim() || !f.portalReference?.trim())) throw new Error('Provide the authority, issue date, version and source reference.');
  if (input.kind === 'PROCUREMENT' && ['Insurance', 'Performance security'].includes(input.category) && !f.expiryDate) throw new Error('Security and insurance expiry dates are required.');
  if (input.kind === 'PROCUREMENT' && input.category === 'Budget availability' && !positive(f.amount)) throw new Error('Enter the available approved budget.');
  if (['VARIATION', 'EXTENSION'].includes(input.kind) && (!f.contractClause?.trim() || !f.reason?.trim() || !f.authority?.trim() || !Number.isInteger(Number(f.scheduleDays)) || Number(f.scheduleDays) < 0)) throw new Error('Provide the contract clause, cause, authority and schedule impact.');
  if (input.kind === 'VARIATION') {
    const item = s.boqItems.find(b => b.id === f.boqItemId && b.projectId === input.projectId);
    if (!item || !positive(f.quantityDelta) || Number(f.rate) !== item.rate) throw new Error('Select a BOQ item, positive additional quantity and its approved rate.');
  }
  if (input.kind === 'EXTENSION' && (!positive(f.scheduleDays) || !f.hindranceReference?.trim())) throw new Error('Provide extension days and the hindrance reference.');
  if (input.kind === 'CONTRACT' && (!f.contractClause?.trim() || !f.authority?.trim() || !dateValid(f.commencementDate) || !positive(f.liabilityMonths) || !Number.isInteger(Number(f.liabilityMonths)) || !dateValid(f.liabilityEndDate) || f.liabilityEndDate <= f.commencementDate)) throw new Error('Enter signed contract terms, liability commencement, duration and end date.');
  if (input.kind === 'CONTRACT' && input.supersedesId && !f.reason?.trim()) throw new Error('Explain the signed amendment to the liability terms.');
  if (input.kind === 'RELEASE' && (!f.contractId || !f.authority?.trim() || !f.reason?.trim())) throw new Error('Select the verified contract, release authority and clearance details.');
  if (input.kind === 'DOCUMENT' && (!f.documentType?.trim() || !f.version?.trim())) throw new Error('Document type and version are required.');
  if (input.kind === 'QUALITY') {
    if (!s.inspections.some(i => i.id === f.inspectionId && i.projectId === input.projectId) || ['testPlanReference', 'sampleReference', 'laboratory', 'standardVersion', 'drawingVersion'].some(k => !f[k]?.trim()) || !['PASS', 'FAIL'].includes(f.result)) throw new Error('Link the inspection, approved test plan, sample, laboratory, drawing and standard versions.');
    const inspection = s.inspections.find(i => i.id === f.inspectionId)!;
    if (inspection.overallResult === 'FAIL' && f.result === 'PASS') throw new Error('Create a reinspection instead of overwriting a failed result.');
    if (f.defectId && !s.defects.some(d => d.id === f.defectId && d.projectId === input.projectId && [inspection.id, inspection.parentInspectionId].includes(d.sourceInspectionId))) throw new Error('The defect must belong to this inspection.');
    if (inspection.isReinspection && f.result === 'PASS' && (!f.defectId || !s.defects.some(d => d.id === f.defectId && d.correctiveActionNotes?.trim()))) throw new Error('Link the defect and its corrective-action record for reinspection.');
  }
  if (['RECEIPT', 'PAYMENT', 'REVERSAL'].includes(input.kind)) {
    if (s.controlRecords.some(r => r.id !== (input as ControlRecord).id && ['RECEIPT', 'PAYMENT', 'REVERSAL'].includes(r.kind) && r.reference.trim().toLowerCase() === input.reference.trim().toLowerCase())) throw new Error('This transaction reference is already recorded.');
    if (!f.accountingHead?.trim() || !dateValid(f.transactionDate) || f.transactionDate > todayDate()) throw new Error('Provide a valid transaction date and accounting head.');
    if (input.kind !== 'REVERSAL' && !positive(f.amount)) throw new Error('Enter a positive transaction amount.');
  }
  if (input.kind === 'PAYMENT' && !s.bills.some(b => b.id === f.billId && b.projectId === input.projectId && ['APPROVED', 'PAID'].includes(b.status))) throw new Error('Payment requires an approved bill.');
  if (input.kind === 'REVERSAL' && (!f.reason?.trim() || !actualTransactions(s, input.projectId).some(r => r.id === f.originalTransactionId))) throw new Error('Select an unreversed transaction and give a reason.');
  if (input.kind === 'MONTHLY' && (!/^\d{4}-(0[1-9]|1[0-2])$/.test(f.month) || f.month > todayDate().slice(0, 7) || !f.workSummary?.trim() || !f.nextMonthPlan?.trim() || !Number.isFinite(Number(f.progress)) || Number(f.progress) < 0 || Number(f.progress) > 100)) throw new Error('Provide a valid month, progress, work summary and next-month plan.');
  if (input.kind === 'MONTHLY' && s.controlRecords.some(r => r.id !== (input as ControlRecord).id && r.kind === 'MONTHLY' && r.projectId === input.projectId && r.fields.month === f.month && r.status !== 'REJECTED' && r.id !== input.supersedesId)) throw new Error('A report already exists for this month.');
}

export function createControlActions(set: (fn: (s: StoreState) => Partial<StoreState>) => void, get: () => StoreState): ControlActions {
  async function checkEvidence(record: ControlInput) {
    for (const a of record.attachments) { if (a.size <= 0 || a.size > 5 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(a.mimeType)) throw new Error('Use PDF, JPEG or PNG evidence up to 5 MB.'); const file = await readBillFile(a.id); if (file.size !== a.size || file.type !== a.mimeType) throw new Error('Evidence file metadata does not match.'); }
  }
  return {
    submitControl: async input => {
      input = { ...input, fields: Object.fromEntries(Object.entries(input.fields).filter(([key]) => CONTROL_FIELDS[input.kind]?.includes(key))) };
      validateControl(get(), input); const userId = get().currentUser!.id;
      await checkEvidence(input); validateControl(get(), input);
      if (get().currentUser?.id !== userId) throw new Error('Your account changed. Reopen the form.');
      const record: ControlRecord = { ...structuredClone(input), id: crypto.randomUUID(), status: 'PENDING', submittedBy: userId, submittedAt: new Date().toISOString() };
      set(s => ({ controlRecords: [...s.controlRecords, record] }));
      get().logAction(`Submitted ${KIND_LABELS[input.kind]}: ${input.reference}`, get().projects.find(p => p.id === input.projectId)?.name);
    },
    reviewControl: async (id, approve, decision) => {
      const initial = get().controlRecords.find(r => r.id === id);
      if (!initial) throw new Error('Record not found.');
      const roles: Role[] = financeKinds.includes(initial.kind) || ['VARIATION', 'EXTENSION', 'CONTRACT'].includes(initial.kind) ? ['COMMISSIONER'] : reviewers;
      const user = controlAccess(get(), initial.projectId, roles);
      if (initial.submittedBy === user.id || initial.status !== 'PENDING' || !decision.trim()) throw new Error('An independent reviewer and decision notes are required.');
      if (approve) await checkEvidence(initial);
      const s = get(); controlAccess(s, initial.projectId, roles);
      if (s.currentUser?.id !== user.id || s.controlRecords.find(r => r.id === id)?.status !== 'PENDING') throw new Error('The account or record changed. Refresh and retry.');
      const f = initial.fields;
      if (approve) validateControl(s, initial, true);
      if (approve && initial.supersedesId && !activeControls(s, initial.projectId).some(r => r.id === initial.supersedesId)) throw new Error('A newer version has already been approved.');
      if (approve && ['PAYMENT', 'REVERSAL'].includes(initial.kind)) {
        const transactions = actualTransactions(s, initial.projectId);
        if (initial.kind === 'PAYMENT') {
          const bill = s.bills.find(b => b.id === f.billId && b.projectId === initial.projectId && ['APPROVED', 'PAID'].includes(b.status));
          const paid = transactions.filter(t => t.kind === 'PAYMENT' && t.fields.billId === f.billId).reduce((sum, t) => sum + Number(t.fields.amount), 0);
          if (!bill || paid + Number(f.amount) > bill.netPayable + 0.005) throw new Error('Payment exceeds the remaining approved bill amount.');
        } else if (!transactions.some(t => t.id === f.originalTransactionId)) throw new Error('This transaction has already been reversed.');
      }
      if (approve && initial.kind === 'RELEASE') {
        const contract = activeControls(s, initial.projectId).find(r => r.id === f.contractId && r.kind === 'CONTRACT');
        if (activeControls(s, initial.projectId).some(r => r.kind === 'RELEASE' && r.fields.contractId === f.contractId)) throw new Error('Security release has already been verified.');
        if (!contract || contract.fields.liabilityEndDate >= todayDate() || s.defects.some(d => d.projectId === initial.projectId && d.status !== 'CLOSED') || s.bills.some(b => b.projectId === initial.projectId && !['PAID', 'REJECTED'].includes(b.status))) throw new Error('Security cannot be released before liability expiry and clearance of outstanding obligations.');
      }
      const updated = { ...initial, status: approve ? 'VERIFIED' as const : 'REJECTED' as const, reviewedBy: user.id, reviewedAt: new Date().toISOString(), decision };
      // Apply the decision and its financial/schedule effect in one state update.
      set(state => {
        const controlRecords = state.controlRecords.map(r => r.id === id ? updated : r);
        let projects = state.projects;
        let bills = state.bills;
        if (approve && ['VARIATION', 'EXTENSION'].includes(initial.kind)) projects = projects.map(p => p.id !== initial.projectId ? p : { ...p, revisedEstimate: (p.revisedEstimate || p.workOrderValue || p.tenderAmount || p.sanctionedBudget) + (initial.kind === 'VARIATION' ? Number(f.quantityDelta) * Number(f.rate) : 0), plannedCompletionDate: new Date(Date.parse(p.plannedCompletionDate) + Number(f.scheduleDays) * 86400000).toISOString().slice(0, 10) });
        if (approve && ['PAYMENT', 'RECEIPT', 'REVERSAL'].includes(initial.kind)) {
          const tx = actualTransactions({ ...state, controlRecords }, initial.projectId);
          const spent = tx.filter(r => r.kind === 'PAYMENT').reduce((n, r) => n + Number(r.fields.amount), 0);
          const received = tx.filter(r => r.kind === 'RECEIPT').reduce((n, r) => n + Number(r.fields.amount), 0);
          projects = projects.map(p => p.id !== initial.projectId ? p : { ...p, amountSpent: spent, amountReleased: received, financialProgress: p.sanctionedBudget ? Math.min(100, spent / p.sanctionedBudget * 100) : 0 });
          bills = bills.map(b => {
            if (b.projectId !== initial.projectId || !tx.some(r => r.fields.billId === b.id) && !controlRecords.some(r => r.kind === 'PAYMENT' && r.fields.billId === b.id && r.status === 'VERIFIED')) return b;
            const paid = tx.filter(r => r.kind === 'PAYMENT' && r.fields.billId === b.id).reduce((n, r) => n + Number(r.fields.amount), 0);
            return { ...b, status: paid + 0.005 >= b.netPayable ? 'PAID' : 'APPROVED', paidDate: paid + 0.005 >= b.netPayable ? tx.filter(r => r.kind === 'PAYMENT' && r.fields.billId === b.id).map(r => r.fields.transactionDate).sort().at(-1) : undefined };
          });
        }
        return { controlRecords, projects, bills };
      });
      get().logAction(`${updated.status} ${KIND_LABELS[initial.kind]} ${initial.reference}: ${decision}`, s.projects.find(p => p.id === initial.projectId)?.name);
    },
    issueWorkOrder: projectId => {
      const s = get(); controlAccess(s, projectId, ['COMMISSIONER', 'EXECUTIVE_ENGINEER']);
      if (!s.projects.some(p => p.id === projectId && ['ADMIN_SANCTION', 'TECHNICAL_SANCTION', 'DESIGN', 'TENDER'].includes(p.stage))) throw new Error('A work order cannot be issued twice or retroactively.');
      const gaps = workOrderGaps(s, projectId); if (gaps.length) throw new Error(`Work-order prerequisites missing: ${gaps.join(', ')}`);
      set(state => ({ projects: state.projects.map(p => p.id === projectId ? { ...p, stage: 'WORK_ORDER' } : p), tenders: state.tenders.map(t => t.projectId === projectId ? { ...t, status: 'WORK_ORDER_ISSUED', workOrderDate: todayDate() } : t) }));
      get().logAction('Issued work order after verification of procurement prerequisites', s.projects.find(p => p.id === projectId)?.name);
    },
  };
}
