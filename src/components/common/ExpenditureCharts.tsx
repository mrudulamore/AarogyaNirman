import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { useStore } from '../../store/useStore';
import { monthlyExpenditure } from '../../lib/financeLedger';
import { todayDate } from '../../lib/fundDisbursal';
import { formatCurrency, formatCurrencyFull } from '../../lib/utils';
import { uiText, useUiLanguage } from '../../i18n/ui';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/primitives';

export function ExpenditureCharts({ projectIds }: { projectIds: Set<string> }) {
  useUiLanguage();
  const records = useStore(s => s.controlRecords);
  const months = monthlyExpenditure(records, projectIds);
  const total = months.reduce((n,m) => n + m.amount, 0);
  return <Card className="min-w-0">
    <CardHeader><div><CardTitle>{uiText('Monthly expenditure · last 12 months')}</CardTitle><p className="mt-1 text-xs text-slate-500">{uiText('Verified payments less reversals, by transaction date. Current month is partial.')} · {todayDate()}</p></div><strong className="text-lg tabular-nums text-blue-900">{formatCurrency(total)}</strong></CardHeader>
    <CardContent>
      <div className="overflow-x-auto"><div className="min-w-[720px]">
        <ResponsiveContainer width="100%" height={300}><BarChart data={months} margin={{ top: 30, right: 25, bottom: 10, left: 25 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
          <XAxis dataKey="month" tick={{ fontSize: 11 }} interval={0}/><YAxis tickFormatter={value => formatCurrency(Number(value))} tick={{ fontSize: 10 }}/>
          <Tooltip formatter={value => formatCurrencyFull(Number(value))}/>
          <Bar dataKey="amount" name={uiText('Net expenditure')} maxBarSize={36} radius={[6,6,0,0]}>
            {months.map(m => <Cell key={m.month} fill={m.amount < 0 ? '#f59e0b' : '#2563eb'}/>)}</Bar>
        </BarChart></ResponsiveContainer>
      </div></div>
      <details className="mt-3 rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-semibold">{uiText('Monthly change and reconciliation')}</summary>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">{months.map(m => <div key={m.month} className="rounded-xl bg-slate-50 p-3 text-xs"><p className="text-slate-500">{m.month}</p><p className="my-1 font-semibold tabular-nums">{formatCurrency(m.amount)}</p><p className={m.change > 0 ? 'text-blue-700' : m.change < 0 ? 'text-amber-700' : 'text-slate-500'}>{m.change > 0 ? '↑ ' : m.change < 0 ? '↓ ' : '— '}{formatCurrency(Math.abs(m.change))}{m.changePct !== null ? ` (${Math.abs(m.changePct).toFixed(1)}%)` : ''}</p></div>)}</div>
        <p className="mt-3 text-xs text-slate-500">{uiText('Change compares each month with the previous month. Percent change is omitted when the previous month is zero. Negative expenditure represents reversals.')}</p>
      </details>
    </CardContent>
  </Card>;
}
