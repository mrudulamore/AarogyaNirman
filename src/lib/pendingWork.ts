import type { StoreState } from '../store/useStore';
import type { Role } from '../types';
import { computeProjectScope } from './scope';
import { activeControls, CERTIFICATES, validControl } from './projectControls';

export interface PendingWork { id: string; projectId: string; title: string; due: string; tab: string; ownerRole: Role; }
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
  for (const i of s.inspections) if (scope.has(i.projectId) && i.status !== 'COMPLETED' && (i.inspector === s.currentUser?.name || ['EXECUTIVE_ENGINEER', 'PROJECT_MANAGER'].includes(s.currentUser?.role ?? ''))) result.push({ id: i.id, projectId: i.projectId, title: `Inspection: ${i.category}`, due: i.scheduledDate, tab: 'inspections', ownerRole: s.currentUser!.role });
  for (const d of s.defects) if (scope.has(d.projectId) && d.status !== 'CLOSED') result.push({ id: d.id, projectId: d.projectId, title: d.description, due: d.dueDate, tab: 'defects', ownerRole: 'CONTRACTOR' });
  for (const p of s.projects.filter(p => scope.has(p.id))) {
    const records = activeControls(s, p.id);
    for (const r of records) if (r.fields.expiryDate && r.fields.expiryDate <= new Date(Date.parse(today) + 30 * 86400000).toISOString().slice(0, 10)) result.push({ id: r.id, projectId: p.id, title: `Renewal: ${r.category} / ${r.reference}`, due: r.fields.expiryDate, tab: 'controls', ownerRole: (r.fields.responsibleRole as Role) || 'EXECUTIVE_ENGINEER' });
    if (['COMPLETION', 'COMMISSIONING', 'HANDOVER'].includes(p.stage)) for (const category of CERTIFICATES) if (!records.some(r => r.kind === 'CERTIFICATE' && r.category === category)) result.push({ id: `${p.id}-${category}`, projectId: p.id, title: `Missing: ${category}`, due: p.plannedCompletionDate, tab: 'controls', ownerRole: 'EXECUTIVE_ENGINEER' });
  }
  return result.filter(r => !mine || r.ownerRole === s.currentUser?.role).sort((a, b) => a.due.localeCompare(b.due));
}

export function drawingWarning(s: Pick<StoreState, 'controlRecords'>, projectId: string, id?: string) {
  if (!id) return '';
  const drawing = s.controlRecords.find(r => r.id === id && r.projectId === projectId);
  return drawing && ((drawing.kind === 'DOCUMENT' && drawing.fields.documentType === 'Drawing') || (drawing.kind === 'PROCUREMENT' && drawing.category === 'Approved drawings / estimate')) && validControl(drawing) && activeControls(s, projectId).some(r => r.id === id) ? '' : 'This drawing revision is no longer approved/current. Select the latest verified revision.';
}
