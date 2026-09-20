import assert from 'node:assert/strict';
import { createServer } from 'vite';
const storage = new Map();
globalThis.localStorage = {getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
globalThis.window = { localStorage };
const server = await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
try {
  const {useStore} = await server.ssrLoadModule('/src/store/useStore.ts');
  const {mergeDemoSamples} = await server.ssrLoadModule('/src/mock/demoPortfolio.ts');
  const s=()=>useStore.getState();
  assert.equal(s().projects.length,24);
  for(const p of s().projects.filter(p=>p.id.startsWith('DEMO24-'))) {
    assert.match(p.name,/Demo Hospital/);
    assert.ok(s().tenders.some(t=>t.id===p.tenderId && t.projectId===p.id));
    assert.ok(s().milestones.some(m=>m.projectId===p.id));
    assert.ok(s().boqItems.some(m=>m.projectId===p.id));
    assert.ok(s().photos.some(m=>m.projectId===p.id));
    const ms=s().milestones.filter(m=>m.projectId===p.id);
    assert.ok(ms.every(m=>m.dependencies.every(id=>ms.some(x=>x.id===id))));
  }
  const saved={...s(),projects:s().projects.filter(p=>!p.id.startsWith('DEMO24-')).map((p,i)=>i===0?{...p,name:'User edit preserved'}:p)};
  const merged=mergeDemoSamples(saved,s());
  assert.equal(merged.projects.length,24); assert.equal(merged.projects[0].name,'User edit preserved');
  assert.equal(mergeDemoSamples(merged,s()).projects.length,24);
  const input={name:'Test Officer',email:'test.officer@example.org',phone:'9876543210',department:'Engineering',role:'DEPUTY_ENGINEER',designation:'Deputy Engineer',assignedProjectIds:[s().projects[0].id]};
  assert.throws(()=>s().addStaffUser(input),/superadmins/);
  s().login('SUPERADMIN'); const admin=s().currentUser;
  const user=s().addStaffUser(input); assert.equal(user.identityReview.status,'PENDING');
  assert.throws(()=>s().addStaffUser(input),/already/);
  assert.throws(()=>s().reviewStaffIdentity(admin.id,'VERIFIED','REVIEW-1'),/own/);
  assert.throws(()=>s().reviewStaffIdentity(user.id,'VERIFIED','x'),/reference/);
  s().reviewStaffIdentity(user.id,'VERIFIED','INTERNAL-REVIEW-1');
  assert.equal(s().users.find(u=>u.id===user.id).identityReview.method,'MANUAL');
  assert.equal(s().users.find(u=>u.id===user.id).identityReview.reviewedBy,admin.id);
  s().login('DEPUTY_ENGINEER');assert.throws(()=>s().reviewStaffIdentity(user.id,'REJECTED','REVIEW-2'),/superadmins/);
  console.log('24 linked demo projects, non-destructive hydration, user creation authorization, duplicate checks and manual verification audit passed.');
} finally { await server.close(); }
