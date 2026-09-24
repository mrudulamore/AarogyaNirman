import type { Contractor, Inspection, Project, Role, User } from '../types';
import { contractorAccount } from './contractorAccount';

export function inspectionAccounts(users: User[], projects: Project[], contractors: Contractor[]): User[] {
  const accounts = users.map(user => {
    const firm = user.role === 'CONTRACTOR' ? contractors.find(c => c.id === user.contractorId) : undefined;
    return firm ? contractorAccount(firm, projects, user) : user;
  });
  for (const firm of contractors) {
    if (!accounts.some(user => user.role === 'CONTRACTOR' && user.contractorId === firm.id)) accounts.push(contractorAccount(firm, projects));
  }
  return accounts;
}

// Junior Engineer is represented by DEPUTY_ENGINEER in the existing role model.
export const INSPECTION_OPERATOR_ROLES: Role[] = ['DEPUTY_ENGINEER'];
export const INSPECTION_ASSIGNEE_ROLES: Role[] = ['DEPUTY_ENGINEER'];
export function canReviewInspection(user: User | null): boolean {
  return user?.role === 'EXECUTIVE_ENGINEER';
}

export function canManageInspection(user: User | null, inspection: Inspection): boolean {
  if (!user || !INSPECTION_OPERATOR_ROLES.includes(user.role)) return false;
  return inspection.assignedToId === user.id;
}

export function inspectionAssignmentRoles(user: User | null): Role[] {
  return canReviewInspection(user) ? INSPECTION_ASSIGNEE_ROLES : [];
}
