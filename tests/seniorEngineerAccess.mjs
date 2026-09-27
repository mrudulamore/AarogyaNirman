import assert from 'node:assert/strict';
import { createServer } from 'vite';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.window = { localStorage };
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
try {
  const { useStore } = await server.ssrLoadModule('/src/store/useStore.ts');
  const { ROLE_NAV } = await server.ssrLoadModule('/src/components/layout/navConfig.ts');
  const { tabsForRole } = await server.ssrLoadModule('/src/lib/projectTabAccess.ts');
  const { inspectionAssignmentRoles } = await server.ssrLoadModule('/src/lib/inspectionAccess.ts');
  const state = useStore.getState();
  const merge = useStore.persist.getOptions().merge;
  const oldPermissions = { ...state.rolePermissions, CHIEF_ENGINEER: ['dashboard', 'projects', 'notifications', 'staff'], SUPERINTENDING_ENGINEER: ['dashboard', 'projects', 'notifications'] };
  const upgraded = merge({ rolePermissions: oldPermissions }, state);
  for (const role of ['CHIEF_ENGINEER', 'SUPERINTENDING_ENGINEER']) {
    assert.deepEqual(ROLE_NAV[role], ROLE_NAV.EXECUTIVE_ENGINEER);
    assert.deepEqual(tabsForRole(role), tabsForRole('EXECUTIVE_ENGINEER'));
    for (const key of ROLE_NAV.EXECUTIVE_ENGINEER) assert.ok(upgraded.rolePermissions[role].includes(key), `${role}: ${key}`);
    assert.ok(!upgraded.rolePermissions[role].includes('access'));
  }
  assert.ok(upgraded.rolePermissions.CHIEF_ENGINEER.includes('staff'), 'Preserve existing grants');
  assert.equal(upgraded.seniorEngineerAccessVersion, 1);
  const customized = merge({ ...upgraded, rolePermissions: { ...upgraded.rolePermissions, CHIEF_ENGINEER: ['dashboard', 'projects'] } }, state);
  assert.deepEqual(customized.rolePermissions.CHIEF_ENGINEER, ['dashboard', 'projects'], 'Do not overwrite later administrator changes');
  assert.deepEqual(inspectionAssignmentRoles({ role: 'CHIEF_ENGINEER' }), ['SUPERINTENDING_ENGINEER', 'EXECUTIVE_ENGINEER', 'PROJECT_MANAGER', 'DEPUTY_ENGINEER']);
  assert.deepEqual(inspectionAssignmentRoles({ role: 'SUPERINTENDING_ENGINEER' }), ['EXECUTIVE_ENGINEER', 'PROJECT_MANAGER', 'DEPUTY_ENGINEER']);
  console.log('PASS: CE/SE match EE navigation and tabs; saved settings migrate once; custom grants and inspection hierarchy remain intact.');
} finally { await server.close(); }
