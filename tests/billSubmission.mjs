import assert from 'node:assert/strict';
import { createServer } from 'vite';

const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
globalThis.window = { localStorage: globalThis.localStorage };
// Supply the evidence repository boundary; browser IndexedDB itself is not under test.
const evidence = new Map();
globalThis.indexedDB = { open: () => {
  const request = {};
  queueMicrotask(() => {
    request.result = { close() {}, transaction: () => ({ objectStore: () => ({ get: (id) => {
      const read = {};
      queueMicrotask(() => { read.result = evidence.get(id); read.onsuccess(); });
      return read;
    } }) }) };
    request.onsuccess();
  });
  return request;
} };

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
try {
  const { useStore } = await server.ssrLoadModule('/src/store/useStore.ts');
  const { saveBillFiles } = await server.ssrLoadModule('/src/lib/billAttachments.ts');
  const state = () => useStore.getState();
  state().login('CONTRACTOR');
  const project = state().projects.find(p => state().currentUser.assignedProjectIds.includes(p.id) && p.contractorId === state().currentUser.contractorId);
  assert.ok(project);
  useStore.setState({ boqItems: [...state().boqItems, { id: 'BOQ-TEST', projectId: project.id, item: 'Concrete', unit: 'm3', rate: 1000, plannedQty: 100, executedQty: 0, totalAmount: 100000 }] });
  const file = new Blob(['%PDF-1.7\nBill evidence'], { type: 'application/pdf' });
  evidence.set('signed', file);
  evidence.set('measurement', file);
  const bill = {
    billNumber: 'RA-TEST-001', projectId: project.id, contractorId: project.contractorId,
    periodFrom: '2026-01-01', periodTo: '2026-01-31', invoiceDate: '2026-02-01',
    workOrderReference: 'WO-100', measurementBookId: 'MB-1 pages 10-12', workDescription: 'BOQ 1: concrete work',
    grossAmount: 1000, gst: 180, deductions: 20, retention: 50, penalty: 0, netPayable: 1110,
    declarationAccepted: true,
    measurementLines: [{ boqItemId: 'BOQ-TEST', quantity: 1, location: 'Foundation A', measurementReference: 'MB-TEST-1' }],
    attachments: [{ id: 'signed', name: 'bill.pdf', category: 'SIGNED_BILL', mimeType: file.type, size: file.size },
      { id: 'measurement', name: 'measurement.pdf', category: 'MEASUREMENT', mimeType: file.type, size: file.size }],
  };
  const count = state().bills.length;
  for (const role of ['SUPERADMIN', 'MINISTER', 'COMMISSIONER', 'EXECUTIVE_ENGINEER', 'DEPUTY_ENGINEER', 'PROJECT_MANAGER', 'IT_ADMIN']) {
    state().login(role);
    await assert.rejects(() => state().submitBill(bill), /Only contractors/);
  }
  state().login('CONTRACTOR');
  for (const [change, message] of [
    [{ attachments: [] }, /signed RA bill/],
    [{ attachments: [bill.attachments[0]] }, /measurement proof/],
    [{ declarationAccepted: false }, /declaration/],
    [{ periodFrom: '2026-02-10' }, /billing period/],
    [{ periodTo: '2026-02-30' }, /billing period/],
    [{ grossAmount: NaN }, /valid non-negative/],
    [{ netPayable: 2000 }, /does not match/],
    [{ contractorId: 'OTHER' }, /own contracted projects/],
    [{ workOrderReference: '' }, /work-order reference/],
    [{ attachments: bill.attachments.map((item) => ({ ...item, size: 6 * 1024 * 1024 })) }, /5 MB/],
    [{ attachments: bill.attachments.map((item) => ({ ...item, id: `${item.id}-missing` })) }, /unavailable/],
  ]) await assert.rejects(() => state().submitBill({ ...bill, ...change }), message);
  const otherProject = state().projects.find((item) => item.contractorId !== project.contractorId);
  await assert.rejects(() => state().submitBill({ ...bill, projectId: otherProject.id, contractorId: otherProject.contractorId }), /own contracted projects/);
  assert.equal(state().bills.length, count);
  await assert.rejects(() => saveBillFiles([{ file: new File(['not a pdf'], 'fake.pdf', { type: 'application/pdf' }), category: 'SIGNED_BILL' }]), /does not contain a valid/);
  const saved = await state().submitBill(bill);
  assert.equal(saved.status, 'SUBMITTED');
  assert.equal(saved.submittedById, state().currentUser.id);
  assert.equal(state().bills.length, count + 1);
  const approval = state().approvals.find((item) => item.relatedBillId === saved.id);
  assert.deepEqual(approval.documents, ['bill.pdf', 'measurement.pdf']);
  await assert.rejects(() => state().submitBill({ ...bill, billNumber: ' ra-test-001 ' }), /already exists/);
  assert.throws(() => state().verifyBillSite(saved.id), /authorized reviewer/);
  assert.throws(() => state().approveBill(saved.id), /authorized reviewer/);
  assert.throws(() => state().markBillPaid(saved.id), /authorized reviewer/);
  assert.throws(() => state().decideApproval(approval.id, 'APPROVED', 'Self approval'), /authorized reviewer/);
  state().login('DEPUTY_ENGINEER', project.siteEngineerId);
  assert.throws(() => state().decideApproval(approval.id, 'APPROVED', 'Measurements checked'), /Verify each measurement/);
  for (const m of state().measurements.filter(m => m.billId === saved.id)) state().verifyMeasurement(m.id, 'Ignored client identity');
  state().decideApproval(approval.id, 'APPROVED', 'Measurements checked');
  assert.equal(state().bills.find((item) => item.id === saved.id).status, 'SITE_VERIFIED');
  state().login('EXECUTIVE_ENGINEER', project.executiveEngineerId);
  state().decideApproval(approval.id, 'APPROVED', 'Quality checked');
  assert.equal(state().bills.find((item) => item.id === saved.id).status, 'APPROVED');
  state().login('COMMISSIONER');

  state().decideApproval(approval.id, 'APPROVED', 'Payment authorized');
  assert.equal(state().bills.find(b => b.id === saved.id).status, 'APPROVED');
  assert.throws(() => state().markBillPaid(saved.id), /bank or treasury/);
  state().login('EXECUTIVE_ENGINEER', project.executiveEngineerId);
  await state().submitControl({ projectId: project.id, kind: 'PAYMENT', category: 'PAYMENT', reference: 'BANK-TEST-1', fields: { billId: saved.id, transactionDate: '2026-02-02', accountingHead: 'Hospital works', amount: String(saved.netPayable) }, attachments: [bill.attachments[0]] });
  const payment = state().controlRecords.at(-1);
  await assert.rejects(() => state().reviewControl(payment.id, true, 'Self review'), /authorized/);
  state().login('COMMISSIONER');
  await state().reviewControl(payment.id, true, 'Bank reference reconciled');
  state().markBillPaid(saved.id);
  assert.equal(state().bills.find(b => b.id === saved.id).status, 'PAID');
  assert.equal(state().projects.find(p => p.id === project.id).amountSpent, saved.netPayable);
  await assert.rejects(() => state().reviewControl(payment.id, true, 'Repeat'), /independent reviewer/);
  console.log('RA bill tests passed: roles, scope, mandatory proof, dates, amounts, duplicate submission, missing files, file signature, reviewer chain and payment idempotency.');
} finally { await server.close(); }
