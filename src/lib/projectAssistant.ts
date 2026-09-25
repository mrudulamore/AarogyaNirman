import type { StoreState } from '../store/useStore';
import type { Project } from '../types';
import { computeProjectScope } from './projectScope';
import { tabsForRole } from './projectTabAccess';
import { ledgerTransactions } from './financeLedger';
import { normalizeAssistantQuestion } from './assistantLanguages';

export type AssistantData = Pick<StoreState, 'currentUser' | 'rolePermissions' | 'projects' | 'contractors' | 'controlRecords' | 'bills' | 'inspections' | 'defects' | 'risks' | 'documents' | 'approvals' | 'milestones' | 'boqItems' | 'progressReports'>;
export interface AssistantSection { title: string; lines?: string[]; columns?: string[]; rows?: string[][]; }
export interface AssistantAnswer { summary: string; sections: AssistantSection[]; asOf: string; sources: string[]; directAnswer?: boolean; }
const money = (n: number) => Number.isFinite(n) ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n) : 'Not recorded';
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const pct = (n: number) => finite(n) ? `${n.toFixed(1)}%` : 'Not recorded';
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const has = (q: string, value: string) => !!value && (` ${norm(q)} `).includes(` ${norm(value)} `);
const missing = 'Not recorded';
const denied = 'You do not have permission to access this information.';
const days = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86400000);

export function canUseProjectAssistant(s: Pick<AssistantData, 'currentUser' | 'rolePermissions'>): boolean {
  const role = s.currentUser?.role;
  return !!role && ['MINISTER', 'COMMISSIONER'].includes(role) && (s.rolePermissions[role] ?? []).includes('projects');
}

