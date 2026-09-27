import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Gauge, Wallet, Clock3 } from 'lucide-react';
import type { Project } from '../../types';
import { useStore } from '../../store/useStore';
import { financeInsights, type FinanceDecision } from '../../lib/financeInsights';
import { formatCurrency, formatCurrencyFull } from '../../lib/utils';
import { uiMessage, uiText } from '../../i18n/ui';

const labels = {
  budget: 'Budget overrun', funding: 'Funding shortfall', ageing: 'Ageing bill', evidence: 'Payment missing bill link',
};
const actions = {
  budget: 'Review the sanctioned budget and payment records before further commitments.',
  funding: 'Confirm available receipts and arrange the project funding needed for approved bills.',
  ageing: 'Review the bill and resolve its verification, approval or payment blocker.',
  evidence: 'Reconcile this payment with its source bill before relying on bill-level reporting.',
};
export function FinanceDecisionPanel({ projects }: { projects: Project[] }) {
  const state = useStore();
  const data = financeInsights(projects,state.bills,state.controlRecords);
  const [filter,setFilter] = useState<'all' | FinanceDecision['category']>('all');
  const [limit,setLimit] = useState(6);
  const decisions = data.decisions.filter(d => filter === 'all' || d.category === filter);
  const cards = [
    {key:'budget' as const,label:'Budget utilisation',value:data.utilisation === null ? '—' : data.utilisation.toFixed(1)+'%',description:uiText('Verified expenditure / sanctioned budget'),icon:Gauge},
    {key:'funding' as const,label:'Approved bills funding gap',value:formatCurrency(data.fundingGap),description:uiMessage('{{0}} projects need funding review',[data.affectedProjects]),icon:Wallet},
    {key:'ageing' as const,label:'Bills pending over 30 days',value:formatCurrency(data.agedAmount),description:uiMessage('{{0}} outstanding bills since submission',[data.agedCount]),icon:Clock3},
  ];
  return <div className="space-y-5">
    <div className="grid gap-3 lg:grid-cols-3" data-testid="trend-kpis">{cards.map(card=><button key={card.key} aria-pressed={filter===card.key} onClick={()=>{setFilter(card.key);setLimit(6);}} className={`min-w-0 rounded-2xl border p-5 text-left transition hover:border-blue-400 ${filter===card.key?'border-blue-400 bg-blue-50':'border-slate-200 bg-slate-50'}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-600"><card.icon size={18} className="shrink-0 text-blue-600"/>{uiText(card.label)}</div>
      <p className="mt-3 break-words text-3xl font-bold tabular-nums text-slate-900">{card.value}</p><p className="mt-2 text-xs text-slate-500">{card.description}</p>
    </button>)}</div>
    <div className="rounded-2xl border border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div><h2 className="font-semibold text-slate-900">{uiText('Decision priorities')}</h2><p className="mt-1 text-xs text-slate-500">{uiText('Critical items first, then highest financial exposure. Amounts may overlap; do not add them together.')}</p></div>
        <button className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-blue-700" onClick={()=>{setFilter('all');setLimit(6);}}>{uiText('All priorities')} ({data.decisions.length})</button>
      </div>
      <div className="divide-y divide-slate-100">{decisions.slice(0,limit).map(d=>{
        const project=projects.find(p=>p.id===d.projectId)!;
        const bill=state.bills.find(b=>b.id===d.billId);
        const path=d.recordId ? `/projects/${d.projectId}?tab=controls&record=${encodeURIComponent(d.recordId)}`
          : d.billId ? `/projects/${d.projectId}?tab=finance&bill=${encodeURIComponent(d.billId)}`
          : `/finance?project=${encodeURIComponent(d.projectId)}&view=${d.category==='funding'?'bills':'payments'}`;
        return <article key={d.id} className="flex flex-wrap items-start justify-between gap-4 p-4">
          <div className="min-w-0 flex-1 basis-64">
            <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${d.priority==='critical'?'bg-red-50 text-red-700':'bg-amber-50 text-amber-800'}`}>{uiText(d.priority==='critical'?'Critical':'Review')}</span><h3 className="text-sm font-semibold text-slate-900">{uiText(labels[d.category])}</h3></div>
            <p className="mt-2 break-words text-sm text-slate-700">{project.name}{bill ? ' · '+bill.billNumber : ''}</p>
            <p className="mt-1 text-xs text-slate-500">{d.days !== undefined ? uiMessage('{{0}} days since submission',[d.days]) : d.category==='budget' ? uiText('Expenditure above sanctioned budget') : d.category==='funding' ? uiText('Approved unpaid bills minus available project funds') : uiMessage('{{0}} verified payments have no matching bill',[d.count ?? 1])}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{uiText(actions[d.category])}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end"><strong className="tabular-nums text-slate-900">{formatCurrencyFull(d.amount)}</strong><Link className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-blue-700 hover:underline" to={path}>{uiText('Review records')}<ArrowUpRight size={15}/></Link></div>
        </article>;
      })}</div>
      {!decisions.length && <p role="status" className="p-6 text-sm text-slate-500">{uiText('No items meet these review thresholds in the selected projects.')}</p>}
      {decisions.length>limit && <button className="m-4 min-h-11 rounded-xl border border-blue-200 px-4 text-sm text-blue-700" onClick={()=>setLimit(n=>n+6)}>{uiText('Load more')} ({decisions.length-limit})</button>}
    </div>
    <details className="text-xs leading-relaxed text-slate-500"><summary className="min-h-8 cursor-pointer font-semibold">{uiText('Analysis basis')}</summary><p>{uiText('Funding gaps are calculated per project: approved unpaid bills minus receipts remaining after expenditure. Surpluses in other projects are not assumed transferable. A negative cash balance is included in the gap. Bill ageing starts at submission; 30 days is a review threshold, not a contractual due date. Only recorded, verified transactions count; this is not a bank balance or a payment instruction.')}</p></details>
  </div>;
}
