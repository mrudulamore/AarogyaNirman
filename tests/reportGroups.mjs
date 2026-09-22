import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
try {
const {PROJECT_REPORT_GROUPS,PROJECT_HUBS,projectHubsForRole,reportGroupsForRole,reportNavigation}=await server.ssrLoadModule('/src/lib/projectReportGroups.ts');
const {PROJECT_360_TABS,ROLE_PROJECT_360_TABS,tabsForRole}=await server.ssrLoadModule('/src/lib/projectTabAccess.ts');
assert.equal(PROJECT_REPORT_GROUPS.length,15);assert.equal(PROJECT_360_TABS.length,25);
const all=PROJECT_REPORT_GROUPS.flatMap(g=>g.sections);assert.equal(new Set(all).size,25);
assert.deepEqual([...all].sort(),PROJECT_360_TABS.map(t=>t.value).sort());
for(const role of Object.keys(ROLE_PROJECT_360_TABS)){
 const allowed=tabsForRole(role).map(t=>t.value);const groups=reportGroupsForRole(role);
 assert.deepEqual(groups.flatMap(g=>g.sections.map(t=>t.value)).sort(),[...allowed].sort());
 for(const key of allowed){const nav=reportNavigation(role,key);assert.equal(nav.filter(t=>t.value===key).length,1);assert.ok(nav.every(t=>allowed.includes(t.value)));}
}
assert.equal(reportGroupsForRole('SUPERADMIN').length,15);
assert.equal(PROJECT_HUBS.length,5);
const hubSections=PROJECT_HUBS.flatMap(h=>h.sections);assert.equal(new Set(hubSections).size,25);
assert.deepEqual([...hubSections].sort(),PROJECT_360_TABS.map(t=>t.value).sort());
for(const role of Object.keys(ROLE_PROJECT_360_TABS)){
 const allowed=tabsForRole(role).map(t=>t.value).sort();
 assert.deepEqual(projectHubsForRole(role).flatMap(h=>h.sections.map(t=>t.value)).sort(),allowed);
}
console.log('PASS: 25 reports consolidated into 15 groups, every legacy section reachable, role access preserved.');
}finally{await server.close()}
