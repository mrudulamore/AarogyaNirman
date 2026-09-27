import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { uiText, uiMessage } from '../../i18n/ui';

export type ProgressPoint = { month: string; planned: number; verified: number; financial: number };
const series = [
  { key: 'planned', label: 'Schedule estimate', note: 'Linear estimate from project start and completion dates.', color: '#64748b' },
  { key: 'verified', label: 'Reported work', note: 'Highest reported physical completion in this month.', color: '#2563eb' },
  { key: 'financial', label: 'Budget spent', note: 'Verified payments as a share of sanctioned budget.', color: '#0f766e' },
] as const;
const percent = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? n.toFixed(1).replace(/\.0$/, '') + '%' : '—';
const month = (s: string) => new Date(s + '-01T00:00:00').toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
export function ProgressComparison({ rows }: { rows: ProgressPoint[] }) {
  if (!rows.length) return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">{uiText('No progress reports available.')}<p className="mt-2 text-xs">{uiText('Add a dated progress report to compare work, schedule and spending.')}</p></div>;
  const latest = rows[rows.length - 1];
  const gap = latest.verified - latest.planned;
  return <div data-testid="progress-comparison" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-800">{month(latest.month)}</p><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{uiText(rows.length === 1 ? 'Single-month snapshot' : 'Latest reported month')}</span></div>
    <div className="space-y-4">{series.map(s => <div key={s.key}>
      <div className="mb-1 flex justify-between gap-3 text-sm"><span className="font-semibold text-slate-700">{uiText(s.label)}</span><strong className="tabular-nums" style={{color:s.color}}>{percent(latest[s.key])}</strong></div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className="h-full rounded-full" style={{background:s.color,width:Math.max(0,Math.min(100,latest[s.key] || 0))+'%'}} /></div>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{uiText(s.note)}</p>
    </div>)}</div>
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-relaxed text-blue-950"><strong>{uiText('What this means')}</strong><p className="mt-1">{Number.isFinite(gap) ? uiMessage(gap < 0 ? 'Reported work is {{0}} percentage points below the schedule estimate.' : gap > 0 ? 'Reported work is {{0}} percentage points above the schedule estimate.' : 'Reported work matches the schedule estimate.', gap ? [Math.abs(gap).toFixed(1)] : []) : uiText('Schedule comparison unavailable.')}</p><p className="mt-1 text-xs text-slate-600">{uiText('Reported work is not certification. Spending and work completion measure different things; a gap calls for review, not an automatic finding.')}</p></div>
    {rows.length === 1 ? <p className="text-xs leading-relaxed text-slate-500">{uiText('Only one month is available. A trend needs at least two months; no missing months have been invented.')}</p> : <>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">{series.map(s=><span key={s.key} className="flex items-center gap-2"><span className="h-2 w-5 rounded" style={{background:s.color}}/>{uiText(s.label)}</span>)}</div>
      <ResponsiveContainer width="100%" height={230}><LineChart data={rows} margin={{top:12,right:18,left:0,bottom:8}}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tickFormatter={month} tick={{fontSize:10}} minTickGap={25}/><YAxis width={42} unit="%" domain={[0, Math.max(100,...rows.flatMap(r=>[r.planned,r.verified,r.financial]).filter(Number.isFinite))]} tick={{fontSize:10}}/><Tooltip formatter={percent} labelFormatter={v=>month(String(v))}/>{series.map(s=><Line key={s.key} dataKey={s.key} name={uiText(s.label)} stroke={s.color} strokeWidth={2.5} strokeDasharray={s.key==='planned'?'5 4':undefined} dot={{r:3}} isAnimationActive={false}/>)}</LineChart></ResponsiveContainer>
    </>}
    <details className="rounded-xl border border-slate-200"><summary className="cursor-pointer px-3 py-3 text-sm font-semibold text-slate-700">{uiText('Monthly progress values')} · {rows.length}</summary><div className="overflow-x-auto"><table className="w-full text-sm tabular-nums"><caption className="px-3 pb-3 text-left text-xs text-slate-500">{uiText('All values are percentages. Schedule is an estimate; reported work comes from progress reports.')}</caption><thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="p-3 text-left">{uiText('Period')}</th>{series.map(s=><th key={s.key} className="p-3 text-right">{uiText(s.label)}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.month} className="border-t border-slate-100 odd:bg-white even:bg-slate-50"><th className="whitespace-nowrap p-3 text-left font-medium">{month(r.month)}</th>{series.map(s=><td key={s.key} className="p-3 text-right">{percent(r[s.key])}</td>)}</tr>)}</tbody></table></div></details>
  </div>;
}
