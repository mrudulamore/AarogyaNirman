import type { Contractor, Project, User } from '../types';

export function contractorAccount(firm: Contractor, projects: Project[], existing?: User): User {
  return {
    id: existing?.id ?? `ACCOUNT-${firm.id}`, name: existing?.name ?? firm.contactPerson,
    role: 'CONTRACTOR', designation: 'Contractor', department: firm.company,
    email: existing?.email ?? firm.email, phone: existing?.phone ?? firm.phone,
    contractorId: firm.id, assignedProjectIds: projects.filter(p => p.contractorId === firm.id).map(p => p.id),
    avatarInitials: (existing?.name ?? firm.contactPerson).split(' ').map(part => part[0]).slice(0, 2).join(''),
  };
}
