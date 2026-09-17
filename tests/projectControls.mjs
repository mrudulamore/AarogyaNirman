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
  const { computeProjectScope } = await server.ssrLoadModule('/src/lib/scope.ts');
  const { validControl, workOrderGaps, handoverGaps, actualTransactions } = await server.ssrLoadModule('/src/lib/projectControls.ts');
  const { validateBillMeasurements } = await server.ssrLoadModule('/src/lib/billMeasurements.ts');
  const state = () => useStore.getState();
  state().login('CONTRACTOR');
  const contractor = state().currentUser;
  const project = state().projects.find(p => p.contractorId === contractor.contractorId && contractor.assignedProjectIds.includes(p.id));
  const other = { ...project, id: 'UNASSIGNED', division: project.division, executiveEngineerId: 'OTHER', siteEngineerId: 'OTHER' };
  const crossZone = { ...project, id: 'CROSS-ZONE', division: 'Another zone' };
  for (const role of ['CONTRACTOR', 'EXECUTIVE_ENGINEER', 'DEPUTY_ENGINEER']) {
    const user = { ...contractor, role, id: 'TEST-ACCOUNT', assignedProjectIds: [project.id, crossZone.id] };
    const scope = computeProjectScope(user, [project, other, crossZone], state().contractors);
    assert.deepEqual([...scope.projectIds], [project.id, crossZone.id]);
  }
  assert.equal(computeProjectScope({ ...contractor, contractorId: undefined }, state().projects, state().contractors).projects.length, 0);
  const file = new Blob(['%PDF-1.7\nSigned proof'], { type: 'application/pdf' }); evidence.set('proof', file);
  const attachments = [{ id: 'proof', name: 'proof.pdf', mimeType: file.type, size: file.size, category: 'SUPPORTING' }];
  const input = (kind, fields, reference, category = kind) => ({ kind, fields, reference, category, projectId: project.id, attachments });
  const submit = async data => { await state().submitControl(data); return state().controlRecords.at(-1); };
  const commissioner = () => state().login('COMMISSIONER');
  const engineer = () => state().login('EXECUTIVE_ENGINEER', project.executiveEngineerId);
  const review = async record => { commissioner(); await state().reviewControl(record.id, true, 'Checked signed source evidence'); };
  await assert.rejects(() => submit(input('MONTHLY', { month: '2026-01', progress: '101', workSummary: 'Work', nextMonthPlan: 'Next' }, 'MONTH-1')), /valid month/);
  const month = await submit(input('MONTHLY', { month: '2026-01', progress: '25', workSummary: 'Work', nextMonthPlan: 'Next' }, 'MONTH-1'));
  await assert.rejects(() => submit(input('MONTHLY', month.fields, 'MONTH-DUP')), /already exists for this month/);
  await review(month);
  state().login('CONTRACTOR');
  await assert.rejects(() => submit(input('CERTIFICATE', { applicability: 'NOT_APPLICABLE', authority: 'Authority' }, 'CERT-0', 'Lift permission')), /not-applicable/);
  const cert = await submit(input('CERTIFICATE', { applicability: 'APPLICABLE', authority: 'Authority', issueDate: '2025-01-01', expiryDate: '2025-12-31' }, 'CERT-1', 'Fire approval'));
  await review(cert); assert.equal(validControl(state().controlRecords.find(r => r.id === cert.id)), false);
  assert.ok(handoverGaps(state(), project.id).includes('Fire approval'));
  assert.ok(workOrderGaps(state(), project.id).length > 0);
  assert.throws(() => state().issueWorkOrder(project.id), /prerequisites|retroactively/);
  assert.throws(() => state().updateProject(project.id, { plannedCompletionDate: '2030-01-01' }), /verified contract controls/);
  useStore.setState({ boqItems: [{ id: 'BOQ-CONTROL', projectId: project.id, rate: 10, plannedQty: 10 }], measurements: [{ id: 'MEASURE-OLD', projectId: project.id, boqItemId: 'BOQ-CONTROL', currentQty: 8, location: 'A', measurementReference: 'MB-1' }] });
  const claim = { projectId: project.id, grossAmount: 30, measurementLines: [{ boqItemId: 'BOQ-CONTROL', quantity: 3, location: 'B', measurementReference: 'MB-2' }] };
  assert.throws(() => validateBillMeasurements(state(), claim), /exceeds/);
  engineer();
  const baseline = state().projects.find(p => p.id === project.id).originalCompletionDate;
  const variation = await submit(input('VARIATION', { contractClause: 'Clause 12', reason: 'Approved additional work', boqItemId: 'BOQ-CONTROL', quantityDelta: '5', rate: '10', scheduleDays: '3', authority: 'Authority' }, 'VAR-1'));
  await review(variation);
  assert.throws(() => validateBillMeasurements(state(), claim), /Link the approved variation/);
  claim.measurementLines[0].variationId = variation.id; validateBillMeasurements(state(), claim);
  assert.equal(state().projects.find(p => p.id === project.id).originalCompletionDate, baseline);
  assert.throws(() => validateBillMeasurements(state(), { ...claim, grossAmount: 10, measurementLines: [{ ...claim.measurementLines[0], quantity: 1, location: 'A', measurementReference: 'mb-1' }] }), /already been claimed/);
  engineer();
  const receipt = await submit(input('RECEIPT', { amount: '100', transactionDate: '2026-01-01', accountingHead: 'Health capital' }, 'TREASURY-1'));
  await review(receipt); assert.equal(actualTransactions(state(), project.id).length, 1);
  engineer();
  await assert.rejects(() => submit(input('RECEIPT', receipt.fields, 'TREASURY-1')), /already/);
  const reversal = await submit(input('REVERSAL', { originalTransactionId: receipt.id, transactionDate: '2026-02-01', accountingHead: 'Health capital', reason: 'Bank reversal' }, 'REV-1'));
  await review(reversal); assert.equal(actualTransactions(state(), project.id).length, 0);
  assert.equal(actualTransactions(state(), project.id, '2026-01-15').length, 1);
  assert.equal(state().projects.find(p => p.id === project.id).amountReleased, 0);
  engineer();
  const contract = await submit(input('CONTRACT', { contractClause: 'DLP 8', authority: 'Authority', commencementDate: '2026-01-01', liabilityMonths: '24', liabilityEndDate: '2028-01-01' }, 'CONTRACT-1'));
  await review(contract); engineer();
  const release = await submit(input('RELEASE', { contractId: contract.id, authority: 'Authority', reason: 'Requested clearance' }, 'RELEASE-1'));
  commissioner(); await assert.rejects(() => state().reviewControl(release.id, true, 'Checked'), /liability expiry/);
  assert.throws(() => state().completeHandoverAndOperationalize(project.id), /./);
  console.log('Project controls tests passed: assignment boundaries, cross-zone access, evidence, monthly duplicates, certificate expiry, work-order gates, measurement variations/duplicates, immutable baseline, ledger reversals and liability release gates.');
} finally { await server.close(); }
