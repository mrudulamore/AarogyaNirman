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
  const { ROLE_LABELS } = await server.ssrLoadModule('/src/lib/constants.ts');
  const { ROLE_NAV } = await server.ssrLoadModule('/src/components/layout/navConfig.ts');
  const state = () => useStore.getState();
  const originalUsers = state().users;
  for (const role of Object.keys(ROLE_LABELS)) {
    state().login(role);
    const user = state().currentUser;
    assert.ok(user, role);
    assert.equal(user.role, role);
    assert.ok(ROLE_NAV[role].includes('dashboard'));
    if (role !== 'SUPERADMIN') assert.doesNotMatch(user.designation, /Super Administrator/);
    const saved = JSON.parse(storage.get('hcms-maharashtra-store-v5'));
    saved.state.currentUser.designation = 'Super Administrator';
    storage.set('hcms-maharashtra-store-v5', JSON.stringify(saved));
    await useStore.persist.rehydrate();
    assert.equal(state().currentUser.designation, user.designation);
    assert.equal(state().currentUser.id, user.id);
    state().logout();
    await useStore.persist.rehydrate();
    assert.equal(state().currentUser, null);
    if (role !== 'CONTRACTOR') {
      state().login(role, user.id); assert.equal(state().currentUser.id, user.id);
      state().login(role, 'missing'); assert.equal(state().currentUser, null);
      const other = originalUsers.find(u => u.role !== role);
      state().login(role, other.id); assert.equal(state().currentUser, null);
    }
    console.log(role + ': identity, session restoration and sign-out passed');
  }
  state().login('DEPUTY_ENGINEER');
  const id = state().currentUser.id;
  state().updateUserRole(id, 'PROJECT_MANAGER');
  assert.equal(state().currentUser, null);
  state().login('PROJECT_MANAGER', id);
  assert.equal(state().currentUser.designation, ROLE_LABELS.PROJECT_MANAGER);
  const saved = JSON.parse(storage.get('hcms-maharashtra-store-v5'));
  saved.state.currentUser.role = 'SUPERADMIN';
  storage.set('hcms-maharashtra-store-v5', JSON.stringify(saved));
  await useStore.persist.rehydrate();
  assert.equal(state().currentUser, null);
  useStore.setState({ users: originalUsers.filter(u => u.role !== 'MINISTER') });
  state().login('MINISTER'); assert.equal(state().currentUser, null);
  console.log('Role reassignment, stale role and missing account checks passed.');
} finally { await server.close(); }
