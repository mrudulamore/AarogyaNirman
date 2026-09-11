import { useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Clock, ShieldAlert, ShieldCheck, TrendingDown, Wallet, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, ProgressBar, StatusBadge, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/primitives';
import { KpiCard } from '../../components/common/KpiCard';
import { formatCurrency, formatDate } from '../../lib/utils';

export function ContractorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contractors = useStore((s) => s.contractors);
  const projects = useStore((s) => s.projects);
  const defects = useStore((s) => s.defects);
  const bills = useStore((s) => s.bills);
  const contractorPocs = useStore((s) => s.contractorPocs);

  const contractor = contractors.find((c) => c.id === id);
  const companyPocs = contractorPocs.filter((poc) => poc.contractorId === id);

  // When arrived at via a project's Team/Overview tab (?from=<projectId>), remember it so the
  // breadcrumb and back-link return to that project instead of dropping the user at the generic
  // contractors list — this was the "redirection back" bug reported from the Ministry dashboard.
  const fromProjectId = searchParams.get('from');
  const fromProject = fromProjectId ? projects.find((p) => p.id === fromProjectId) : undefined;

  const stats = useMemo(() => {
    if (!contractor) return null;
    const myProjects = projects.filter((p) => p.contractorId === contractor.id);
    const active = myProjects.filter((p) => p.status !== 'COMPLETED');
    const completed = myProjects.filter((p) => p.status === 'COMPLETED');
    const delayed = myProjects.filter((p) => p.status === 'DELAYED');
    const avgDelay = myProjects.length ? Math.round(myProjects.reduce((s, p) => s + p.delayDays, 0) / myProjects.length) : 0;

    const myDefects = defects.filter((d) => d.contractorId === contractor.id);
    const closedDefects = myDefects.filter((d) => d.status === 'CLOSED' && d.closedDate);
    const avgClosureDays = closedDefects.length
      ? Math.round(closedDefects.reduce((s, d) => s + (new Date(d.closedDate!).getTime() - new Date(d.createdDate).getTime()) / 86400000, 0) / closedDefects.length)
      : 0;
    const defectRate = myProjects.length ? Math.round((myDefects.length / myProjects.length) * 10) / 10 : 0;

    const myBills = bills.filter((b) => b.contractorId === contractor.id);
    const disputedBills = myBills.filter((b) => b.status === 'REJECTED');

    return { myProjects, active, completed, delayed, avgDelay, myDefects, avgClosureDays, defectRate, myBills, disputedBills };
  }, [contractor, projects, defects, bills]);

  if (!contractor || !stats) {
    return (
      <div className="py-20 text-center text-sm text-slate-500">
        Contractor not found.{' '}
        <button className="text-navy-700 underline" onClick={() => navigate(fromProject ? `/projects/${fromProject.id}` : '/contractors')}>
          {fromProject ? `Back to ${fromProject.name}` : 'Back to contractors'}
        </button>
      </div>
    );
  }

  const underperforming = contractor.performanceScore < 65 || stats.delayed.length >= 2 || stats.disputedBills.length >= 2;

  return (
    <div>
      <Breadcrumbs items={fromProject
        ? [{ label: 'Projects', to: '/projects' }, { label: fromProject.name, to: `/projects/${fromProject.id}` }, { label: contractor.company }]
        : [{ label: 'Contractors', to: '/contractors' }, { label: contractor.company }]} />

      {fromProject && (
        <button
          onClick={() => navigate(`/projects/${fromProject.id}?tab=team`)}
          className="mb-3 flex items-center gap-1.5 text-xs font-medium text-navy-700 hover:underline"
        >
          <ArrowLeft size={13} /> Back to {fromProject.name}
        </button>
      )}

      <Card className="mb-4">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-navy-50 text-navy-700"><Building2 size={20} /></div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-bold text-slate-900">{contractor.company}</h1>
                    <StatusBadge status={contractor.status} label={contractor.status.replace('_', ' ')} />
                  </div>
                  <p className="text-xs text-slate-500">Reg. {contractor.regId} · {contractor.classification} · {contractor.contactPerson} · {contractor.phone}</p>
                </div>
              </div>
            </div>
            {underperforming && (
              <span className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                <AlertTriangle size={13} /> Decision-support flag: repeated performance concerns
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total Contracts" value={stats.myProjects.length} icon={Building2} />
        <KpiCard label="Active Contracts" value={stats.active.length} icon={Clock} tone="blue" />
        <KpiCard label="Completed Contracts" value={stats.completed.length} icon={ShieldCheck} tone="emerald" />
        <KpiCard label="Delayed Contracts" value={stats.delayed.length} icon={AlertTriangle} tone={stats.delayed.length > 0 ? 'red' : 'default'} />
        <KpiCard label="Average Delay" value={`${stats.avgDelay} days`} icon={TrendingDown} tone={stats.avgDelay > 0 ? 'amber' : 'default'} />
        <KpiCard label="Defect Rate" value={`${stats.defectRate} / project`} icon={ShieldAlert} />
        <KpiCard label="Avg. Defect Closure Time" value={`${stats.avgClosureDays} days`} icon={Clock} />
        <KpiCard label="Bill Disputes" value={stats.disputedBills.length} icon={Wallet} tone={stats.disputedBills.length > 0 ? 'red' : 'default'} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Performance Scorecard</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { l: 'Overall Performance', v: contractor.performanceScore },
              { l: 'Schedule Adherence', v: contractor.scheduleAdherence },
              { l: 'Quality Score', v: contractor.qualityScoreAvg },
              { l: 'Safety / Compliance Score', v: contractor.safetyScore },
              { l: 'Bill Processing Score', v: contractor.billProcessingScore },
            ].map((m) => (
              <div key={m.l}>
                <div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">{m.l}</span><span className="font-semibold text-slate-800">{m.v}%</span></div>
                <ProgressBar value={m.v} colorClass={m.v >= 75 ? 'bg-emerald-500' : m.v >= 55 ? 'bg-amber-500' : 'bg-red-500'} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Contract Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Row label="Contract Amount (latest)" value={formatCurrency(contractor.contractAmount)} />
            <Row label="Contract Period" value={`${formatDate(contractor.startDate)} — ${formatDate(contractor.endDate)}`} />
            <Row label="Open Defects" value={String(contractor.openDefects)} />
            <Row label="Total Defects Raised" value={String(stats.myDefects.length)} />
            <Row label="Total Bills Submitted" value={String(stats.myBills.length)} />
            <Row label="Disputed / Rejected Bills" value={String(stats.disputedBills.length)} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Team / Points of Contact</CardTitle></CardHeader>
        {companyPocs.length === 0 ? (
          <CardContent className="p-4 text-xs text-slate-400">No points of contact registered.</CardContent>
        ) : (
          <Table>
            <THead><Tr><Th>Name</Th><Th>Designation</Th><Th>Role</Th><Th>Phone</Th><Th>Email</Th><Th>Assigned Projects</Th><Th>Availability</Th><Th /></Tr></THead>
            <TBody>
              {companyPocs.map((poc) => (
                <Tr key={poc.id}>
                  <Td className="font-medium text-slate-800">{poc.name}</Td>
                  <Td>{poc.designation}</Td>
                  <Td>{poc.role}</Td>
                  <Td>{poc.phone}</Td>
                  <Td className="max-w-[160px] truncate">{poc.email}</Td>
                  <Td>{poc.assignedProjectIds.length}</Td>
                  <Td><StatusBadge status={poc.siteAvailability === 'ON_SITE' ? 'ACTIVE' : poc.siteAvailability === 'AVAILABLE' ? 'APPROVED' : 'PENDING'} label={poc.siteAvailability.replace('_', ' ')} /></Td>
                  <Td>{poc.isPrimary && <StatusBadge status="APPROVED" label="Primary" />}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Card className="mt-4">
        <CardHeader><CardTitle>Performance by Project</CardTitle></CardHeader>
        <Table>
          <THead><Tr><Th>Project</Th><Th>Status</Th><Th>Physical</Th><Th>Financial</Th><Th>Delay</Th><Th>Quality Score</Th></Tr></THead>
          <TBody>
            {stats.myProjects.map((p) => (
              <Tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)}>
                <Td className="max-w-[220px] truncate font-medium text-slate-800">{p.name}</Td>
                <Td><StatusBadge status={p.status} /></Td>
                <Td>{p.physicalProgress}%</Td>
                <Td>{p.financialProgress}%</Td>
                <Td className={p.delayDays > 0 ? 'text-red-600' : ''}>{p.delayDays > 0 ? `${p.delayDays} days` : 'On schedule'}</Td>
                <Td>{p.qualityScore}%</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between border-b border-slate-50 pb-1.5"><span className="text-slate-400">{label}</span><span className="font-medium text-slate-700">{value}</span></div>;
}
