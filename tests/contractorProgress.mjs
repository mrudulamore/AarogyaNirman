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
  const state = () => useStore.getState();
  state().login('SUPERADMIN');
  const admin = state().currentUser;
  state().login('CONTRACTOR');
  const contractor = state().currentUser;
  assert.equal(contractor.role, 'CONTRACTOR');
  assert.equal(contractor.designation, 'Contractor');
  assert.notEqual(contractor.id, admin.id);
  assert.notEqual(contractor.email, admin.email);
  const project = state().projects.find(p => p.contractorId === contractor.contractorId);
  assert.ok(project);
  const report = { projectId: project.id, date: '2026-09-18', stage: 'Structure', progressPct: 80, workersPresent: 1, weather: 'Clear', materialsReceived: 'None', materialsUsed: 'None', issues: 'None', photoIds: [], videoCount: 0, submittedBy: 'Forged name', location: 'Site', timestamp: new Date().toISOString() };
  const count = state().progressReports.length;
  await assert.rejects(() => state().addProgressReport(report), /supporting documents/);
  const blob = new Blob(['%PDF-1.7 evidence'], { type: 'application/pdf' });
  evidence.set('progress-test', blob);
  const attachments = [{ id: 'progress-test', name: 'progress.pdf', size: blob.size, mimeType: blob.type, category: 'SUPPORTING' }];
  await assert.rejects(() => state().addProgressReport({ ...report, attachments, progressPct: 101 }), /between 0 and 100/);
  await assert.rejects(() => state().addProgressReport({ ...report, attachments: [{ ...attachments[0], id: 'missing' }] }), /unavailable/);
  const other = state().projects.find(p => p.contractorId !== contractor.contractorId);
  await assert.rejects(() => state().addProgressReport({ ...report, attachments, projectId: other.id }), /authorized/);
  assert.equal(state().progressReports.length, count);
  await state().addProgressReport({ ...report, attachments });
  assert.equal(state().progressReports[0].submittedBy, contractor.name);
  assert.deepEqual(state().progressReports[0].attachments, attachments);
  const persisted = JSON.parse(storage.get('hcms-maharashtra-store-v5'));
  persisted.state.currentUser = { ...contractor, designation: admin.designation, email: admin.email };
  storage.set('hcms-maharashtra-store-v5', JSON.stringify(persisted));
  await useStore.persist.rehydrate();
  assert.equal(state().currentUser.designation, 'Contractor');
  assert.notEqual(state().currentUser.email, admin.email);
  state().login('CONTRACTOR', admin.id);
  assert.equal(state().currentUser, null);
  console.log('Contractor identity, restored sessions and progress evidence checks passed.');
} finally { await server.close(); }
