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
 const s=()=>useStore.getState(); s().login('WORKFORCE');
 assert.equal(s().currentUser.role,'WORKFORCE');
 assert.deepEqual(s().rolePermissions.WORKFORCE,['dashboard']);
 const worker=s().workers.find(w=>w.id===s().currentUser.workerId);
 assert.equal(computeProjectScope(s().currentUser,s().projects,s().contractors).projectIds.size,0);
 const other=s().workers.find(w=>w.id!==worker.id);
 assert.throws(()=>s().markAttendance(other.id,other.projectId,'MANUAL'),/own attendance/);
 assert.throws(()=>s().markAttendance(worker.id,'wrong-site','MANUAL'),/own attendance/);
 assert.throws(()=>s().login('SUPERADMIN'),/Sign out/);
 useStore.setState({attendance:[]});
 s().markAttendance(worker.id,worker.projectId,'MANUAL');s().markAttendance(worker.id,worker.projectId,'MANUAL');
 assert.equal(s().attendance.length,1);assert.equal(s().attendance[0].shift,worker.shift);
 await useStore.persist.rehydrate();assert.equal(s().currentUser.workerId,worker.id);
 s().logout();s().login('SUPERADMIN');assert.equal(s().currentUser.role,'SUPERADMIN');
 console.log('Workforce checks passed: identity, own attendance, site restriction, duplicate prevention, session restore and role-switch restriction.');
} finally { await server.close(); }
