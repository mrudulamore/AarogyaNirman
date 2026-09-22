import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
try {
 const {generateMockData}=await server.ssrLoadModule('/src/mock/seed.ts');
 const {extendDemoPortfolio,mergeDemoSamples}=await server.ssrLoadModule('/src/mock/demoPortfolio.ts');
 const seed=extendDemoPortfolio(generateMockData());
 const saved=structuredClone(seed);
 saved.projects.forEach(p=>{if(p.id.startsWith('DEMO24-PRJ-')) p.name='Demo Hospital '+p.id.split('-').at(-1)+' — '+p.district;});
 const old=saved.projects.find(p=>p.id==='DEMO24-PRJ-21');old.amountSpent=123;
 saved.auditLog.push({id:'TEST',project:old.name});
 const merged=mergeDemoSamples(saved,seed);
 assert.ok(merged.projects.every(p=>!p.name.startsWith('Demo Hospital')));
 assert.equal(merged.projects.find(p=>p.id===old.id).amountSpent,123);
 assert.equal(merged.auditLog.at(-1).project,seed.projects.find(p=>p.id===old.id).name);
 assert.deepEqual(mergeDemoSamples(merged,seed),merged);
 console.log('Hospital title migration preserves project edits and audit links; repeat hydration is stable.');
} finally {await server.close();}
