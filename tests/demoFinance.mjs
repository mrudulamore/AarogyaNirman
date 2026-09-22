import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
try {
 const {withDemoFinance}=await server.ssrLoadModule('/src/mock/demoFinance.ts');
 const {generateMockData}=await server.ssrLoadModule('/src/mock/seed.ts');
 const {reconcileProjects}=await server.ssrLoadModule('/src/lib/financeLedger.ts');
 const {projects,users,contractors}=generateMockData();
 const records=withDemoFinance(projects,projects,[]);
 assert.ok(records.length>0);
 assert.deepEqual(withDemoFinance(projects,projects,records),records);
 const updated=reconcileProjects(projects,records,'2026-09-22');
 for(const p of updated){const original=projects.find(x=>x.id===p.id);assert.equal(p.amountSpent,original.amountSpent);assert.equal(p.amountReleased,original.amountReleased);}
 const existing={...records[0],id:'USER-ENTRY'};
 assert.deepEqual(withDemoFinance([projects[0]],projects,[existing]),[existing]);
 assert.deepEqual(withDemoFinance([{...projects[0],id:'NEW-PROJECT'}],projects,[]),[]);
 const {monthlyExpenditure}=await server.ssrLoadModule('/src/lib/financeLedger.ts');
 const {computeProjectScope}=await server.ssrLoadModule('/src/lib/projectScope.ts');
 for(const user of users){
   const scope=computeProjectScope(user,updated,contractors);
   const months=monthlyExpenditure(records,scope.projectIds,'2026-09-22');
   assert.equal(months.reduce((n,m)=>n+m.amount,0),scope.projects.reduce((n,p)=>n+p.amountSpent,0),user.role);
 }
 assert.ok(monthlyExpenditure(records,new Set(projects.map(p=>p.id)),'2026-09-22').every(m=>m.amount>0));
 const legacy=projects.flatMap(p=>['RECEIPT','PAYMENT'].map(kind=>({id:'DEMO-FINANCE-'+p.id+'-'+kind, projectId:p.id,kind,category:'Demo opening balance',submittedBy:'Demo data',status:'VERIFIED',fields:{amount:String(kind==='RECEIPT'?p.amountReleased:p.amountSpent),transactionDate:'2026-08-30'}})));
 assert.deepEqual(withDemoFinance(projects,projects,legacy),records);
 console.log('Monthly distribution, migration and all-role scoped reconciliation passed.');
 console.log('Demo balances, idempotent hydration, existing ledger preservation and new-project isolation passed.');
} finally {await server.close();}
