import { FinanceDecisionPanel } from './FinanceDecisionPanel';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, ArrowRight, Landmark, Search, Wallet, Download } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { ledgerTransactions, outstandingBills } from '../../lib/financeLedger';
import { todayDate } from '../../lib/fundDisbursal';
import { formatCurrency, formatCurrencyFull, formatDate } from '../../lib/utils';
import { uiText, useUiLanguage } from '../../i18n/ui';
import { StatusBadge, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/primitives';
import { ExpenditureCharts } from '../../components/common/ExpenditureCharts';
import { FundDisbursalReports } from './FundDisbursalReports';

const VIEWS = [
  ['projects', 'Project budgets'], ['receipts', 'Receipts'], ['payments', 'Expenditure'],
  ['bills', 'Bills'], ['trends', 'Trends'], ['reports', 'Reports & roadmap'],
] as const;
type View = typeof VIEWS[number][0];
const linkStyle = 'inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

export function FinanceDashboard() {
  useUiLanguage();
  const state = useStore();
  const { projects: scopedProjects, scopeLabel } = useProjectScope();
  const [params, setParams] = useSearchParams();
  const register = useRef<HTMLElement>(null);
  const requestedView = params.get('view');
  const view: View = VIEWS.some(([key]) => key === requestedView) ? requestedView as View : 'projects';
  const projectId = params.get('project') ?? 'ALL';
  const query = params.get('q') ?? '';
  const billFilter = params.get('bills') ?? 'outstanding';
  const projects = scopedProjects.filter(p => projectId === 'ALL' || p.id === projectId);
  const ids = new Set(projects.map(p => p.id));
  const transactions = projects.flatMap(p => ledgerTransactions(state.controlRecords, p.id))
    .sort((a,b) => b.fields.transactionDate.localeCompare(a.fields.transactionDate) || a.reference.localeCompare(b.reference));
  const receipts = transactions.filter(r => r.kind === 'RECEIPT');
  const payments = transactions.filter(r => r.kind === 'PAYMENT');
  const sum = (rows: typeof transactions) => rows.reduce((n,r) => n + Number(r.fields.amount), 0);
  const sanctioned = projects.reduce((n,p) => n + p.sanctionedBudget, 0);
  const disbursed = sum(receipts);
  const expenditure = sum(payments);
  const bills = state.bills.filter(b => ids.has(b.projectId));
  const pending = outstandingBills(bills, state.controlRecords);
  const pendingTotal = pending.reduce((n,b) => n + b.netPayable, 0);
  const projectName = (id: string) => projects.find(p => p.id === id)?.name ?? id;
  const matches = (...values: string[]) => values.join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  const billLink = (project: string, bill: string) => `/projects/${encodeURIComponent(project)}?tab=finance&bill=${encodeURIComponent(bill)}`;
  const recordLink = (project: string, record: string) => `/projects/${encodeURIComponent(project)}?tab=controls&record=${encodeURIComponent(record)}`;
  function update(changes: Record<string,string>) {
    setParams(previous => { const next = new URLSearchParams(previous); Object.entries(changes).forEach(([key,value]) => value ? next.set(key,value) : next.delete(key)); return next; });
  }
  function openView(next: View, project?: string) {
    update({view:next, q:'', ...(project ? {project} : {})});
    register.current?.scrollIntoView({behavior:'smooth', block:'start'});
  }
  const districts = Array.from(new Set(projects.map(p => p.district))).map(district => {
    const group = projects.filter(p => p.district === district);
    const groupIds = new Set(group.map(p => p.id));
    return { district, sanctioned:group.reduce((n,p)=>n+p.sanctionedBudget,0),
      disbursed:sum(receipts.filter(r=>groupIds.has(r.projectId))), expenditure:sum(payments.filter(r=>groupIds.has(r.projectId))) };
  });
  const visibleProjects = projects.filter(p => matches(p.name,p.district));
  const visibleTransactions = (view === 'receipts' ? receipts : payments).filter(r => matches(r.reference, projectName(r.projectId), r.fields.accountingHead ?? '', state.bills.find(b => b.id === r.fields.billId)?.billNumber ?? ''));
  const visibleBills = (billFilter === 'outstanding' ? pending : bills).filter(b => matches(b.billNumber, projectName(b.projectId), state.contractors.find(c => c.id === b.contractorId)?.company ?? ''));
  return <div className="space-y-6 pb-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">{uiText('Finance & Bills')}</p><h1 className="text-3xl font-semibold tracking-tight text-slate-900">{uiText('Every rupee, clearly accounted for')}</h1><p className="mt-2 text-sm text-slate-500">{uiText(scopeLabel)} · {uiText('As of date')}: {formatDate(todayDate())}</p></div>
      <button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-800 hover:bg-blue-50" onClick={() => openView('reports')}><Download size={16}/>{uiText('Reports & roadmap')}</button>
    </header>

    <label className="block max-w-xl text-sm font-medium text-slate-600">{uiText('Project')}
      <select aria-label={uiText('Project')} value={projectId} onChange={e => update({project:e.target.value,q:''})} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-800">
        <option value="ALL">{uiText('All projects in scope')}</option>{scopedProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </label>

    <div className="grid gap-4 lg:grid-cols-3" data-testid="finance-totals">
      {[
        {title:'Sanctioned money', amount:sanctioned, description:'Approved budget for selected projects', action:'View project budgets', target:'projects' as View, icon:Landmark, color:'bg-blue-600'},
        {title:'Disbursed money', amount:disbursed, description:'Government funds received by projects', action:'View actual receipts', target:'receipts' as View, icon:ArrowDownLeft, color:'bg-cyan-700'},
        {title:'Expenditure', amount:expenditure, description:'Verified payments made to contractors', action:'View payments & linked bills', target:'payments' as View, icon:ArrowUpRight, color:'bg-indigo-600'},
      ].map(item => <button key={item.target} onClick={() => openView(item.target)} className="group min-w-0 rounded-3xl border border-blue-100 bg-white p-4 text-left sm:p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <div className="flex items-center gap-3"><span className={`rounded-2xl p-3 text-white ${item.color}`}><item.icon size={21}/></span><h2 className="font-semibold text-slate-700">{uiText(item.title)}</h2></div>
        <p className="mt-3 break-words text-3xl sm:mt-5 font-bold tracking-tight text-slate-900">{formatCurrency(item.amount)}</p>
        <p className="mt-1 break-words text-xs tabular-nums text-slate-500">{formatCurrencyFull(item.amount)}</p>
        <p className="mt-3 text-sm text-slate-500 sm:mt-4">{uiText(item.description)}</p>
        <span className="mt-3 flex items-center justify-between sm:mt-5 gap-2 border-t border-slate-100 pt-4 text-sm font-semibold text-blue-700">{uiText(item.action)}<ArrowRight size={17} className="shrink-0"/></span>
      </button>)}
    </div>

    <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-slate-900 px-6 py-5 text-white">
      <div className="flex items-start gap-3"><Wallet size={21} className="mt-1 shrink-0 text-cyan-300"/><div><p className="text-xs text-slate-300">{uiText('Available funds')}</p><p className="mt-1 text-xl font-semibold">{formatCurrency(disbursed-expenditure)}</p><p className="mt-1 text-xs text-slate-400">{uiText('Disbursed minus expenditure')}</p></div></div>
      <div><p className="text-xs text-slate-300">{uiText('Budget awaiting disbursal')}</p><p className="mt-1 text-xl font-semibold">{formatCurrency(Math.max(0,sanctioned-disbursed))}</p>{disbursed > sanctioned && <p className="text-xs text-amber-300">{uiText('Receipts exceed sanctioned budget')}</p>}</div>
      <button onClick={() => { update({view:'bills',bills:'outstanding',q:''}); register.current?.scrollIntoView({behavior:'smooth'}); }} className="rounded-xl border border-slate-600 px-4 py-3 text-left hover:bg-slate-800"><p className="text-xs text-slate-300">{uiText('Outstanding bills')} · {pending.length}</p><p className="mt-1 flex items-center gap-4 text-xl font-semibold">{formatCurrency(pendingTotal)}<ArrowRight size={17}/></p></button>
    </div>
    <p className="text-xs leading-relaxed text-slate-500">{uiText('Receipts and expenditure include verified transactions only, net of reversals. Outstanding bills are not counted as expenditure.')}</p>

    <section ref={register} className="scroll-mt-24 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50/70 p-3" aria-label={uiText('Finance sections')}>
        {VIEWS.map(([key,label]) => <button key={key} aria-pressed={view===key} onClick={() => update({view:key,q:''})} className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition ${view===key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-blue-50'}`}>{uiText(label)}</button>)}
      </div>
      <div className="p-4 sm:p-6">
        {['projects','receipts','payments','bills'].includes(view) && <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-slate-900">{uiText(VIEWS.find(([key]) => key===view)![1])}</h2><p className="mt-1 text-xs text-slate-500">{uiText('Open a reference to see its original record and supporting evidence.')}</p></div>
          <label className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-slate-200 px-3 sm:w-72"><Search size={16} className="shrink-0 text-slate-400"/><input aria-label={uiText('Search financial records')} placeholder={uiText('Search financial records')} value={query} onChange={e => update({q:e.target.value})} className="min-w-0 w-full bg-transparent text-sm outline-none"/></label>
        </div>}
        {view==='projects' && <Table><THead><Tr>{['Project','Sanctioned money','Disbursed money','Expenditure','Available funds'].map(label => <Th key={label}>{uiText(label)}</Th>)}</Tr></THead><TBody>
          {visibleProjects.map(p => { const received=sum(receipts.filter(r=>r.projectId===p.id)); const spent=sum(payments.filter(r=>r.projectId===p.id)); return <Tr key={p.id}>
            <Td className="min-w-[220px] max-w-sm whitespace-normal"><Link className={linkStyle} to={`/projects/${p.id}?tab=finance`}>{p.name}</Link><p className="text-xs text-slate-500">{p.district}</p></Td>
            <Td className="whitespace-nowrap tabular-nums">{formatCurrency(p.sanctionedBudget)}</Td>
            <Td><button className={linkStyle} onClick={() => openView('receipts',p.id)}>{formatCurrency(received)}<ArrowRight size={13}/></button></Td>
            <Td><button className={linkStyle} onClick={() => openView('payments',p.id)}>{formatCurrency(spent)}<ArrowRight size={13}/></button></Td>
            <Td className="whitespace-nowrap tabular-nums">{formatCurrency(received-spent)}</Td>
          </Tr>; })}
        </TBody></Table>}
        {(view==='receipts'||view==='payments') && <Table><THead><Tr>{['Date','Reference','Project','Amount',view==='receipts'?'Accounting head':'Bill No.'].map(label=><Th key={label}>{uiText(label)}</Th>)}</Tr></THead><TBody>
          {visibleTransactions.map(r=> { const bill=state.bills.find(b=>b.id===r.fields.billId && b.projectId===r.projectId); return <Tr key={r.id}>
            <Td className="whitespace-nowrap">{formatDate(r.fields.transactionDate)}</Td>
            <Td><Link className={linkStyle} to={recordLink(r.projectId,r.id)}>{r.reference}<ArrowUpRight size={13}/></Link></Td>
            <Td className="min-w-[200px] max-w-sm whitespace-normal">{projectName(r.projectId)}</Td>
            <Td className="whitespace-nowrap font-semibold tabular-nums">{formatCurrencyFull(Number(r.fields.amount))}</Td>
            <Td>{view==='receipts' ? r.fields.accountingHead || '—' : bill ? <Link className={linkStyle} to={billLink(r.projectId,bill.id)}>{bill.billNumber}<ArrowUpRight size={13}/></Link> : uiText('No linked bill')}</Td>
          </Tr>;})}
        </TBody></Table>}
        {view==='bills' && <>
          <div className="mb-4 flex flex-wrap gap-2">{[['outstanding','Outstanding bills'],['all','All bills']].map(([key,label])=><button key={key} aria-pressed={billFilter===key} onClick={()=>update({bills:key})} className={`min-h-11 rounded-full border px-4 text-sm ${billFilter===key?'border-blue-300 bg-blue-50 text-blue-800':'border-slate-200 text-slate-600'}`}>{uiText(label)}</button>)}</div>
          <Table><THead><Tr>{['Bill No.','Project','Submitted on',billFilter==='outstanding'?'Outstanding balance':'Net Payable','Status'].map(label=><Th key={label}>{uiText(label)}</Th>)}</Tr></THead><TBody>
            {visibleBills.map(b=><Tr key={b.id}><Td><Link className={linkStyle} to={billLink(b.projectId,b.id)}>{b.billNumber}<ArrowUpRight size={13}/></Link></Td><Td className="min-w-[200px] max-w-sm whitespace-normal">{projectName(b.projectId)}</Td><Td className="whitespace-nowrap">{formatDate(b.submittedDate)}</Td><Td className="whitespace-nowrap font-semibold tabular-nums">{formatCurrencyFull(b.netPayable)}</Td><Td><StatusBadge status={b.status}/></Td></Tr>)}
          </TBody></Table>
        </>}
        {((view==='projects'&&!visibleProjects.length)||((view==='receipts'||view==='payments')&&!visibleTransactions.length)||(view==='bills'&&!visibleBills.length)) && <div role="status" className="py-12 text-center"><p className="font-semibold text-slate-700">{uiText('No matching financial records')}</p><p className="mt-2 text-sm text-slate-500">{uiText('Choose another project or clear your search.')}</p></div>}
        {view==='trends' && <div className="space-y-6"><FinanceDecisionPanel key={projectId} projects={projects}/>
          <div><h2 className="mb-4 text-lg font-semibold text-slate-900">{uiText('District-wise Expenditure')}</h2>
            <div className="overflow-x-auto"><div style={{minWidth:Math.max(720,districts.length*150)}}>
              <ResponsiveContainer width="100%" height={360}><BarChart data={districts} margin={{top:25,right:30,bottom:15,left:25}}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0"/>
                <XAxis dataKey="district" interval={0} angle={-20} textAnchor="end" height={65} tick={{fontSize:11}}/>
                <YAxis tickFormatter={value=>formatCurrency(Number(value))} tick={{fontSize:10}}/>
                <Tooltip formatter={value=>formatCurrencyFull(Number(value))}/><Legend/>
                {[['sanctioned','Sanctioned money','#2563eb'],['disbursed','Disbursed money','#0e7490'],['expenditure','Expenditure','#4f46e5']].map(([key,label,color])=><Bar key={key} dataKey={key} name={uiText(label)} fill={color} radius={[4,4,0,0]} maxBarSize={30} label={{position:'top',fontSize:10,formatter:(value:unknown)=>formatCurrency(Number(value))}}/>)}
              </BarChart></ResponsiveContainer>
            </div></div>
          </div><ExpenditureCharts projectIds={ids}/>
        </div>}
        {view==='reports' && <FundDisbursalReports projects={projects} scopeLabel={scopeLabel}/>}
      </div>
    </section>
  </div>;
}
