import assert from 'node:assert/strict';
import { createServer } from 'vite';
const saved=new Map();globalThis.localStorage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};globalThis.window={localStorage};
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
try {
const {useStore}=await server.ssrLoadModule('/src/store/useStore.ts');const {NAV_ITEMS}=await server.ssrLoadModule('/src/components/layout/navConfig.ts');const s=()=>useStore.getState();
assert.throws(()=>s().submitKycApplication('EMPLOYEE_ID',true),/Sign in/);
s().login('SUPERADMIN');const admin=s().currentUser;
const initial=s().rolePermissions.DEPUTY_ENGINEER;s().setRoleNavAccess('DEPUTY_ENGINEER',initial.filter(k=>k!=='projects'));s().setRoleNavAccess('DEPUTY_ENGINEER',[...initial.filter(k=>k!=='projects'),'projects']);assert.deepEqual(s().rolePermissions.DEPUTY_ENGINEER,Object.keys(NAV_ITEMS).filter(k=>initial.includes(k)));
s().login('DEPUTY_ENGINEER');const applicant=s().currentUser;
assert.throws(()=>s().setRoleNavAccess('MINISTER',[]),/superadmins/);assert.throws(()=>s().submitKycApplication('EMPLOYEE_ID',false),/declaration/);
s().submitKycApplication('EMPLOYEE_ID',true);assert.equal(s().currentUser.identityReview.status,'PENDING');assert.throws(()=>s().submitKycApplication('EMPLOYEE_ID',true),/already/);
s().login('SUPERADMIN');s().reviewStaffIdentity(applicant.id,'REJECTED','Please present an employee ID');
s().login('DEPUTY_ENGINEER');s().submitKycApplication('EMPLOYEE_ID',true);s().login('SUPERADMIN');s().reviewStaffIdentity(applicant.id,'VERIFIED','Office check completed');
const result=s().users.find(u=>u.id===applicant.id);assert.equal(result.identityReview.reviewedBy,admin.id);assert.equal(result.identityReview.status,'VERIFIED');assert.ok(result.kycApplication.submittedAt);
console.log('PASS stable module order; KYC declaration, duplicate, resubmission and approval; access authorization');
}finally{await server.close();}
