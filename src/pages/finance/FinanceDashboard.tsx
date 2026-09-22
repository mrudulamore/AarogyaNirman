import { verifiedFundReports } from '../../lib/verifiedFundReports';
import { todayDate } from '../../lib/fundDisbursal';
import { ExpenditureCharts } from '../../components/common/ExpenditureCharts';
import { uiMessage, uiText, useUiLanguage } from '../../i18n/ui';
import { FundDisbursalReports } from './FundDisbursalReports';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend } from 'recharts';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, StatusBadge, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/primitives';
import { KpiCard } from '../../components/common/KpiCard';
import { Wallet, TrendingUp, ClipboardCheck, XCircle, MapPinned } from 'lucide-react';
import { formatCurrency, formatCurrencyFull } from '../../lib/utils';

export function FinanceDashboard() {
  useUiLanguage();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { projects, projectIds, scopeLabel, isStatewide } = useProjectScope();
  const state = useStore();
  const allBills = state.bills;
  const payable = verifiedFundReports(state, projects, todayDate()).contractor.pending;
  const bills = allBills.filter((b) => projectIds.has(b.projectId));

  const sanctioned = projects.reduce((s, p) => s + p.sanctionedBudget, 0);
  const spent = projects.reduce((s, p) => s + p.amountSpent, 0);
  const pendingBills = payable.length;
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

  const overBudget = projects.filter((p) => p.amountSpent > p.sanctionedBudget * 0.95);
  const pendingBillsList = [...payable].sort((a, b) => (a.submittedDate < b.submittedDate ? 1 : -1)).slice(0, 8);

  return (
    <div>
      <PageHeader title={uiText(t('pages.finance.title'))} description={uiText(t('pages.finance.desc'))} />

      {!isStatewide && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-navy-200 bg-navy-50 px-3 py-2 text-xs font-medium text-navy-700">
          <MapPinned size={14} />{uiText(" Showing finance data scoped to your jurisdiction: ")}{uiText(scopeLabel)}
        </div>
      )}

      <p className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">{uiText("Expenditure equals verified contractor payments minus reversals. Project totals, district charts and receipt/payment registers share this ledger; legacy paid labels are not proof of payment.")}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label={uiText("Sanctioned Budget")} value={formatCurrency(sanctioned)} icon={Wallet} />
        <KpiCard label={uiText("Expenditure")} value={formatCurrency(spent)} sub={uiMessage('{{0}}% utilized', [sanctioned ? Math.round((spent / sanctioned) * 100) : 0])} icon={TrendingUp} tone="amber" />
        <KpiCard label={uiText("Pending Bills")} value={pendingBills} icon={ClipboardCheck} tone="amber" />
        <KpiCard label={uiText("Rejected Bills")} value={rejectedBills} icon={XCircle} tone="red" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-1">
        <Card>
          <CardHeader><CardTitle>{uiText("District-wise Expenditure")}</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto"><div style={{ minWidth: Math.max(660, districtData.length * 105) }}><ResponsiveContainer width="100%" height={390}>
              <BarChart data={districtData} margin={{ top: 26, right: 25, bottom: 14, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
                <XAxis dataKey="district" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(v)} />
                <RTooltip formatter={(v: any) => formatCurrencyFull(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar label={{ position: 'top', fill: '#334155', fontSize: 10, formatter: (value: unknown) => typeof value === 'number' ? formatCurrency(value) : String(value ?? '') }} dataKey="sanctioned" fill="#d7e0ee" name={uiText("Sanctioned")} radius={[3, 3, 0, 0]} />
                <Bar label={{ position: 'top', fill: '#334155', fontSize: 10, formatter: (value: unknown) => typeof value === 'number' ? formatCurrency(value) : String(value ?? '') }} dataKey="spent" fill="#265aa0" name={uiText("Spent")} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer></div></div>
          </CardContent>
        </Card>

        <ExpenditureCharts projectIds={projectIds} />
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>{uiText("Project-wise Expenditure (Top 10)")}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={projectData} layout="vertical" margin={{ left: 10, right: 55, top: 24, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(v)} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
              <RTooltip formatter={(v: any) => formatCurrencyFull(v)} />
              <Bar label={{ position: 'right', fill: '#334155', fontSize: 10, formatter: (value: unknown) => typeof value === 'number' ? formatCurrency(value) : String(value ?? '') }} dataKey="sanctioned" fill="#d7e0ee" name={uiText("Sanctioned")} radius={[0, 3, 3, 0]} />
              <Bar label={{ position: 'right', fill: '#334155', fontSize: 10, formatter: (value: unknown) => typeof value === 'number' ? formatCurrency(value) : String(value ?? '') }} dataKey="spent" fill="#265aa0" name={uiText("Spent")} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <FundDisbursalReports projects={projects} scopeLabel={scopeLabel} />
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{uiText("Budget Overrun Alerts")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {overBudget.length === 0 && <p className="text-xs text-slate-400">{uiText("No projects nearing budget overrun.")}</p>}
            {overBudget.map((p) => (
              <div key={p.id} onClick={() => navigate(`/projects/${p.id}?tab=finance`)} className="cursor-pointer rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 hover:bg-amber-100">
                <strong>{p.name}</strong> — {Math.round((p.amountSpent / p.sanctionedBudget) * 100)}{uiText("% of sanctioned budget utilized")}</div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{uiText("Pending Payments")}</CardTitle></CardHeader>
          <Table>
            <THead><Tr><Th>{uiText("Bill No.")}</Th><Th>{uiText("Project")}</Th><Th>{uiText("Net Payable")}</Th><Th>{uiText("Status")}</Th></Tr></THead>
            <TBody>
              {pendingBillsList.map((b) => (
                <Tr key={b.id} onClick={() => navigate(`/projects/${b.projectId}?tab=finance&bill=${b.id}`)}>
                  <Td className="font-medium text-slate-800">{uiText(b.billNumber)}</Td>
                  <Td className="min-w-[140px] max-w-[260px] whitespace-normal break-words">{projects.find((p) => p.id === b.projectId)?.name}</Td>
                  <Td>{uiText(formatCurrency(b.netPayable))}</Td>
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
