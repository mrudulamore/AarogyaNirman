import { outstandingBills } from './financeLedger';
import type { StoreState } from '../store/useStore';
import type { Role } from '../types';
import { computeProjectScope } from './projectScope';
import { activeControls, CERTIFICATES, validControl } from './projectControls';

export interface PendingWork { billId?: string; id: string; projectId: string; title: string; due: string; tab: string; ownerRole: Role; }
export interface EscalationPolicy { approvalDays: number; firstDays: number; secondDays: number; firstRole: Role; secondRole: Role; }
export const DEFAULT_ESCALATION: EscalationPolicy = { approvalDays: 7, firstDays: 3, secondDays: 7, firstRole: 'EXECUTIVE_ENGINEER', secondRole: 'COMMISSIONER' };
export const daysLate = (due: string, today: string) => Math.max(0, Math.floor((Date.parse(today) - Date.parse(due)) / 86400000));
export function pendingWork(s: StoreState, today: string, policy = DEFAULT_ESCALATION, mine = true): PendingWork[] {
  const result: PendingWork[] = [];
  const scope = computeProjectScope(s.currentUser, s.projects, s.contractors).projectIds;
  for (const a of s.approvals) if (scope.has(a.projectId) && a.status === 'PENDING') {
    const date = new Date(a.history.at(-1)?.timestamp ?? a.submittedDate);
    date.setUTCDate(date.getUTCDate() + policy.approvalDays);
    result.push({ id: a.id, projectId: a.projectId, title: a.type.replaceAll('_', ' '), due: date.toISOString().slice(0, 10), tab: 'approvals', ownerRole: a.chain[a.currentStepIndex] });
  }
  for (const m of s.milestones) if (scope.has(m.projectId) && !['CERTIFIED', 'BILL_ELIGIBLE', 'PAID'].includes(m.status)) result.push({ id: m.id, projectId: m.projectId, title: m.name, due: m.plannedDate, tab: 'milestones', ownerRole: ['NOT_STARTED', 'IN_PROGRESS', 'CORRECTION_REQUIRED'].includes(m.status) ? 'CONTRACTOR' : 'EXECUTIVE_ENGINEER' });
  for (const i of s.inspections) {
    if (!scope.has(i.projectId) || i.status === 'COMPLETED') continue;
    const ownerRole: Role = i.status === 'PENDING_REVIEW' || !i.assignedToId ? 'EXECUTIVE_ENGINEER' : 'DEPUTY_ENGINEER';
    if (mine && s.currentUser?.role === 'DEPUTY_ENGINEER' && i.assignedToId !== s.currentUser.id) continue;
    result.push({ id: i.id, projectId: i.projectId, title: (i.status === 'PENDING_REVIEW' ? 'Review inspection: ' : i.status === 'REVERIFY' ? 'Reverify inspection: ' : 'Inspection: ') + i.category, due: i.scheduledDate, tab: 'inspections', ownerRole });
  }
  for (const d of s.defects) if (scope.has(d.projectId) && d.status !== 'CLOSED') result.push({ id: d.id, projectId: d.projectId, title: d.description, due: d.dueDate, tab: 'defects', ownerRole: 'CONTRACTOR' });
  const billOwners: Record<string, Role> = { DRAFT: 'CONTRACTOR', SUBMITTED: 'DEPUTY_ENGINEER', SITE_VERIFIED: 'EXECUTIVE_ENGINEER', QUALITY_VERIFIED: 'EXECUTIVE_ENGINEER', APPROVED: 'COMMISSIONER' };
  for (const b of outstandingBills(s.bills, s.controlRecords, today, true)) if (scope.has(b.projectId) && billOwners[b.status]) {
    const due = new Date(Date.parse(b.submittedDate) + policy.approvalDays * 86400000).toISOString().slice(0,10);
    result.push({ id: `bill-${b.id}`, billId: b.id, projectId: b.projectId, title: `Bill: ${b.billNumber}`, due, tab: 'finance', ownerRole: billOwners[b.status] });
  }
  for (const r of s.controlRecords) if (scope.has(r.projectId) && r.status === 'PENDING') result.push({ id: `control-${r.id}`, projectId: r.projectId, title: `${r.category}: ${r.reference}`, due: new Date(Date.parse(r.submittedAt) + policy.approvalDays * 86400000).toISOString().slice(0,10), tab: r.kind === 'MONTHLY' ? 'monthly' : 'controls', ownerRole: ['PAYMENT','RECEIPT','REVERSAL'].includes(r.kind) ? 'COMMISSIONER' : 'EXECUTIVE_ENGINEER' });
  for (const p of s.projects.filter(p => scope.has(p.id))) {
    const records = activeControls(s, p.id);
    for (const r of records) if (r.fields.expiryDate && r.fields.expiryDate <= new Date(Date.parse(today) + 30 * 86400000).toISOString().slice(0, 10)) result.push({ id: r.id, projectId: p.id, title: `Renewal: ${r.category} / ${r.reference}`, due: r.fields.expiryDate, tab: 'controls', ownerRole: (r.fields.responsibleRole as Role) || 'EXECUTIVE_ENGINEER' });
    if (['COMPLETION', 'COMMISSIONING', 'HANDOVER'].includes(p.stage)) for (const category of CERTIFICATES) if (!records.some(r => r.kind === 'CERTIFICATE' && r.category === category)) result.push({ id: `${p.id}-${category}`, projectId: p.id, title: `Missing: ${category}`, due: p.plannedCompletionDate, tab: 'controls', ownerRole: 'EXECUTIVE_ENGINEER' });
  }
  return result.filter(r => !mine || s.currentUser?.role === 'SUPERADMIN' || r.ownerRole === s.currentUser?.role || (s.currentUser?.role === 'PROJECT_MANAGER' && ['CONTRACTOR','DEPUTY_ENGINEER','EXECUTIVE_ENGINEER'].includes(r.ownerRole))).sort((a, b) => a.due.localeCompare(b.due));
}

export function drawingWarning(s: Pick<StoreState, 'controlRecords'>, projectId: string, id?: string) {
  if (!id) return '';
  const drawing = s.controlRecords.find(r => r.id === id && r.projectId === projectId);
  return drawing && ((drawing.kind === 'DOCUMENT' && drawing.fields.documentType === 'Drawing') || (drawing.kind === 'PROCUREMENT' && drawing.category === 'Approved drawings / estimate')) && validControl(drawing) && activeControls(s, projectId).some(r => r.id === id) ? '' : 'This drawing revision is no longer approved/current. Select the latest verified revision.';
}
