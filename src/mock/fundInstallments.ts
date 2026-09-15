import type { Project, FundInstallment } from '../types';

/** Illustrative prototype ledger, reconciled to existing project release totals.
 * These sample installments and conditions are not an approved government schedule.
 */
export function generateFundInstallments(projects: Project[], today: string): FundInstallment[] {
  return projects.flatMap((p) => {
    const rows: FundInstallment[] = [];
    const start = Math.min(Date.parse(p.startDate), Date.parse(today));
    const end = Date.parse(today);
    const date = (time: number) => new Date(time).toISOString().slice(0, 10);
    let allocated = 0;
    if (p.amountReleased > 0) {
      for (let i = 0; i < 3; i++) {
        const amount = i === 2 ? p.amountReleased - allocated : Math.floor(p.amountReleased / 3);
        allocated += amount;
        const receivedDate = date(start + (end - start) * (i + 1) / 4);
        rows.push({ id: `FUND-${p.id}-${i + 1}`, projectId: p.id, number: i + 1, amount,
          plannedDate: receivedDate, receivedDate, source: p.scheme, reference: `DEMO-${p.id}-${i + 1}`,
          purpose: ['Mobilisation and site preparation', 'Civil and structural works', 'Construction progress'][i],
          releaseCondition: 'Demo receipt recorded', authority: 'Health Department / Treasury' });
      }
    }
    const balance = Math.max(0, p.sanctionedBudget - p.amountReleased);
    const count = rows.length;
    allocated = 0;
    if (balance > 0) {
      for (let i = 0; i < 3; i++) {
        const amount = i === 2 ? balance - allocated : Math.floor(balance / 3);
        allocated += amount;
        rows.push({ id: `FUND-${p.id}-${count + i + 1}`, projectId: p.id, number: count + i + 1, amount,
          plannedDate: date(end + (i + 1) * 30 * 86400000), source: p.scheme,
          purpose: ['Next construction stage', 'Services and equipment', 'Completion and handover'][i],
          releaseCondition: ['Verified progress and utilisation certificate', 'Certified services completion and fund approval', 'Completion certificate and approved final release'][i],
          authority: 'Health Department / Treasury' });
      }
    }
    return rows;
  });
}
