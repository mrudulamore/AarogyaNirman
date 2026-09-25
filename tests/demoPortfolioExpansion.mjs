import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try {
 const {generateMockData}=await server.ssrLoadModule('/src/mock/seed.ts');
 const {extendDemoPortfolio,mergeDemoSamples}=await server.ssrLoadModule('/src/mock/demoPortfolio.ts');
 const {withPuneDemo}=await server.ssrLoadModule('/src/mock/puneDemo.ts');
 const {computeProjectScope}=await server.ssrLoadModule('/src/lib/projectScope.ts');
 const seed=withPuneDemo(extendDemoPortfolio(generateMockData()));
 const ee=seed.users.find(u=>u.role==='EXECUTIVE_ENGINEER');
 const scope=computeProjectScope(ee,seed.projects,seed.contractors);
 assert.ok(scope.projects.length>=15);
 assert.ok(scope.projects.every(p=>p.division==='Pune Division'));
 assert.equal(new Set(seed.projects.map(p=>p.id)).size,seed.projects.length);
 const added=seed.projects.filter(p=>/^DEMO24-PRJ-(2[5-9]|3[0-4])$/.test(p.id));
 assert.equal(added.length,10);
 for(const p of added) {
   assert.ok(seed.milestones.some(m=>m.projectId===p.id));
   assert.ok(seed.users.some(u=>u.id===p.siteEngineerId));
 }
 const saved={...seed,projects:seed.projects.filter(p=>!added.includes(p)).map((p,i)=>i===0?{...p,name:'User edited name'}:p)};
 const merged=mergeDemoSamples(saved,seed);
 assert.equal(merged.projects[0].name,'User edited name');
 assert.equal(merged.projects.length,seed.projects.length);
 assert.equal(mergeDemoSamples(merged,seed).projects.length,seed.projects.length);
 console.log('15-project Pune portfolio, linked records, unique IDs and non-destructive hydration checks passed.');
} finally {await server.close();}
