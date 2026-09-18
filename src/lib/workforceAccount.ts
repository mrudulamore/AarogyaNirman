import type { Worker, User } from '../types';
export function workforceAccount(worker: Worker): User {
  return { id: `WORKFORCE-${worker.id}`, workerId: worker.id, name: worker.name, role: 'WORKFORCE', designation: worker.role,
    department: 'Site workforce', email: '', phone: worker.phone, assignedProjectIds: [],
    avatarInitials: worker.name.split(' ').map(n => n[0]).slice(0, 2).join('') };
}
