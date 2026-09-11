import type { Milestone } from '../types';

/** A milestone is "delivered" once certified — everything before that is still in the verification pipeline. */
export function isMilestoneDelivered(status: Milestone['status']): boolean {
  return status === 'CERTIFIED' || status === 'BILL_ELIGIBLE' || status === 'PAID';
}

/** Overdue is deliberately derived, not stored — a milestone is overdue if its planned finish has
 * passed and it hasn't yet been certified. */
export function isMilestoneOverdue(m: Milestone, today: Date = new Date()): boolean {
  if (isMilestoneDelivered(m.status)) return false;
  return new Date(m.plannedDate).getTime() < today.getTime();
}

/** Are all of this milestone's dependencies certified? Used to gate submission. */
export function dependenciesSatisfied(m: Milestone, all: Milestone[]): boolean {
  return m.dependencies.every((depId) => {
    const dep = all.find((x) => x.id === depId);
    return dep ? isMilestoneDelivered(dep.status) : true;
  });
}
