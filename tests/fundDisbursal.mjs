import assert from 'node:assert/strict';
import { createServer } from 'vite';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};

globalThis.window = { localStorage: globalThis.localStorage };

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
try {
  const { buildFundReport, buildContractorFundReport } = await server.ssrLoadModule('/src/lib/fundDisbursal.ts');
  const { generateFundInstallments } = await server.ssrLoadModule('/src/mock/fundInstallments.ts');
  const projects = [{ id: 'A', name: 'Hospital A', sanctionedBudget: 1000, amountReleased: 400, startDate: '2026-01-01', scheme: 'State Plan' }];
  const ledger = generateFundInstallments(projects, '2026-09-15');
  const report = buildFundReport(projects, ledger, '2026-09-15');
  assert.equal(report.total, 400);
  assert.equal(report.planned, 600);
  assert.equal(report.received.length, 3);
  assert.equal(report.total + report.planned, report.budget);
  assert.equal(buildFundReport([], ledger, '2026-09-15').total, 0);
  assert.equal(buildFundReport(projects, ledger, '2025-12-31').total, 0);
  const first = report.received[0];
  assert.equal(buildFundReport(projects, ledger, first.receivedDate).total, first.amount);
  assert.equal(buildFundReport(projects, ledger, '2027-01-01').roadmap.rows[0][4], 'Overdue');
  const bills = [
    { id: '1', projectId: 'A', contractorId: 'C', status: 'PAID', netPayable: 100, paidDate: '2026-09-15', billNumber: 'B1' },
    { id: '2', projectId: 'A', contractorId: 'C', status: 'PAID', netPayable: 200, paidDate: '2026-09-16', billNumber: 'B2' },
    { id: '3', projectId: 'A', contractorId: 'C', status: 'PAID', netPayable: 50, billNumber: 'B3' },
    { id: '4', projectId: 'A', contractorId: 'C', status: 'APPROVED', netPayable: 80, submittedDate: '2026-09-01', billNumber: 'B4' },
    { id: '5', projectId: 'A', contractorId: 'C', status: 'REJECTED', netPayable: 90, submittedDate: '2026-09-01', billNumber: 'B5' },
    { id: '6', projectId: 'OTHER', contractorId: 'C', status: 'PAID', netPayable: 999, paidDate: '2026-09-15', billNumber: 'B6' },
  ];
  const payments = buildContractorFundReport(projects, bills, [{ id: 'C', company: 'Contractor C' }], '2026-09-15');
  assert.equal(payments.total, 100);
  assert.equal(payments.paid.length, 1);
  assert.equal(payments.pending.length, 1);
  assert.equal(payments.missing.rows.length, 1);
  assert.equal(payments.roadmap.rows[0][payments.roadmap.columns.indexOf('Payment target')], 'Not scheduled');
  assert.equal(payments.details.rows[0][1], 'Contractor C');
  console.log('Fund totals, reconciliation, installment counts, date boundaries, scope, overdue plans, and separate contractor payments passed.');

} finally {
  await server.close();
}
