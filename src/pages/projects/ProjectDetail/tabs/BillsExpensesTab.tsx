import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip } from 'recharts';
import type { Project } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/primitives';
import { formatCurrency, formatCurrencyFull } from '../../../../lib/utils';

export { FinanceTab as BillsTab } from './FinanceTab';

export function ExpensesTab({ project }: { project: Project }) {
  const bills = useStore((s) => s.bills).filter((b) => b.projectId === project.id);
  const pending = bills.filter((b) => !['PAID', 'REJECTED'].includes(b.status)).length;
  const approved = bills.filter((b) => b.status === 'APPROVED' || b.status === 'PAID').length;
  const rejected = bills.filter((b) => b.status === 'REJECTED').length;
  const remaining = project.sanctionedBudget - project.amountSpent;

  const chartData = [
    { name: 'Sanctioned', value: project.sanctionedBudget },
    { name: 'Released', value: project.amountReleased },
    { name: 'Spent', value: project.amountSpent },
    { name: 'Remaining', value: remaining },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="Pending Bills" value={pending} />
        <StatBox label="Approved / Paid" value={approved} />
        <StatBox label="Rejected" value={rejected} />
        <StatBox label="Budget Utilization" value={`${Math.round((project.amountSpent / project.sanctionedBudget) * 100)}%`} />
      </div>

      <Card>
        <CardHeader><CardTitle>Budget vs Actual</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(v)} />
              <RTooltip formatter={(v: any) => formatCurrencyFull(v)} />
              <Bar dataKey="value" fill="#265aa0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {project.amountSpent > project.sanctionedBudget * 0.9 && (
        <div className="rounded-md bg-amber-50 px-4 py-2.5 text-xs text-amber-700">Budget utilization has crossed 90% — monitor remaining scope closely.</div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-3.5"><p className="text-[10.5px] font-medium uppercase text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-slate-800">{value}</p></div>;
}
