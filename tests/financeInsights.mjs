import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
try {
 const {financeInsights}=await server.ssrLoadModule('/src/lib/financeInsights.ts');
 const projects=[{id:'A',sanctionedBudget:1000},{id:'B',sanctionedBudget:1000}];
 const bills=[
  {id:'OLD',projectId:'A',status:'APPROVED',netPayable:400,submittedDate:'2026-08-01'},
  {id:'BOUNDARY',projectId:'A',status:'SUBMITTED',netPayable:100,submittedDate:'2026-08-23'},
  {id:'DRAFT',projectId:'A',status:'DRAFT',netPayable:900,submittedDate:'2026-01-01'},
  {id:'FOREIGN',projectId:'C',status:'APPROVED',netPayable:900,submittedDate:'2026-01-01'},
 ];
 const tx=(id,projectId,kind,amount,billId)=>({id,projectId,kind,status:'VERIFIED',fields:{amount:String(amount),transactionDate:'2026-08-20',billId}});
 const records=[tx('R','A','RECEIPT',200),tx('P','A','PAYMENT',100,'OLD'),tx('RB','B','RECEIPT',2000)];
 const data=financeInsights(projects,bills,records,'2026-09-22');
 assert.equal(data.utilisation,5);
 assert.equal(data.fundingGap,200,'Other project surplus cannot hide funding gap');
 assert.equal(data.agedAmount,300,'Use outstanding amount after partial payment');
 assert.equal(data.agedCount,1,'Exactly 30 days is not over 30 days');
 assert.equal(data.affectedProjects,1);
 assert.equal(data.decisions[0].category,'funding');
 assert.ok(data.decisions.some(d=>d.billId==='OLD'));
 assert.ok(data.decisions.every(d=>d.projectId==='A'));
 assert.equal(financeInsights([projects[1]],bills,records,'2026-09-22').decisions.length,0);
 const overspent=financeInsights([{id:'A',sanctionedBudget:0}],[],[tx('UNLINKED','A','PAYMENT',50)],'2026-09-22');
 assert.equal(overspent.utilisation,null);
 assert.equal(overspent.fundingGap,50,'Negative available funds are visible');
 assert.ok(overspent.decisions.some(d=>d.category==='budget'));
 assert.ok(overspent.decisions.some(d=>d.category==='evidence'));
 const reversed=financeInsights(projects,bills,[...records,{id:'REV',projectId:'A',kind:'REVERSAL',status:'VERIFIED',fields:{originalTransactionId:'P',transactionDate:'2026-09-01'}}],'2026-09-22');
 assert.equal(reversed.expenditure,0);
 assert.equal(reversed.agedAmount,400);
 console.log('Finance insights: scope, funding isolation, partial bills, ageing boundary, reversals, zero budget and missing evidence passed.');
}finally{await server.close();}
