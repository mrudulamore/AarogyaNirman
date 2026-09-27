import assert from 'node:assert/strict';
import {createServer} from 'vite';
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};globalThis.window={localStorage};
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});try{const {useStore}=await server.ssrLoadModule('/src/store/useStore.ts');const s=useStore.getState();const findings=[];
for(const p of s.projects){for(const [label,a,b] of [['receipts > sanction',p.amountReleased,p.sanctionedBudget],['spend > receipts',p.amountSpent,p.amountReleased],['spend > sanction',p.amountSpent,p.sanctionedBudget]])if(a>b+.01)findings.push({project:p.id,name:p.name,issue:label,a,b});for(const key of ['physicalProgress','reportedProgress','verifiedProgress'])if(!Number.isFinite(p[key])||p[key]<0||p[key]>100)findings.push({project:p.id,issue:key,value:p[key]});}
for(const b of s.bills){const expected=b.grossAmount+b.gst-b.retention-b.deductions-b.penalty;if(Math.abs(expected-b.netPayable)>.01)findings.push({bill:b.id,issue:'net arithmetic',expected,actual:b.netPayable});}
assert.deepEqual(findings, [], 'Seed financial arithmetic and project limits');
const {withDemoFinance}=await server.ssrLoadModule('/src/mock/demoFinance.ts');
const {generateMockData}=await server.ssrLoadModule('/src/mock/seed.ts');
const {reconcileProjects,monthlyExpenditure}=await server.ssrLoadModule('/src/lib/financeLedger.ts');
const {verifiedFundReports}=await server.ssrLoadModule('/src/lib/verifiedFundReports.ts');
const samples=generateMockData().projects;
const oldSamples=samples.map(p=>({...p,amountReleased:Math.round(p.sanctionedBudget*p.financialProgress/100*1.05)}));
const oldRecords=withDemoFinance(samples,oldSamples,[]);
const repaired=withDemoFinance(samples,samples,oldRecords);
const corrected=withDemoFinance(samples,samples,[]);
assert.deepEqual([...repaired].sort((a,b)=>a.id.localeCompare(b.id)),[...corrected].sort((a,b)=>a.id.localeCompare(b.id)));
assert.deepEqual(withDemoFinance(samples,samples,repaired),repaired,'Migration is idempotent');
const affected=oldSamples.find(p=>p.amountReleased>p.sanctionedBudget);
const edited=oldRecords.map(r=>r.projectId===affected.id?{...r,reference:'Manual edit'}:r);
assert.deepEqual(withDemoFinance(samples,samples,edited).filter(r=>r.projectId===affected.id),edited.filter(r=>r.projectId===affected.id),'Preserve manual edits');
const changed=samples.map(p=>p.id===affected.id?{...p,sanctionedBudget:p.sanctionedBudget+1}:p);
assert.deepEqual(withDemoFinance(changed,samples,oldRecords).filter(r=>r.projectId===affected.id),oldRecords.filter(r=>r.projectId===affected.id),'Preserve changed sanctions');
const extra={...oldRecords.find(r=>r.projectId===affected.id),id:'MANUAL-RECEIPT',kind:'RECEIPT',fields:{amount:String(affected.sanctionedBudget+100),transactionDate:'2026-09-01'}};
const supplemented=[...oldRecords,extra];
assert.deepEqual(withDemoFinance(samples,samples,supplemented).filter(r=>r.projectId===affected.id),supplemented.filter(r=>r.projectId===affected.id),'Preserve additional transactions');
assert.equal(reconcileProjects([affected],[extra],'2026-09-27')[0].amountReleased,affected.sanctionedBudget+100,'Real ledger amounts must not be clipped');
const asOf='2026-09-27';
for(const p of reconcileProjects(s.projects,s.controlRecords,asOf)) {
 const reports=verifiedFundReports(s,[p],asOf);
 assert.equal(reports.government.total,p.amountReleased,p.id+' receipts reconcile');
 assert.equal(reports.contractor.total,p.amountSpent,p.id+' expenditure reconciles');
 assert.equal(monthlyExpenditure(s.controlRecords,new Set([p.id]),asOf).reduce((n,m)=>n+m.amount,0),p.amountSpent,p.id+' monthly totals');
 assert.ok(reports.government.pending.every(r=>!s.fundInstallments.some(old=>old.id===r.id && old.receivedDate && old.receivedDate<=asOf)),'Historical receipts are not future plans');
}
console.log('Migration, edit protection, project/report/monthly reconciliation passed.');
console.log(JSON.stringify({projects:s.projects.length,bills:s.bills.length,totals:s.projects.reduce((a,p)=>({sanction:a.sanction+p.sanctionedBudget,receipts:a.receipts+p.amountReleased,spent:a.spent+p.amountSpent}),{sanction:0,receipts:0,spent:0}),findings},null,2));}finally{await server.close()}
