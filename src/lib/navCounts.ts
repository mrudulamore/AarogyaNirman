import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useProjectScope } from './scope';

/** Part 3: nav counters — every value here is derived live from the same store data the
 * target module renders, never a hardcoded number. Only shown for nav items where a count
 * genuinely aids decision-making (projects, approvals, defects, inspections, bills,
 * notifications) — not applied to every menu item to avoid clutter. */
export function useNavCounts(): Partial<Record<string, number>> {
  const { projectIds, projects } = useProjectScope();
  const currentUser = useStore((s) => s.currentUser);
  const approvals = useStore((s) => s.approvals);
  const defects = useStore((s) => s.defects);
  const inspections = useStore((s) => s.inspections);
  const bills = useStore((s) => s.bills);
  const notifications = useStore((s) => s.notifications);
  const tenders = useStore((s) => s.tenders);

  return useMemo(() => {
    const myPendingApprovals = approvals.filter((a) => projectIds.has(a.projectId) && a.status === 'PENDING' && a.chain[a.currentStepIndex] === currentUser?.role).length;
    const criticalDefects = defects.filter((d) => projectIds.has(d.projectId) && d.severity === 'CRITICAL' && d.status !== 'CLOSED').length;
    const pendingInspections = inspections.filter((i) => projectIds.has(i.projectId) && i.status === 'SCHEDULED').length;
    const pendingBills = bills.filter((b) => projectIds.has(b.projectId) && !['PAID', 'REJECTED'].includes(b.status)).length;
    const unreadNotifications = notifications.filter((n) => currentUser && n.targetRoles.includes(currentUser.role) && !n.read).length;
    const preAwardTenders = tenders.filter((t) => projectIds.has(t.projectId) && t.status !== 'WORK_ORDER_ISSUED' && t.status !== 'CANCELLED').length;

    return {
      projects: projects.length,
      approvals: myPendingApprovals,
      defects: criticalDefects,
      quality: pendingInspections,
      finance: pendingBills,
      notifications: unreadNotifications,
      tenders: preAwardTenders,
    };
  }, [projects, projectIds, approvals, defects, inspections, bills, notifications, tenders, currentUser]);
}
