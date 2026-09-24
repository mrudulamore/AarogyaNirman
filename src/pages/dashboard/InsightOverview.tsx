import { isMilestoneDelivered, isMilestoneOverdue } from '../../lib/milestones';
import { tabsForRole } from '../../lib/projectTabAccess';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowUpRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { reconcileProjects, outstandingBills } from '../../lib/financeLedger';
import { formatCurrency, formatCurrencyFull, formatDate } from '../../lib/utils';
import { uiText, uiMessage, useUiLanguage } from '../../i18n/ui';
import { StatusBadge, ProgressBar, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/primitives';
import { DeadlineBadge } from '../../components/common/DeadlineBadge';

export function InsightOverview() {
  useUiLanguage();
  const state = useStore();
  const scope = useProjectScope();
  const [query,setQuery] = useState('');
  const [status,setStatus] = useState('ALL');
  const [district,setDistrict] = useState('ALL');
  const [sort,setSort] = useState('attention');
  const scoped = reconcileProjects(scope.projects,state.controlRecords);
  const rank: Record<string,number> = {DELAYED:0,AT_RISK:1,ON_TRACK:2,COMPLETED:3};
  const projects = scoped.filter(p => (status==='ALL'||p.status===status) && (district==='ALL'||p.district===district)
    && [p.name,p.id,p.district].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a,b) => sort==='progress' ? a.physicalProgress-b.physicalProgress : sort==='expenditure' ? b.amountSpent-a.amountSpent : sort==='budget' ? b.sanctionedBudget-a.sanctionedBudget : (rank[a.status]??4)-(rank[b.status]??4)||a.name.localeCompare(b.name));
  const ids = new Set(projects.map(p=>p.id));
  const boq = state.boqItems.filter(item => ids.has(item.projectId));
  const boqPlanned = boq.reduce((n,item)=>n+item.plannedQty*item.rate,0);
  const boqCompleted = boq.reduce((n,item)=>n+Math.min(item.completedQty,item.plannedQty)*item.rate,0);
  const milestones = state.milestones.filter(item=>ids.has(item.projectId));
  const delivered = milestones.filter(item=>isMilestoneDelivered(item.status)).length;
  const overdue = milestones.filter(item=>isMilestoneOverdue(item)).length;
  const projectTabs = tabsForRole(state.currentUser?.role).map(tab=>tab.value);
  const pending = outstandingBills(state.bills.filter(b=>ids.has(b.projectId)),state.controlRecords);
  const sanctioned = projects.reduce((n,p)=>n+p.sanctionedBudget,0);
  const received = projects.reduce((n,p)=>n+p.amountReleased,0);
  const spent = projects.reduce((n,p)=>n+p.amountSpent,0);
  const progress = projects.length ? projects.reduce((n,p)=>n+p.physicalProgress,0)/projects.length : 0;
  const canFinance = !!state.currentUser && state.rolePermissions[state.currentUser.role]?.includes('finance');
  const financePath=(id:string,view:string)=>canFinance ? `/finance?project=${encodeURIComponent(id)}&view=${view}` : `/projects/${encodeURIComponent(id)}?tab=controls`;
  const amountLink='inline-flex min-h-11 items-center gap-1 whitespace-nowrap font-semibold text-blue-700 hover:underline';
  return <div className="space-y-5" data-testid="insight-overview">
    <header className="rounded-3xl bg-gradient-to-br from-blue-950 to-blue-700 p-6 text-white">
      <p className="text-xs font-medium uppercase tracking-widest text-blue-200">{uiText(scope.scopeLabel)}</p>
      <h1 className="mt-2 text-2xl font-semibold">{uiText('Insight Overview')}</h1>
      <p className="mt-2 max-w-2xl text-sm text-blue-100">{uiText('Compare project progress, current status and finances in one place.')}</p>
    </header>
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-blue-100 bg-white p-4">
      <label className="min-w-0 flex-[2] basis-64 text-xs font-medium text-slate-600">{uiText('Search projects')}<span className="mt-1 flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3"><Search size={16}/><input aria-label={uiText('Search projects')} value={query} onChange={e=>setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></span></label>
      <label className="flex-1 basis-40 text-xs font-medium text-slate-600">{uiText('Status')}<select className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" aria-label={uiText("Status")} value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">{uiText('All Statuses')}</option>{['ON_TRACK','AT_RISK','DELAYED','COMPLETED'].map(s=><option key={s} value={s}>{uiText(s)}</option>)}</select></label>
      <label className="flex-1 basis-40 text-xs font-medium text-slate-600">{uiText('District')}<select className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" aria-label={uiText("District")} value={district} onChange={e=>setDistrict(e.target.value)}><option value="ALL">{uiText('All Districts')}</option>{[...new Set(scoped.map(p=>p.district))].sort().map(d=><option key={d}>{d}</option>)}</select></label>
      <label className="flex-1 basis-44 text-xs font-medium text-slate-600">{uiText('Sort by')}<select className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" aria-label={uiText("Sort by")} value={sort} onChange={e=>setSort(e.target.value)}>{[['attention','Needs attention first'],['progress','Lowest progress first'],['expenditure','Highest expenditure first'],['budget','Highest budget first']].map(([key,label])=><option key={key} value={key}>{uiText(label)}</option>)}</select></label>
      <button className="min-h-11 px-3 text-sm font-semibold text-blue-700" onClick={()=>{setQuery('');setStatus('ALL');setDistrict('ALL');setSort('attention');}}>{uiText('Reset filters')}</button>
    </div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[
        ['Projects',String(projects.length),uiMessage('{{0}} delayed · {{1}} at risk',[projects.filter(p=>p.status==='DELAYED').length,projects.filter(p=>p.status==='AT_RISK').length])],
        ['Average physical progress',projects.length?progress.toFixed(1)+'%':'—','Equal weight per project'],
        ['Sanctioned money',formatCurrency(sanctioned),'Approved project budgets'],
        ['Disbursed money',formatCurrency(received),'Verified government receipts'],
        ['Expenditure',formatCurrency(spent),'Verified payments, net of reversals'],
        ['BOQ completion',boqPlanned>0?(boqCompleted/boqPlanned*100).toFixed(1)+'%':'—',uiMessage('{{0}} items · weighted by planned value',[boq.length])],
        ['Milestone completion',milestones.length?delivered+' / '+milestones.length:'—',uiMessage('{{0}} overdue · certified milestones count as complete',[overdue])],
      ].map(([label,value,sub])=><div key={label} className="min-w-0 rounded-2xl border border-blue-100 bg-white p-4"><p className="text-xs font-medium text-slate-500">{uiText(label)}</p><p className="mt-2 break-words text-2xl font-semibold text-slate-900">{value}</p><p className="mt-2 text-xs text-slate-500">{uiText(sub)}</p></div>)}
    </div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4"><h2 className="font-semibold text-slate-900">{uiText('Project comparison')}</h2><p className="text-xs text-slate-500">{uiMessage('Showing {{0}} of {{1}} projects',[projects.length,scoped.length])}</p></div>
      <Table><THead><Tr>{['Project','Current status','Physical Progress','BOQ completion','Current milestone','Sanctioned money','Disbursed money','Expenditure','Available funds','Outstanding bills'].map(label=><Th key={label}>{uiText(label)}</Th>)}</Tr></THead><TBody>
        {projects.map(p=><Tr key={p.id}>
          <Td className="min-w-[230px] max-w-xs whitespace-normal"><Link to={`/projects/${p.id}`} className="inline-flex min-h-11 items-center gap-1 font-semibold text-blue-800 hover:underline">{p.name}<ArrowUpRight size={14} className="shrink-0"/></Link><p className="mt-1 text-xs text-slate-500">{p.district} · {p.id}</p></Td>
          <Td className="min-w-[165px]"><StatusBadge status={p.status}/><p className="my-2 text-xs text-slate-500">{uiText(p.stage)}</p><DeadlineBadge project={p}/><p className="mt-2 text-xs text-slate-500">{formatDate(p.plannedCompletionDate)}</p></Td>
          <Td className="min-w-[150px]"><strong>{p.physicalProgress}%</strong><div className="mt-2"><ProgressBar value={p.physicalProgress}/></div></Td>
          <Td className="min-w-[150px]">{(() => {
            const items=boq.filter(item=>item.projectId===p.id);
            const planned=items.reduce((n,item)=>n+item.plannedQty*item.rate,0);
            const done=items.reduce((n,item)=>n+Math.min(item.completedQty,item.plannedQty)*item.rate,0);
            return <><Link className={amountLink} to={`/projects/${p.id}?tab=${projectTabs.includes('boq')?'boq':'overview'}`}>{planned>0?(done/planned*100).toFixed(1)+'%':'—'}<ArrowUpRight size={12}/></Link><p className="text-xs text-slate-500">{uiMessage('{{0}} BOQ items',[items.length])}</p></>;
          })()}</Td>
          <Td className="min-w-[200px] max-w-xs whitespace-normal">{(() => {
            const stages=milestones.filter(item=>item.projectId===p.id).sort((a,b)=>a.order-b.order);
            const current=stages.find(item=>!isMilestoneDelivered(item.status));
            return <><Link className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-blue-700 hover:underline" to={`/projects/${p.id}?tab=${projectTabs.includes('milestones')?'milestones':'overview'}`}>{current?current.name:uiText(stages.length?'All milestones completed':'No milestones recorded')}<ArrowUpRight size={12} className="shrink-0"/></Link>{current&&<><StatusBadge status={current.status}/><p className="mt-2 text-xs text-slate-500">{formatDate(current.plannedDate)}{isMilestoneOverdue(current)?' · '+uiText('Overdue'):''}</p></>}</>;
          })()}</Td>
          <Td className="whitespace-nowrap" title={formatCurrencyFull(p.sanctionedBudget)}>{formatCurrency(p.sanctionedBudget)}</Td>
          <Td><Link className={amountLink} title={formatCurrencyFull(p.amountReleased)} to={financePath(p.id,'receipts')}>{formatCurrency(p.amountReleased)}<ArrowUpRight size={12}/></Link></Td>
          <Td><Link className={amountLink} title={formatCurrencyFull(p.amountSpent)} to={financePath(p.id,'payments')}>{formatCurrency(p.amountSpent)}<ArrowUpRight size={12}/></Link><p className="text-xs text-slate-500">{p.sanctionedBudget ? (p.amountSpent/p.sanctionedBudget*100).toFixed(1)+'%' : '—'} {uiText('of budget')}</p></Td>
          <Td className={p.amountReleased-p.amountSpent<0?'whitespace-nowrap font-semibold text-red-700':'whitespace-nowrap'} title={formatCurrencyFull(p.amountReleased-p.amountSpent)}>{formatCurrency(p.amountReleased-p.amountSpent)}</Td>
          <Td><Link className={amountLink} to={canFinance?financePath(p.id,'bills'):`/projects/${p.id}?tab=finance`}>{formatCurrency(pending.filter(b=>b.projectId===p.id).reduce((n,b)=>n+b.netPayable,0))}<ArrowUpRight size={12}/></Link></Td>
        </Tr>)}
      </TBody></Table>
      {!projects.length&&<p role="status" className="p-8 text-center text-sm text-slate-500">{uiText('No projects match these filters.')}</p>}
    </section>
    <p className="text-xs leading-relaxed text-slate-500">{uiText("BOQ completion is weighted by item rate and capped at planned quantity. Current milestone is the first uncertified milestone in sequence.")} </p><p className="text-xs leading-relaxed text-slate-500">{uiText('Summary figures follow the selected filters. Available funds equal verified receipts minus expenditure; outstanding bills are shown separately. Scroll the comparison horizontally on smaller screens.')}</p>
  </div>;
}
