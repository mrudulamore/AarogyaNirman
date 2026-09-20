import assert from 'node:assert/strict';
import {createServer} from 'vite';
globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};globalThis.window={localStorage};
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
try{
const {useStore}=await server.ssrLoadModule('/src/store/useStore.ts');const s=()=>useStore.getState();
const project=s().projects[0];s().login('DEPUTY_ENGINEER',project.siteEngineerId);
const template=s().photos.find(p=>p.projectId===project.id);const photo=s().addPhoto({...template,dataUrl:'data:image/jpeg;base64,test'});
assert.throws(()=>s().reviewPhoto(photo.id,'APPROVED','Checked photo'),/authorized/);
s().login('EXECUTIVE_ENGINEER',project.executiveEngineerId);s().reviewPhoto(photo.id,'APPROVED','Reviewed site evidence');
assert.equal(s().photos.find(p=>p.id===photo.id).review.status,'APPROVED');
s().reviewPhoto(photo.id,'REJECTED','Needs clearer evidence');assert.equal(s().photos.find(p=>p.id===photo.id).reviewHistory.length,2);
assert.throws(()=>s().reviewPhoto(template.id,'APPROVED','Review sample'),/Illustrative/);
const own=s().addPhoto({...template,dataUrl:'data:image/jpeg;base64,test'});assert.throws(()=>s().reviewPhoto(own.id,'APPROVED','Self review'),/own/);
assert.throws(()=>s().createCustomRole('Supervisor','EXECUTIVE_ENGINEER'),/superadmins/);
s().login('SUPERADMIN');s().createCustomRole('Site Supervisor','EXECUTIVE_ENGINEER');assert.throws(()=>s().createCustomRole('Site Supervisor','EXECUTIVE_ENGINEER'),/exists/);
s().assignCustomRole(project.siteEngineerId,s().customRoles[0].id);assert.equal(s().users.find(u=>u.id===project.siteEngineerId).designation,'Site Supervisor');
console.log('Photo review permissions, no self-approval, review history, demo rejection and custom role authorization passed.');
}finally{await server.close()}