/** Pure query function: no store actions, networking, credentials or mutation. */
export function answerProjectQuestion(s: AssistantData, question: string, selectedId = '', today = new Date().toISOString().slice(0, 10)): AssistantAnswer {
  const result: AssistantAnswer = { summary: '', sections: [], asOf: 'Not recorded for these values', sources: [] };
  const reply = (summary: string) => ({ ...result, summary });
  const user = s.currentUser;
  if (!user || !canUseProjectAssistant(s)) return reply(denied);
  const q = normalizeAssistantQuestion(question).toLowerCase().trim()
    .replace(/\b(sansctioned|sanctoined|sanctiond)\b/g, 'sanctioned')
    .replace(/\b(relesed|realeased)\s+(amount|funds)\b/g, 'released $2')
    .replace(/\b(balence|balnce)\b/g, 'balance')
    .replace(/\b(expendature|expenditur)\b/g, 'expenditure');
  if (/last (?:month|year)|between|as of|since/.test(q) && !/financial year/.test(q)) return reply('Please specify a project and ask for a financial year such as FY 2025-26. Other historical reporting periods are not supported by this local assistant.');
  if (!q) return reply('Ask a project question or choose a suggested question.');
  if (/\b(approve|reject|delete|modify|assign|create|update|release funds|change (?:the )?(?:budget|status)|pay (?:the |a )?bill)\b/.test(q)) return reply('I can provide the relevant project information, but this assistant is read-only. Please use the appropriate workflow in the system to perform this action.');
  if (/\b(passwords?|tokens?|api keys?|credentials?|phone|email|personal|kyc)\b/.test(q)) return reply('I cannot provide credentials or sensitive personal information.');
  const scope = computeProjectScope(user, s.projects, s.contractors);
  let projects = scope.projects;
  if (selectedId && selectedId !== 'all') {
    projects = projects.filter(p => p.id === selectedId);
    if (!projects.length) return reply(denied);
  }
  const explicitIds = question.match(/\b(?:PRJ|PROJECT|PUNE-DEMO)-[A-Z0-9-]+\b/gi) ?? [];
  if (explicitIds.some(id => !scope.projects.some(p => p.id.toLowerCase() === id.toLowerCase()))) return reply('That project is unavailable in your authorized scope. Select an accessible project.');
  const named = scope.projects.filter(p => has(q, p.id) || has(q, p.name));
  const districts = [...new Set(scope.projects.map(p => p.district))].filter(d => has(q, d));
  const schemes = [...new Set(scope.projects.map(p => p.scheme))].filter(d => has(q, d));
  if (named.length) projects = projects.filter(p => named.some(n => n.id === p.id));
  else if (districts.length) projects = projects.filter(p => districts.includes(p.district));
  if (schemes.length) projects = projects.filter(p => schemes.includes(p.scheme));
  if (districts.length && !named.length && !selectedId && /hospital/.test(q) && projects.length > 1) return reply('More than one accessible hospital matches that district. Please select the project by name or ID.');
  const explicitScope = selectedId || named.length || districts.length || schemes.length || /\b(all|portfolio|district.wise|scheme.wise|projects|department|ministry)\b/.test(q);
  if (!explicitScope && projects.length > 1) return reply('Which project or district would you like me to check? Select a project above, or choose All accessible projects.');
  if (/\b(?:hospital|project)\s+[a-z]/.test(q) && !named.length && !districts.length && !selectedId && !/\b(projects|portfolio|project (overview|summary|status|health|information))\b/.test(q)) return reply('Please select the project by name or ID so I can identify the correct records.');
  const topic = /\b(overviews?|summary|doing|health|issues|attention)\b/.test(q) ? 'overview'
    : /\b(document|technical sanction|administrative approval|approved estimate|work order|tender)\b/.test(q) ? 'documents'
    : /\b(financ\w*|spent|spend|expenditure|budget|sanction(?:ed)?|released|utilization|balance|available|payment|bills?|paid|allocation|allocated)\b/.test(q) ? 'finance'
    : /\b(inspect\w*|defects?|quality|reinspection)\b/.test(q) ? 'quality'
    : /\b(boq|rcc|work packages?|construction|milestones?|physical|progress)\b/.test(q) ? 'construction'
    : /\b(risks?)\b/.test(q) ? 'risks'
    : /\b(approvals?|approved)\b/.test(q) ? 'approvals'
    : /\b(timeline|finish|completion|start|remaining|elapsed|delayed|ongoing|status|compare|projects)\b/.test(q) ? 'projects' : '';
  if (!topic) return reply('I can answer recorded project overview, finance, timeline, construction, inspection, defect, risk, approval and document questions. Please choose a suggested question or rephrase using one of these topics.');
  const tabs = new Set(tabsForRole(user.role).map(t => t.value));
  const ministryOverview = ['MINISTER', 'COMMISSIONER', 'REGIONAL_DIRECTOR', 'CIVIL_SURGEON', 'SUPERADMIN'].includes(user.role);
  const allowed = (area: string) => tabs.has(area) || (ministryOverview && ['risks','defects','quality','milestones','boq'].includes(area));
  const required: Record<string,string> = { finance:'finance', quality:'inspections', construction:'milestones', risks:'risks', approvals:'approvals', documents:'documents' };
  if (required[topic] && !allowed(required[topic])) return reply(denied);
  if (/defect/.test(q) && !allowed('defects')) return reply(denied);
  if (/\bdelayed projects\b/.test(q)) projects = projects.filter(p => p.status === 'DELAYED');
  if (/\bongoing\b/.test(q)) projects = projects.filter(p => p.status !== 'COMPLETED');
  if (/under construction/.test(q)) projects = projects.filter(p => p.stage === 'CONSTRUCTION');
  if (/financial progress below\s*50/.test(q)) projects = projects.filter(p => finite(p.financialProgress) && p.financialProgress < 50);
  if (/differ.*(?:10|ten)|gap.*10/.test(q)) projects = projects.filter(p => finite(p.physicalProgress) && finite(p.financialProgress) && Math.abs(p.physicalProgress - p.financialProgress) > 10);
  if (!projects.length) return reply('No accessible projects match this selection and the requested filters.');
  const ids = new Set(projects.map(p => p.id));
  const scoped = <T extends {projectId: string}>(records: T[]) => records.filter(r => ids.has(r.projectId));
  const controls = scoped(s.controlRecords);
  const inspections = scoped(s.inspections), defects = allowed('defects') ? scoped(s.defects) : [], risks = scoped(s.risks), approvals = scoped(s.approvals), milestones = scoped(s.milestones), documents = scoped(s.documents);
  const dates: string[] = [];
  const date = (value?: string) => { if (value && /^\d{4}-\d{2}-\d{2}/.test(value) && finite(Date.parse(value)) && value.slice(0,10) <= today) dates.push(value); };
  const table = (title: string, columns: string[], rows: string[][]) => result.sections.push({ title, columns, rows });
  const lines = (title: string, values: string[]) => result.sections.push({ title, lines: values });
  const projectLabel = (p: Project) => `${p.name} — ${p.id}`;
  result.summary = projects.length === 1 ? projectLabel(projects[0]) : `${projects.length} accessible projects. Values below apply to this selection.`;
  result.sources.push('Project master (update timestamp not recorded)');
  const overview = topic === 'overview';
  if (overview) lines('Portfolio totals — calculated from selected records', [
    'Projects: ' + projects.length,
    'Ongoing (not completed): ' + projects.filter(p=>p.status!=='COMPLETED').length,
    'Completed: ' + projects.filter(p=>p.status==='COMPLETED').length,
    'Delayed (recorded status): ' + projects.filter(p=>p.status==='DELAYED').length,
    'Average physical progress: ' + (projects.every(p=>finite(p.physicalProgress)) ? pct(projects.reduce((n,p)=>n+p.physicalProgress,0)/projects.length) : 'Unavailable'),
  ]);
  if (overview || topic === 'projects') {
    table('Project information — recorded', ['Project / ID','District / Scheme','Status / Stage','Start','Baseline completion','Current completion','Recorded delay days'], projects.map(p => [projectLabel(p),`${p.district} / ${p.scheme}`,`${p.status} / ${p.stage}`,p.startDate || missing,p.originalCompletionDate || missing,p.plannedCompletionDate || missing,finite(p.delayDays) ? String(p.delayDays) : missing]));
    if (projects.length === 1) { const p=projects[0]; lines('Timeline calculations', [`Calculated as of ${today}.`, `Days elapsed: ${p.startDate && finite(Date.parse(p.startDate)) ? Math.max(0,days(today,p.startDate)) : missing}`, `Days until current completion (negative means past due): ${p.plannedCompletionDate && finite(Date.parse(p.plannedCompletionDate)) ? days(p.plannedCompletionDate,today) : missing}`, `Recorded delay reason: ${p.delayReason || missing}`]); }
  }
  if ((overview || topic === 'finance') && allowed('finance')) {
    const financialRows = projects.map(p => {
      const tx = ledgerTransactions(controls,p.id,today);
      const recordedTx = controls.filter(r => r.projectId === p.id && r.status === 'VERIFIED' && ['PAYMENT', 'RECEIPT', 'REVERSAL'].includes(r.kind));
      const validDates = recordedTx.every(r => /^\d{4}-\d{2}-\d{2}$/.test(r.fields.transactionDate ?? '') && finite(Date.parse(r.fields.transactionDate)));
      const validReversals = recordedTx.filter(r => r.kind === 'REVERSAL' && r.fields.transactionDate <= today).every(r => recordedTx.some(original => original.id === r.fields.originalTransactionId && ['PAYMENT', 'RECEIPT'].includes(original.kind) && original.fields.transactionDate <= r.fields.transactionDate));
      const validTx = validDates && validReversals && tx.every(r => r.fields.amount?.trim() && finite(Number(r.fields.amount)) && Number(r.fields.amount) >= 0);
      const payments = tx.filter(r=>r.kind==='PAYMENT');
      const paid = validTx && recordedTx.some(r => r.kind === 'PAYMENT' && r.fields.transactionDate <= today) ? payments.reduce((n,r)=>n+Number(r.fields.amount),0) : NaN;
      const bills = scoped(s.bills).filter(b=>b.projectId===p.id && !['DRAFT','REJECTED'].includes(b.status) && b.submittedDate<=today);
      const pending = validTx && bills.every(b=>finite(b.netPayable) && b.netPayable >= 0) ? bills.reduce((n,b)=>n+Math.max(0,b.netPayable-payments.filter(r=>r.fields.billId===b.id).reduce((a,r)=>a+Number(r.fields.amount),0)),0) : NaN;
      tx.forEach(r=>date(r.fields.transactionDate)); bills.forEach(b=>date(b.submittedDate));
      const consistent = validTx && finite(p.sanctionedBudget) && p.sanctionedBudget >= 0 && finite(p.amountSpent) && finite(p.amountReleased) && p.amountSpent >= 0 && p.amountReleased >= 0;
      const checks: string[] = [];
      if (!validTx) checks.push(`${p.id}: transaction records have missing/invalid amounts, dates or reversal references; calculated payment totals unavailable.`);
      if (finite(paid) && Math.abs(paid-p.amountSpent)>0.01) checks.push(`${p.id}: master expenditure ${money(p.amountSpent)} differs from verified dated payment total ${money(paid)}. Reconcile before using either as authoritative.`);
      const receipts = tx.filter(r => r.kind === 'RECEIPT');
      const received = receipts.reduce((sum, r) => sum + Number(r.fields.amount), 0);
      if (validTx && recordedTx.some(r => r.kind === 'RECEIPT' && r.fields.transactionDate <= today) && Math.abs(received - p.amountReleased) > 0.01) checks.push(p.id + ': master released amount differs from verified dated receipts. Reconcile before using either as authoritative.');
      if (consistent && (p.amountSpent > p.amountReleased || p.amountReleased > p.sanctionedBudget)) checks.push(p.id + ': expenditure, released and sanctioned amounts are inconsistent. Reconcile before using calculated totals.');
      const sanctions = controls.filter(r=>r.projectId===p.id && r.kind==='PROCUREMENT' && /administrative|expenditure sanction/i.test(r.category) && r.status==='VERIFIED' && r.fields.amount?.trim());
      sanctions.forEach(r=>{if (finite(Number(r.fields.amount)) && Number(r.fields.amount)!==p.sanctionedBudget) checks.push(`${p.id}: master sanctioned amount ${money(p.sanctionedBudget)} differs from ${money(Number(r.fields.amount))} in ${r.id}, reference ${r.reference}, ${r.reviewedAt || r.submittedAt}.`);});
      if (consistent && p.sanctionedBudget > 0 && finite(p.financialProgress) && Math.abs(p.financialProgress - p.amountSpent / p.sanctionedBudget * 100) > 0.1) checks.push(p.id + ': recorded financial progress differs from expenditure / sanctioned amount. Reconcile before using a calculated financial progress.');
      if(checks.length) lines('Record inconsistencies',checks);
      const canCalculate=consistent && !checks.length;
      return {p,paid,pending, row:[projectLabel(p),money(p.sanctionedBudget),money(p.amountReleased),money(p.amountSpent),pct(p.financialProgress),pct(p.physicalProgress),canCalculate && p.sanctionedBudget>0 ? pct(p.amountSpent/p.sanctionedBudget*100) : 'Unavailable',canCalculate && p.amountReleased>0 ? pct(p.amountSpent/p.amountReleased*100) : 'Unavailable',canCalculate ? money(p.amountReleased-p.amountSpent) : 'Unavailable',finite(pending)?money(pending):'Unavailable']};
    });
    let rows=financialRows;
    if (/pending bills|pending payment/.test(q) && /which|projects/.test(q)) rows=rows.filter(r=>r.pending>0);
    if (/highest.*(?:spent|expenditure)|(?:spent|expenditure).*highest/.test(q)) {rows=[...rows].sort((a,b)=>b.p.amountSpent-a.p.amountSpent);lines('Ordering',['Projects ordered by recorded expenditure amount, descending.']);}
    if (/low.*utilization/.test(q)) lines('Utilization threshold',['No low-utilization threshold is defined for this query. The recorded values and calculated percentages are shown without assigning a rating.']);
    table('Finance', ['Project / ID','Sanctioned (recorded)','Released (recorded)','Expenditure (recorded)','Financial progress (recorded)','Physical progress (recorded)','Financial progress (calculated)','Utilization (calculated)','Balance (calculated)','Outstanding bills (calculated)'], rows.map(r=>r.row));
    lines('Calculation sources', ['Financial progress = expenditure ÷ sanctioned × 100. Utilization = expenditure ÷ released × 100; balance = released − expenditure. Outstanding bills = submitted non-rejected bill net payable minus linked verified payments, excluding dated reversals. Missing or inconsistent amounts prevent derived totals.', 'No verified payment records means paid amount is not recorded; empty bill lists do not establish that no liabilities exist. Allocated amount: not available as a consistently defined separate field. Paid amount uses verified payment records and is not assumed equal to expenditure.']);
    table('Verified payments — calculated', ['Project / ID','Paid'],financialRows.map(r=>[projectLabel(r.p),money(r.paid)]));
    if (/financial year|\bfy\b/.test(q)) {
      const match=q.match(/(?:fy\s*)?(20\d{2})\s*[-/]\s*(?:20)?\d{2}/);
      const year=match?Number(match[1]):Number(today.slice(0,4))-(Number(today.slice(5,7))<4?1:0)-(/last financial year/.test(q)?1:0);
      const start=`${year}-04-01`,end=`${year+1}-03-31`;
      const payments=controls.filter(r=>r.kind==='PAYMENT' && r.status==='VERIFIED' && r.fields.transactionDate>=start && r.fields.transactionDate<=end && r.fields.transactionDate<=today);
      const reversals=controls.filter(r=>r.kind==='REVERSAL' && r.status==='VERIFIED' && r.fields.transactionDate>=start && r.fields.transactionDate<=end && r.fields.transactionDate<=today);
      const amounts=payments.map(r=>r.fields.amount?.trim()?Number(r.fields.amount):NaN);
      const seen=new Set<string>(); for(const r of reversals){if(seen.has(r.fields.originalTransactionId))continue;seen.add(r.fields.originalTransactionId);const original=controls.find(o=>o.id===r.fields.originalTransactionId && o.projectId===r.projectId && o.kind==='PAYMENT' && o.status==='VERIFIED');amounts.push(original?.fields.amount?.trim()?-Number(original.fields.amount):NaN);}
      lines(`Financial year ${year}–${year+1}`, [`Net verified dated payments during ${start} to ${end}, capped at ${today}: ${amounts.length && amounts.every(finite) && financialRows.every(r=>finite(r.paid))?money(amounts.reduce((a,b)=>a+b,0)):'Unavailable: incomplete transaction records'}. Calculated from payments less reversals dated within that period; completeness of the record set is not guaranteed.`]);
    }
    if (overview && !result.sections.some(section=>section.title==='Record inconsistencies')) {
      const sum = (key: 'sanctionedBudget'|'amountReleased'|'amountSpent') => projects.every(p=>finite(p[key])) ? projects.reduce((n,p)=>n+p[key],0) : NaN;
      const released=sum('amountReleased'), spent=sum('amountSpent');
      lines('Portfolio finance — calculated totals', ['Sanctioned: '+money(sum('sanctionedBudget')), 'Released: '+money(released), 'Expenditure: '+money(spent), 'Overall utilization: '+(released>0&&finite(spent)?pct(spent/released*100):'Unavailable'), 'Outstanding submitted bills: '+(financialRows.every(r=>finite(r.pending))?money(financialRows.reduce((n,r)=>n+r.pending,0)):'Unavailable')]);
    }
    if (/district.wise|scheme.wise|compare/.test(q) && !result.sections.some(section=>section.title==='Record inconsistencies')) {
      const key=/scheme.wise/.test(q)?'scheme':'district';
      table(`Grouped by ${key} — calculated`,[key,'Sanctioned','Released','Expenditure'],[...new Set(projects.map(p=>p[key]))].map(group=>{const list=projects.filter(p=>p[key]===group);return [group,...(['sanctionedBudget','amountReleased','amountSpent'] as const).map(k=>list.every(p=>finite(p[k]))?money(list.reduce((n,p)=>n+p[k],0)):'Unavailable')];}));
    }
    result.sources.push('Project master finance fields; verified dated control transactions; submitted bills');
    if (!overview && !/financial year|\bfy\b/.test(q)) {
      const requested = [
        { match: /\bsanction(?:ed)?\b|\bbudget\b/, label: 'Sanctioned amount (recorded)', column: 1 },
        { match: /\breleased\b/, label: 'Released amount (recorded)', column: 2 },
        { match: /\bspent\b|\bspend\b|\bexpenditure\b/, label: 'Expenditure (recorded)', column: 3 },
        { match: /\bbalance\b|\bavailable\b/, label: 'Available balance', column: 8 },
        { match: /\butilization\b/, label: 'Utilization', column: 7 },
        { match: /\bpending bills?\b|\bpending payments?\b|\boutstanding\b/, label: 'Outstanding bills', column: 9 },
      ].filter(item => item.match.test(q));
      if (requested.length && rows.length) {
        result.directAnswer = true;
        result.summary = rows.map(({ p, row }) => `${p.name}: ${requested.map(item => `${item.label}: ${row[item.column]}`).join('; ')}.`).join('\n');
      }
    }
  }
  if ((overview || topic==='quality') && allowed('inspections')) {
    inspections.forEach(r=>date(r.completedDate)); defects.forEach(r=>date(r.createdDate));
    lines('Inspections & quality — recorded', [`Total inspections: ${inspections.length}`,`Completed: ${inspections.filter(r=>r.status==='COMPLETED').length}`,`Pending: ${inspections.filter(r=>r.status!=='COMPLETED').length}`,`Open defects: ${defects.filter(r=>r.status!=='CLOSED').length}`,`Open HIGH / CRITICAL defects: ${defects.filter(r=>r.status!=='CLOSED'&&['HIGH','CRITICAL'].includes(r.severity)).length}`]);
    if(topic==='quality') {
      if(/defect/.test(q)) table('Defects',['ID / project','Severity','Status','Description','Due'],defects.filter(r=>!(/open/.test(q))||r.status!=='CLOSED').filter(r=>!(/high.severity|critical/.test(q))||['HIGH','CRITICAL'].includes(r.severity)).map(r=>[`${r.id} / ${r.projectId}`,r.severity,r.status,r.description,r.dueDate]));
      else {let list=inspections.filter(r=>!(/pending/.test(q))||r.status!=='COMPLETED');if(/latest/.test(q))list=list.filter(r=>r.completedDate).sort((a,b)=>b.completedDate!.localeCompare(a.completedDate!)).slice(0,1);table('Inspections',['ID / project','Status','Inspector','Completed / scheduled','Result'],list.map(r=>[`${r.id} / ${r.projectId}`,r.status,r.inspector,r.completedDate || r.scheduledDate,r.overallResult]));}
    }
    result.sources.push('Inspection and defect records');
  }
  if ((overview || topic==='construction') && allowed('milestones')) {
    milestones.forEach(r=>date(r.actualDate));
    let list=milestones; if(/delay|incomplete/.test(q))list=list.filter(r=>!['CERTIFIED','BILL_ELIGIBLE','PAID'].includes(r.status) && (!/delay/.test(q)||r.plannedDate<today));
    table('Milestones — recorded; overdue based on planned finish',['ID / project','Work','Status','Planned finish','Actual finish'],list.map(r=>[`${r.id} / ${r.projectId}`,r.name,r.status,r.plannedDate,r.actualDate || missing]));
    if(allowed('boq'))table('BOQ progress',['ID / project','Work','Completed / planned quantity','Progress (calculated)'],scoped(s.boqItems).filter(r=>!/rcc/.test(q)||r.category==='RCC').filter(r=>!/incomplete/.test(q)||r.completedQty<r.plannedQty).map(r=>[`${r.id} / ${r.projectId}`,r.item,`${r.completedQty} / ${r.plannedQty} ${r.unit}`,r.plannedQty>0?pct(r.completedQty/r.plannedQty*100):'Unavailable']));
    table('Physical progress — recorded',['Project / ID','Physical progress'],projects.map(p=>[projectLabel(p),pct(p.physicalProgress)]));
    result.sources.push('Milestone, BOQ and project master progress records');
  }
  if((overview || topic==='risks') && allowed('risks')) { table('Open risks — recorded severity',['ID / project','Risk / category','Severity','Owner','Due'],risks.filter(r=>r.status==='OPEN').map(r=>[`${r.id} / ${r.projectId}`,`${r.risk} / ${r.category}`,r.level,r.owner,r.dueDate]));result.sources.push('Risk register (update timestamps not recorded)'); }
  if((overview || topic==='approvals') && allowed('approvals')) { approvals.forEach(r=>{date(r.submittedDate);r.history.forEach(h=>date(h.timestamp));});table('Approvals — recorded',['ID / project','Type','Status','Submitted'],approvals.map(r=>[`${r.id} / ${r.projectId}`,r.type,r.status,r.submittedDate]));result.sources.push('Approval records and history'); }
  if((overview || topic==='documents') && allowed('documents')) {
    let list=documents;
    if(/technical sanction/.test(q)) list=list.filter(r=>r.type==='Technical Sanction');
    if(/administrative/.test(q)) list=list.filter(r=>r.type==='Administrative Sanction');
    if(/work order/.test(q)) list=list.filter(r=>r.type==='Work Order');
    list.forEach(r=>date(r.uploadDate));
    table('Document metadata — contents not inferred',['ID / project','Name / type','Uploaded','Version / status','Availability'],list.map(r=>[`${r.id} / ${r.projectId}`,`${r.name} / ${r.type}`,r.uploadDate,`${r.version} / ${r.approvalStatus}`,'Metadata only; file availability not verified']));
    table('Supporting control records',['ID / project','Type / category','Reference','Status','Record date'],controls.filter(r=>['PROCUREMENT','DOCUMENT','CONTRACT'].includes(r.kind)).map(r=>{date(r.reviewedAt || r.submittedAt);return [`${r.id} / ${r.projectId}`,`${r.kind} / ${r.category}`,r.reference || missing,r.status,r.reviewedAt || r.submittedAt];}));
    result.sources.push('Document metadata and procurement/control records');
  }
  if(overview && allowed('progress')){const activity=scoped(s.progressReports).sort((a,b)=>b.timestamp.localeCompare(a.timestamp)).slice(0,5);activity.forEach(r=>date(r.timestamp));table('Recent progress reports',['ID / project','Date','Reported progress','Stage'],activity.map(r=>[`${r.id} / ${r.projectId}`,r.timestamp,pct(r.progressPct),r.stage]));result.sources.push('Progress reports');}
  if (overview) {
    const readable = (value: string) => value.toLowerCase().replaceAll('_', ' ');
    result.summary = projects.length === 1 ? projects[0].name : projects.length + ' accessible projects';
    result.sections = [{ title: 'At a glance', lines: projects.length === 1 ? [
      'Status: ' + readable(projects[0].status),
      'Physical progress: ' + pct(projects[0].physicalProgress),
      'Expected completion: ' + (projects[0].plannedCompletionDate || missing),
    ] : [
      'Completed: ' + projects.filter(p => p.status === 'COMPLETED').length,
      'Ongoing: ' + projects.filter(p => p.status !== 'COMPLETED').length,
      'Delayed: ' + projects.filter(p => p.status === 'DELAYED').length,
    ] }];
    result.sources = ['Project master (update timestamp not recorded)'];
    result.asOf = 'Not recorded for these values';
    return result;
  }
  result.asOf=dates.sort().at(-1) ?? 'Not recorded for these values';
  return result;
}

