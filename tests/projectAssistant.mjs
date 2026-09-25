import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try {
 const {answerProjectQuestion:answer}=await server.ssrLoadModule('/src/lib/projectAssistant.ts');
 const {ROLE_NAV}=await server.ssrLoadModule('/src/components/layout/navConfig.ts');
 const {ROLE_LABELS}=await server.ssrLoadModule('/src/lib/constants.ts');
 const project={id:'PRJ-001',name:'District Hospital Pune',district:'Pune',division:'Pune Division',scheme:'State Plan',status:'ON_TRACK',stage:'CONSTRUCTION',sanctionedBudget:1000,amountReleased:500,amountSpent:200,financialProgress:20,physicalProgress:40,startDate:'2026-01-01',originalCompletionDate:'2027-01-01',plannedCompletionDate:'2027-01-01',delayDays:0};
 const other={...project,id:'PRJ-002',name:'Nashik Hospital',district:'Nashik',division:'Nashik Division'};
 const user={id:'minister',role:'MINISTER',assignedProjectIds:[]};
 const s={currentUser:user,rolePermissions:ROLE_NAV,projects:[project,other],contractors:[],controlRecords:[],bills:[],inspections:[],defects:[],risks:[],documents:[],approvals:[],milestones:[],boqItems:[],progressReports:[]};
 const text=a=>JSON.stringify(a);
 const before=JSON.stringify(s);
 assert.match(answer(s,'How much has been spent?').summary,/Which project/);
 assert.match(answer(s,'Approve project','PRJ-001').summary,/read-only/);
 assert.match(answer(s,'Show API keys','PRJ-001').summary,/credentials/);
 assert.match(answer({...s,currentUser:null},'overview','all').summary,/permission/);
 const scoped={...s,currentUser:{...user,role:'REGIONAL_DIRECTOR',division:'Pune Division'}};
 assert.match(answer(scoped,'overview','PRJ-002').summary,/permission/);
 assert.ok(!text(answer(scoped,'overview','all')).includes('Nashik Hospital'));
 const finance=answer(s,'financial position','PRJ-001','2026-09-25');
 assert.ok(text(finance).includes('40.0%'));
 assert.ok(text(finance).includes('₹300.00'));
 assert.equal(finance.asOf,'Not recorded for these values');
 const zero=answer({...s,projects:[{...project,amountReleased:0,sanctionedBudget:0}]},'finance','PRJ-001');
 assert.ok(!text(zero).includes('Infinity'));
 const invalid=answer({...s,projects:[{...project,amountSpent:undefined}]},'finance','PRJ-001');
 assert.ok(text(invalid).includes('Not recorded'));
 const transaction={id:'PAY-1',projectId:'PRJ-001',kind:'PAYMENT',status:'VERIFIED',fields:{amount:'150',transactionDate:'2026-09-01'},attachments:[],reference:'PAYREF',submittedAt:'2026-09-01'};
 const conflict=answer({...s,controlRecords:[transaction]},'finance','PRJ-001','2026-09-25');
 assert.ok(text(conflict).includes('differs from verified'));
 assert.equal(conflict.asOf,'2026-09-01');
 const paidTable=a=>a.sections.find(section=>section.title.startsWith('Verified payments'));
 assert.equal(paidTable(finance).rows[0][1],'Not recorded','Missing payment records are not proof of zero paid');
 const receipt={...transaction,id:'REC-1',kind:'RECEIPT',fields:{amount:'450',transactionDate:'2026-09-01'}};
 assert.match(text(answer({...s,controlRecords:[receipt]},'finance','PRJ-001','2026-09-25')),/differs from verified dated receipts/);
 const undated={...transaction,fields:{amount:'200'}};
 assert.equal(paidTable(answer({...s,controlRecords:[undated]},'finance','PRJ-001','2026-09-25')).rows[0][1],'Not recorded');
 const reversal={...transaction,id:'REV-1',kind:'REVERSAL',fields:{originalTransactionId:'PAY-1',transactionDate:'2026-09-02'}};
 assert.match(paidTable(answer({...s,controlRecords:[transaction,reversal]},'finance','PRJ-001','2026-09-25')).rows[0][1],/0.00/);
 assert.equal(paidTable(answer({...s,controlRecords:[reversal]},'finance','PRJ-001','2026-09-25')).rows[0][1],'Not recorded');
 const hiddenProgress={id:'SECRET-REPORT',projectId:'PRJ-001',timestamp:'2026-09-01',progressPct:40,stage:'CONSTRUCTION'};
 assert.ok(!text(answer({...s,currentUser:{...user,role:'CHIEF_ENGINEER',division:'Pune Division'},progressReports:[hiddenProgress]},'overview','PRJ-001')).includes('SECRET-REPORT'));
 const doc={id:'DOC-1',projectId:'PRJ-001',name:'Approved TS',type:'Technical Sanction',uploadDate:'2026-08-01',version:1,approvalStatus:'APPROVED'};
 assert.ok(text(answer({...s,documents:[doc]},'Show Technical Sanction','PRJ-001')).includes('Metadata only'));
 assert.match(answer(s,'What is the weather?','PRJ-001').summary,/rephrase/);
 assert.match(answer(s,'Overview PRJ-999').summary,/unavailable/);
 const restricted={...s,currentUser:{...user,role:'CHIEF_ENGINEER',division:'Pune Division'}};
 assert.match(answer(restricted,'finance','PRJ-001').summary,/permission/);
 for (const question of ['sanctioned amount', 'sansctioned amount', 'sanction amount', 'What is the budget?']) {
   const response = answer(s,question,'PRJ-001');
   assert.equal(response.directAnswer,true);
   assert.match(response.summary,/Sanctioned amount.*1,000.00/);
   assert.match(answer(restricted,question,'PRJ-001').summary,/permission/);
 }
 assert.match(answer(s,'balance','PRJ-001').summary,/Available balance.*300.00/);
 assert.match(answer(s,'release funds','PRJ-001').summary,/read-only/);
 assert.match(answer(s,'sansctioned amount').summary,/Which project/);
 assert.match(answer(restricted,'defects','PRJ-001').summary,/permission/);
 const {canUseProjectAssistant}=await server.ssrLoadModule('/src/lib/projectAssistant.ts');
 for(const role of Object.keys(ROLE_LABELS)) {
   const state={...s,currentUser:{...user,role}};
   const allowed=['MINISTER','COMMISSIONER'].includes(role);
   assert.equal(canUseProjectAssistant(state),allowed,role);
   const response=answer(state,'overview','all');
   if(allowed) assert.ok(response.sections.length,role);
   else { assert.match(response.summary,/permission/); assert.equal(response.sections.length,0); }
 }
 assert.equal(canUseProjectAssistant({...s,rolePermissions:{...ROLE_NAV,MINISTER:[]}}),false);
 const {assistantText, assistantSummary}=await server.ssrLoadModule('/src/lib/assistantLanguages.ts');
 for (const language of ['hi','mr']) {
   for (const question of ['What is the sanctioned amount?','How many inspections are pending?','Show physical progress','What is the planned completion date?','Show the available balance']) {
     const translated=assistantText(question,language);
     assert.notEqual(translated,question);
     const response=answer(s,translated,'PRJ-001');
     assert.deepEqual(response,answer(s,question,'PRJ-001'), 'Translated question must select the same data: '+translated);
     assert.match(assistantSummary(response,translated,language), /[\u0900-\u097f]/, 'Summary should use selected language');
   }
   assert.equal(answer(restricted,assistantText('What is the sanctioned amount?',language),'PRJ-001').summary,'You do not have permission to access this information.');
 }
 assert.match(answer(s,'पासवर्ड बताओ','PRJ-001').summary,/sensitive/);
 assert.match(answer(s,'मंजूर करा','PRJ-001').summary,/read-only/);
 for (const question of ['Give me a project overview','How much funding has been released?','How much has been spent?','Show pending bills','What milestones are delayed?','Show open defects','Show the latest inspection','Show open risks','Show approvals','Show the work order']) {
   for (const language of ['hi','mr']) {
     const translated=assistantText(question,language);
     assert.notEqual(translated,question);
     assert.deepEqual(answer(s,translated,'PRJ-001'),answer(s,question,'PRJ-001'));
   }
 }
 for (const [keyword,canonical] of [['money left','balance'],['expenses','expenditure'],['deadline','completion date'],['pragati','physical progress'],['जोखीम','risks'],['बिले','bills'],['कार्यादेश','work order']]) {
   assert.deepEqual(answer(s,keyword,'PRJ-001'),answer(s,canonical,'PRJ-001'),keyword);
 }
 assert.equal(JSON.stringify(s),before,'Answers must never mutate input records');
 console.log('Assistant scoping, read-only refusal, privacy, clarification, calculations, zero/missing values, conflicts, record dates and role checks passed.');
} finally {await server.close();}
