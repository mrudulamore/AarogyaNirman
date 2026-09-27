import assert from 'node:assert/strict';
import { createServer } from 'vite';

const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
globalThis.window = { localStorage: globalThis.localStorage, atob: globalThis.atob, btoa: globalThis.btoa };
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
try {
  const { useStore } = await server.ssrLoadModule('/src/store/useStore.ts');
  const { withPendingWorkDemo } = await server.ssrLoadModule('/src/mock/pendingWorkDemo.ts');
  const { pendingWork } = await server.ssrLoadModule('/src/lib/pendingWork.ts');
  const { computeProjectScope } = await server.ssrLoadModule('/src/lib/projectScope.ts');
  const initial = useStore.getState();
  const { sampleDocumentBlob } = await server.ssrLoadModule('/src/lib/sampleDocuments.ts');
  const bill = initial.bills.find(row => row.attachments?.some(file => file.id === `sample-review:${row.id}`));
  assert.ok(bill, 'Reference bills have a review sheet');
  const review = bill.attachments.find(file => file.id === `sample-review:${bill.id}`);
  assert.ok((await (await sampleDocumentBlob(review.sample)).text()).startsWith('%PDF-'));
  for (const row of initial.controlRecords.filter(row => row.id.startsWith('DEMO-PENDING-'))) {
    assert.ok(!/demo/i.test(row.reference));
    assert.ok(row.attachments.length, 'Pending review has a supporting PDF');
  }
  const minister = initial.users.find(user => user.role === 'MINISTER');
  assert.ok(minister);
  assert.equal(initial.users.filter(user => user.role === 'MINISTER').length, 1, 'One Minister account');
  const ministryRecords = initial.controlRecords.filter(row => row.id.startsWith('DEMO-PENDING-') && row.fields.responsibleRole === 'MINISTER');
  assert.equal(ministryRecords.length, 12);
  assert.ok(ministryRecords.every(row => row.fields.responsibleUserId === minister.id), 'All Ministry reviews belong to the same Minister');
  const { todayDate } = await server.ssrLoadModule('/src/lib/fundDisbursal.ts');
  assert.equal(pendingWork({ ...initial, currentUser: minister }, todayDate()).filter(task => task.id.startsWith('DEMO-PENDING-')).length, 12, 'Fresh Ministry login has twelve demo tasks');
  const state = withPendingWorkDemo({ ...initial,
    approvals: initial.approvals.filter(r => !r.id.startsWith('DEMO-PENDING-')),
    controlRecords: initial.controlRecords.filter(r => !r.id.startsWith('DEMO-PENDING-')),
  }, '2026-09-28');
  for (const role of ['MINISTER', 'COMMISSIONER', 'REGIONAL_DIRECTOR', 'CIVIL_SURGEON', 'CHIEF_ENGINEER', 'SUPERINTENDING_ENGINEER', 'DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'MEDICAL_OFFICER', 'VIGILANCE_AUDIT', 'IT_ADMIN', 'SITE_SUPERVISOR']) {
    const user = state.users.find(u => u.role === role);
    assert.ok(user, role);
    const scope = computeProjectScope(user, state.projects, state.contractors).projectIds;
    const tasks = pendingWork({ ...state, currentUser: user }, '2026-09-28');
    assert.ok(tasks.some(t => t.id.startsWith('DEMO-PENDING-')), `${role} has demo work`);
    assert.ok(tasks.every(t => scope.has(t.projectId) && t.ownerRole === role), `${role} scope`);
    assert.ok(tasks.some(t => t.due < '2026-09-28'), `${role} overdue work`);
  }
  const approval = state.approvals.find(r => r.id.startsWith('DEMO-PENDING-'));
  approval.status = 'APPROVED';
  const control = state.controlRecords.find(r => r.id.startsWith('DEMO-PENDING-'));
  control.fields.expiryDate = '2027-09-28';
  const again = withPendingWorkDemo(state, '2026-10-01');
  assert.deepEqual(again.approvals, state.approvals);
  assert.deepEqual(again.controlRecords, state.controlRecords);
  useStore.setState(state);
  await useStore.persist.rehydrate();
  const restored = useStore.getState();
  assert.equal(restored.approvals.find(r => r.id === approval.id).status, 'APPROVED');
  assert.equal(restored.controlRecords.find(r => r.id === control.id).fields.expiryDate, '2027-09-28');
  assert.equal(new Set(restored.approvals.map(r => r.id)).size, restored.approvals.length);
  console.log('Pending work demo: role scoping, overdue tasks, idempotency and saved actions passed.');
} finally { await server.close(); }
