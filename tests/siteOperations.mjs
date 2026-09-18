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
  const { pendingWork, drawingWarning, DEFAULT_ESCALATION } = await server.ssrLoadModule('/src/lib/pendingWork.ts');
  const { validateControl, handoverGaps } = await server.ssrLoadModule('/src/lib/projectControls.ts');
  const state = () => useStore.getState();
  state().login('CONTRACTOR');
  const user = state().currentUser;
  const project = state().projects.find(p => p.contractorId === user.contractorId);
  const outside = state().projects.find(p => p.contractorId !== user.contractorId);
  const tasks = pendingWork(state(), '2026-09-18');
  assert.ok(tasks.every(t => t.ownerRole === 'CONTRACTOR' && t.projectId !== outside.id));
  assert.throws(() => state().setEscalationPolicy(DEFAULT_ESCALATION), /commissioner/);
  state().login('COMMISSIONER');
  assert.throws(() => state().setEscalationPolicy({ ...DEFAULT_ESCALATION, firstDays: 8, secondDays: 3 }), /thresholds/);
  state().setEscalationPolicy(DEFAULT_ESCALATION);
  useStore.setState({ milestones: [{ ...state().milestones[0], id: 'OVERDUE-TEST', projectId: project.id, plannedDate: '2000-01-01', status: 'IN_PROGRESS' }] });
  state().evaluateEscalations();
  const first = state().notifications.length;
  state().evaluateEscalations();
  assert.equal(state().notifications.length, first, 'Repeated evaluation duplicated notices');
  assert.ok(state().notifications.some(n => n.projectId === project.id && n.targetRoles.includes('COMMISSIONER')));
  const drawing = { id: 'DRAWING-1', projectId: project.id, kind: 'DOCUMENT', category: 'DOCUMENT', reference: 'DWG-A-1', fields: { documentType: 'Drawing', drawingNumber: 'A', version: '1' }, attachments: [{ id: 'proof' }], status: 'VERIFIED', submittedBy: user.id, submittedAt: '2026-09-18' };
  useStore.setState({ controlRecords: [drawing] });
  assert.equal(drawingWarning(state(), project.id, drawing.id), '');
  assert.ok(drawingWarning(state(), outside.id, drawing.id));
  const revision = { ...drawing, id: 'DRAWING-2', reference: 'DWG-A-2', fields: { ...drawing.fields, version: '2' } };
  assert.throws(() => validateControl(state(), revision), /current approved drawing/);
  validateControl(state(), { ...revision, supersedesId: drawing.id });
  assert.throws(() => validateControl(state(), { ...revision, fields: { ...revision.fields, version: '1' }, supersedesId: drawing.id }), /already exists/);
  useStore.setState({ controlRecords: [drawing, { ...revision, supersedesId: drawing.id }] });
  assert.ok(drawingWarning(state(), project.id, drawing.id));
  assert.equal(drawingWarning(state(), project.id, revision.id), '');
  assert.ok(handoverGaps(state(), project.id).length);
  console.log('Site operations tests passed: task scope, escalation authorization/deduplication, drawing replacement and handover blockers.');
} finally { await server.close(); }
