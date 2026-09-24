import assert from 'node:assert/strict';
import {createServer} from 'vite';
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};globalThis.window={localStorage};
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
try{
 const {useStore}=await server.ssrLoadModule('/src/store/useStore.ts');
 const {canSeeProposal,canReviewProposal}=await server.ssrLoadModule('/src/lib/projectProposals.ts');
 const state=()=>useStore.getState();const original=state().projects.length;
 const input={name:'Proposed hospital extension — Satara',district:'Satara',taluka:'Karad',type:'Rural Hospital',scheme:'State Plan',estimatedCost:120000000,bedCount:50,landDetails:'Government campus land',justification:'Additional hospital capacity',attachments:[{id:'pdf-test',category:'SUPPORTING',name:'proposal.pdf',mimeType:'application/pdf',size:100}]};
 state().login('EXECUTIVE_ENGINEER');const ee=state().currentUser;assert.throws(()=>state().saveProposal(input),/Only Ministry/);assert.throws(()=>state().addProject({name:'Bypass'}),/proposal/);
 state().login('MINISTER');const ministry=state().currentUser;const id=state().saveProposal({...input,attachments:[]});assert.equal(state().projects.length,original);assert.throws(()=>state().submitProposal(id),/Complete/);state().saveProposal(input,id);state().submitProposal(id);
 assert.equal(state().proposals.find(p=>p.id===id).status,'ADMIN_REVIEW');assert.throws(()=>state().reviewProposal(id,'APPROVE','Self approve'),/awaiting/);
 state().login('EXECUTIVE_ENGINEER');assert.throws(()=>state().reviewProposal(id,'APPROVE','Skip review'),/awaiting/);
 state().login('COMMISSIONER');state().reviewProposal(id,'RETURN','Provide corrected land record');state().login('MINISTER');state().saveProposal({...input,landDetails:'Corrected government land record'},id);state().submitProposal(id);
 for(const role of ['COMMISSIONER','CHIEF_ENGINEER']){state().login(role);assert.throws(()=>state().reviewProposal(id,'APPROVE',' '),/comments/);state().reviewProposal(id,'APPROVE','Verified supporting documents');}
 const proposal=state().proposals.find(p=>p.id===id);const outside={...state().currentUser,id:'OUTSIDE',division:'Nagpur Division'};assert.equal(canSeeProposal(outside,proposal),false);assert.equal(canReviewProposal(outside,proposal),false);
 state().login('SUPERINTENDING_ENGINEER');assert.throws(()=>state().reviewProposal(id,'APPROVE','Assign','invalid'),/Select/);state().reviewProposal(id,'APPROVE','Pune Division allocated',ee.id);assert.equal(state().projects.length,original);
 state().login('EXECUTIVE_ENGINEER',ee.id);assert.throws(()=>state().reviewProposal(id,'APPROVE','Sanction'),/reference/);state().reviewProposal(id,'APPROVE','Estimate verified',undefined,'TS/PUNE/2026/101');
 const approved=state().proposals.find(p=>p.id===id),project=state().projects.find(p=>p.id===approved.projectId);assert.equal(approved.status,'APPROVED');assert.equal(project.stage,'TENDER');assert.equal(state().tenders.find(t=>t.id===project.tenderId).status,'DRAFT');assert.equal(project.sanctionedBudget,input.estimatedCost);assert.equal(project.contractorId,'');assert.equal(project.proposalId,id);assert.equal(project.executiveEngineerId,ee.id);assert.equal(state().projects.length,original+1);assert.throws(()=>state().reviewProposal(id,'APPROVE','Again',undefined,'duplicate'),/awaiting/);
 state().login('MINISTER');const rejected=state().saveProposal({...input,name:'Reject test'});state().submitProposal(rejected);state().login('COMMISSIONER');state().reviewProposal(rejected,'REJECT','Duplicate facility');state().login('MINISTER');assert.throws(()=>state().submitProposal(rejected),/draft or returned/);
 await useStore.persist.rehydrate();assert.equal(state().proposals.find(p=>p.id===id).status,'APPROVED');assert.equal(state().proposals.find(p=>p.id===id).createdById,ministry.id);assert.equal(state().projects.filter(p=>p.proposalId===id).length,1);assert.ok(state().users.some(u=>u.role==='CHIEF_ENGINEER'));assert.ok(state().rolePermissions.MINISTER.includes('proposals'));
 console.log('Five-stage proposal flow, documents, returns, rejection, jurisdiction, bypass prevention, final project creation and persistence passed.');
}finally{await server.close()}
