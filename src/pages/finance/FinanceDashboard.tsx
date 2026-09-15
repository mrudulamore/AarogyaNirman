import { FundDisbursalReports } from './FundDisbursalReports';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, LineChart, Line, Legend } from 'recharts';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, StatusBadge, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/primitives';
import { KpiCard } from '../../components/common/KpiCard';
import { Wallet, TrendingUp, ClipboardCheck, XCircle, MapPinned } from 'lucide-react';
import { formatCurrency, formatCurrencyFull } from '../../lib/utils';

export function FinanceDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { projects, projectIds, scopeLabel, isStatewide } = useProjectScope();
  const allBills = useStore((s) => s.bills);
  const bills = allBills.filter((b) => projectIds.has(b.projectId));

  const sanctioned = projects.reduce((s, p) => s + p.sanctionedBudget, 0);
  const spent = projects.reduce((s, p) => s + p.amountSpent, 0);
  const pendingBills = bills.filter((b) => !['PAID', 'REJECTED'].includes(b.status)).length;
  const rejectedBills = bills.filter((b) => b.status === 'REJECTED').length;

  const districtData = useMemo(() => {
    const map = new Map<string, { district: string; sanctioned: number; spent: number }>();
    projects.forEach((p) => {
      const cur = map.get(p.district) ?? { district: p.district, sanctioned: 0, spent: 0 };
      cur.sanctioned += p.sanctionedBudget; cur.spent += p.amountSpent;
      map.set(p.district, cur);
    });
    return Array.from(map.values());
  }, [projects]);

  const projectData = [...projects].sort((a, b) => b.amountSpent - a.amountSpent).slice(0, 10).map((p) => ({ name: p.name.split('—')[1]?.trim() ?? p.name, spent: p.amountSpent, sanctioned: p.sanctionedBudget }));

  const monthlyTrend = useMemo(() => {
    const map = new Map<string, number>();
    bills.filter((b) => b.status === 'PAID' && b.paidDate).forEach((b) => {
      const key = b.paidDate!.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + b.netPayable);
    });
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-8).map(([month, amount]) => ({ month, amount }));
  }, [bills]);

  const overBudget = projects.filter((p) => p.amountSpent > p.sanctionedBudget * 0.95);
  const pendingBillsList = bills.filter((b) => !['PAID', 'REJECTED'].includes(b.status)).sort((a, b) => (a.submittedDate < b.submittedDate ? 1 : -1)).slice(0, 8);

  return (
    <div>
      <PageHeader title={t('pages.finance.title')} description={t('pages.finance.desc')} />

      {!isStatewide && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-navy-200 bg-navy-50 px-3 py-2 text-xs font-medium text-navy-700">
          <MapPinned size={14} /> Showing finance data scoped to your jurisdiction: {scopeLabel}
        </div>
      )}

      <FundDisbursalReports projects={projects} scopeLabel={scopeLabel} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Sanctioned Budget" value={formatCurrency(sanctioned)} icon={Wallet} />
        <KpiCard label="Expenditure" value={formatCurrency(spent)} sub={`${sanctioned ? Math.round((spent / sanctioned) * 100) : 0}% utilized`} icon={TrendingUp} tone="amber" />
        <KpiCard label="Pending Bills" value={pendingBills} icon={ClipboardCheck} tone="amber" />
        <KpiCard label="Rejected Bills" value={rejectedBills} icon={XCircle} tone="red" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>District-wise Expenditure</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={districtData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
                <XAxis dataKey="district" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(v)} />
                <RTooltip formatter={(v: any) => formatCurrencyFull(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="sanctioned" fill="#d7e0ee" name="Sanctioned" radius={[3, 3, 0, 0]} />
                <Bar dataKey="spent" fill="#265aa0" name="Spent" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Monthly Expenditure (Paid Bills)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(v)} />
                <RTooltip formatter={(v: any) => formatCurrencyFull(v)} />
                <Line type="monotone" dataKey="amount" stroke="#265aa0" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Project-wise Expenditure (Top 10)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={projectData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(v)} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
              <RTooltip formatter={(v: any) => formatCurrencyFull(v)} />
              <Bar dataKey="sanctioned" fill="#d7e0ee" name="Sanctioned" radius={[0, 3, 3, 0]} />
              <Bar dataKey="spent" fill="#265aa0" name="Spent" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Budget Overrun Alerts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {overBudget.length === 0 && <p className="text-xs text-slate-400">No projects nearing budget overrun.</p>}
            {overBudget.map((p) => (
              <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="cursor-pointer rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 hover:bg-amber-100">
                <strong>{p.name}</strong> — {Math.round((p.amountSpent / p.sanctionedBudget) * 100)}% of sanctioned budget utilized
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pending Payments</CardTitle></CardHeader>
          <Table>
            <THead><Tr><Th>Bill No.</Th><Th>Project</Th><Th>Net Payable</Th><Th>Status</Th></Tr></THead>
            <TBody>
              {pendingBillsList.map((b) => (
                <Tr key={b.id} onClick={() => navigate(`/projects/${b.projectId}?tab=bills`)}>
                  <Td className="font-medium text-slate-800">{b.billNumber}</Td>
                  <Td className="max-w-[140px] truncate">{projects.find((p) => p.id === b.projectId)?.name}</Td>
                  <Td>{formatCurrency(b.netPayable)}</Td>
                  <Td><StatusBadge status={b.status} /></Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
