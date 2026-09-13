import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Building2, AlertTriangle, Wallet, ClipboardCheck, ShieldAlert, ArrowRight, MapPinned, ScanEye, Gavel, Layers,
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { KpiGroupCard } from '../../components/common/KpiCard';
import { ProjectMap } from '../../components/common/ProjectMap';
import { Card, CardContent, CardHeader, CardTitle, ProgressBar, StatusBadge, Button, Textarea, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/primitives';
import { Dialog, DialogContent, DialogFooter } from '../../components/ui/overlays';
import { formatCurrency, formatDate, seededImageUrl, cn } from '../../lib/utils';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { AccessManagement } from '../admin/AccessManagement';

const SENIOR_ROLES = ['MINISTER', 'COMMISSIONER', 'REGIONAL_DIRECTOR'];
const PRIORITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const STATUS_HEX: Record<string, string> = { ON_TRACK: '#3b82f6', AT_RISK: '#f59e0b', DELAYED: '#ef4444', COMPLETED: '#10b981' };

export function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { projects, projectIds, scopeLabel, isStatewide } = useProjectScope();
  const allApprovals = useStore((s) => s.approvals);
  const allInspections = useStore((s) => s.inspections);
  const allContractors = useStore((s) => s.contractors);
  const allPhotos = useStore((s) => s.photos);
  const allWorkers = useStore((s) => s.workers);
  const allDecisions = useStore((s) => s.decisions);
  const resolveDecision = useStore((s) => s.resolveDecision);
  const currentUser = useStore((s) => s.currentUser);
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState('');
  const [focusDivision, setFocusDivision] = useState<string | null>(null);

  const approvals = useMemo(() => allApprovals.filter((a) => projectIds.has(a.projectId)), [allApprovals, projectIds]);
  const inspections = useMemo(() => allInspections.filter((i) => projectIds.has(i.projectId)), [allInspections, projectIds]);
  const photos = useMemo(() => allPhotos.filter((p) => projectIds.has(p.projectId)), [allPhotos, projectIds]);
  const workers = useMemo(() => allWorkers.filter((w) => projectIds.has(w.projectId)), [allWorkers, projectIds]);
  const contractors = useMemo(() => allContractors.filter((c) => c.assignedProjectIds.some((id) => projectIds.has(id))), [allContractors, projectIds]);
  const allExtensionsOfTime = useStore((s) => s.extensionsOfTime);
  const allChangeOrders = useStore((s) => s.changeOrders);
  const allBills = useStore((s) => s.bills);

  const kpis = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter((p) => p.status === 'ON_TRACK' || p.status === 'AT_RISK').length;
    const completed = projects.filter((p) => p.status === 'COMPLETED').length;
    const delayed = projects.filter((p) => p.status === 'DELAYED').length;
    const sanctioned = projects.reduce((s, p) => s + p.sanctionedBudget, 0);
    const spent = projects.reduce((s, p) => s + p.amountSpent, 0);
    const pendingApprovals = approvals.filter((a) => a.status === 'PENDING').length;
    const failedQc = inspections.filter((i) => i.overallResult === 'FAIL').length;
    // Exception-first signals: a report shouldn't just be "72% physical progress" — it should
    // also surface where reported/financial progress has drifted ahead of certified field evidence.
    const financialAnomalies = projects.filter((p) => p.status !== 'COMPLETED' && (p.reportedProgress - p.physicalProgress >= 8 || p.financialProgress - p.physicalProgress >= 15)).length;
    const now = Date.now();
    const staleProjects = projects.filter((p) => {
      if (p.status === 'COMPLETED') return false;
      const lastPhoto = photos.filter((ph) => ph.projectId === p.id).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      if (!lastPhoto) return true;
      return (now - new Date(lastPhoto.date).getTime()) / 86400000 > 14;
    }).length;
    const projectIdsInScope = new Set(projects.map((p) => p.id));
    const overdueInspections = inspections.filter((i) => i.status === 'SCHEDULED' && new Date(i.scheduledDate) < new Date()).length;
    const overdueApprovals = approvals.filter((a) => a.status === 'PENDING' && (now - new Date(a.submittedDate).getTime()) / 86400000 > 15).length;
    const billsOver30Days = allBills.filter((b) => projectIdsInScope.has(b.projectId) && !['PAID', 'REJECTED'].includes(b.status) && (now - new Date(b.submittedDate).getTime()) / 86400000 > 30).length;
    const projectsRequiringEot = allExtensionsOfTime.filter((e) => projectIdsInScope.has(e.projectId) && (e.status === 'PENDING' || e.status === 'RECOMMENDED')).length;
    const projectsWithCostVariation = allChangeOrders.filter((c) => projectIdsInScope.has(c.projectId) && c.status === 'PENDING_APPROVAL').length;
    const handoverDueSoon = projects.filter((p) => p.status !== 'COMPLETED' && (new Date(p.plannedCompletionDate).getTime() - now) / 86400000 <= 30 && (new Date(p.plannedCompletionDate).getTime() - now) / 86400000 >= 0).length;
    return { total, inProgress, completed, delayed, sanctioned, spent, pendingApprovals, failedQc, financialAnomalies, staleProjects, overdueInspections, overdueApprovals, billsOver30Days, projectsRequiringEot, projectsWithCostVariation, handoverDueSoon };
  }, [projects, approvals, inspections, photos, allBills, allExtensionsOfTime, allChangeOrders]);

  const statusDist = ['ON_TRACK', 'AT_RISK', 'DELAYED', 'COMPLETED'].map((s) => ({
    name: s.replace('_', ' '), value: projects.filter((p) => p.status === s).length, key: s,
  }));

  const divisionStats = useMemo(() => {
    const map = new Map<string, { division: string; total: number; delayed: number; completed: number }>();
    projects.forEach((p) => {
      const cur = map.get(p.division) ?? { division: p.division, total: 0, delayed: 0, completed: 0 };
      cur.total += 1;
      if (p.status === 'DELAYED') cur.delayed += 1;
      if (p.status === 'COMPLETED') cur.completed += 1;
      map.set(p.division, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [projects]);

  const districtBudget = useMemo(() => {
    const map = new Map<string, { district: string; sanctioned: number; spent: number }>();
    projects.forEach((p) => {
      const cur = map.get(p.district) ?? { district: p.district, sanctioned: 0, spent: 0 };
      cur.sanctioned += p.sanctionedBudget; cur.spent += p.amountSpent;
      map.set(p.district, cur);
    });
    return Array.from(map.values()).slice(0, 8);
  }, [projects]);

  const avgPhysical = projects.length ? Math.round(projects.reduce((s, p) => s + p.physicalProgress, 0) / projects.length) : 0;
  const avgFinancial = projects.length ? Math.round(projects.reduce((s, p) => s + p.financialProgress, 0) / projects.length) : 0;

  const delayedProjects = projects.filter((p) => p.status === 'DELAYED').sort((a, b) => b.delayDays - a.delayDays).slice(0, 6);
  const upcomingInspections = inspections.filter((i) => i.status === 'SCHEDULED').slice(0, 6);
  const pendingApprovalsList = approvals.filter((a) => a.status === 'PENDING').slice(0, 6);
  const criticalAlerts = [
    ...inspections.filter((i) => i.overallResult === 'FAIL').slice(0, 3).map((i) => ({ text: t('dashboard.alertInspectionFailed', { project: projects.find((p) => p.id === i.projectId)?.name }), id: i.id })),
    ...projects.filter((p) => p.status === 'DELAYED').slice(0, 2).map((p) => ({ text: t('dashboard.alertDelayedBy', { project: p.name, days: p.delayDays }), id: p.id })),
  ].slice(0, 5);
  const recentPhotos = [...photos].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  const workersOnSite = workers.filter((w) => w.attendanceStatus === 'PRESENT').length;
  const topContractors = [...contractors].sort((a, b) => b.performanceScore - a.performanceScore).slice(0, 5);

  const isSeniorRole = !!currentUser && SENIOR_ROLES.includes(currentUser.role);
  const pendingDecisions = useMemo(() =>
    allDecisions
      .filter((d) => d.status === 'PENDING' && projectIds.has(d.projectId))
      .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.pendingSince < b.pendingSince ? -1 : 1)),
    [allDecisions, projectIds]);
  const activeDecision = pendingDecisions.find((d) => d.id === decisionId);

  // Superadmin's "dashboard" is the Access Management console — access/permission
  // governance is their job, not project monitoring.
  if (currentUser?.role === 'SUPERADMIN') return <AccessManagement />;

  return (
    <div>
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.subtitle', { name: currentUser?.name })}
      />

      {!isStatewide && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-navy-200 bg-navy-50 px-3 py-2 text-xs font-medium text-navy-700">
          <MapPinned size={14} /> Showing data scoped to your jurisdiction: {scopeLabel}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center">
          <Building2 className="mx-auto mb-2 text-slate-300" size={28} />
          <p className="text-sm font-medium text-slate-600">No projects are currently assigned to your account.</p>
          <p className="mt-1 text-xs text-slate-400">Contact your Executive Engineer or District Health Officer if this seems incorrect.</p>
        </div>
      ) : (
      <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiGroupCard
          title={t('dashboard.kpiTotalProjects')} icon={Building2} tone="blue"
          primary={{ value: kpis.total, label: 'projects' }} onPrimaryClick={() => navigate('/projects')}
          stats={[
            { label: t('dashboard.kpiInProgress').toLowerCase(), value: kpis.inProgress, tone: 'blue' },
            { label: t('dashboard.kpiCompleted').toLowerCase(), value: kpis.completed, tone: 'emerald' },
            { label: t('dashboard.kpiDelayed').toLowerCase(), value: kpis.delayed, tone: 'red' },
          ]}
        />
        <KpiGroupCard
          title="Budget & Spend" icon={Wallet} tone="amber"
          primary={{ value: formatCurrency(kpis.sanctioned), label: 'sanctioned' }}
          stats={[
            { label: `spent (${kpis.sanctioned ? Math.round((kpis.spent / kpis.sanctioned) * 100) : 0}%)`, value: formatCurrency(kpis.spent), tone: 'amber', onClick: () => navigate('/finance') },
          ]}
        />
        <KpiGroupCard
          title="Approvals & Quality" icon={ClipboardCheck} tone="amber"
          primary={{ value: kpis.pendingApprovals, label: 'pending approvals' }} onPrimaryClick={() => navigate('/approvals')}
          stats={[
            { label: t('dashboard.kpiFailedQuality').toLowerCase(), value: kpis.failedQc, tone: 'red', onClick: () => navigate('/quality') },
          ]}
        />
        <KpiGroupCard
          title="Data Integrity Flags" icon={ScanEye} tone="red"
          primary={{ value: kpis.financialAnomalies + kpis.staleProjects, label: 'flagged projects' }} onPrimaryClick={() => navigate('/projects')}
          stats={[
            { label: 'progress/financial anomalies', value: kpis.financialAnomalies, tone: 'amber' },
            { label: 'no recent field activity', value: kpis.staleProjects, tone: 'red' },
          ]}
        />
        {isSeniorRole && (
          <KpiGroupCard
            title="Governance Watchlist" icon={AlertTriangle} tone="red"
            primary={{ value: kpis.overdueInspections + kpis.overdueApprovals + kpis.billsOver30Days + kpis.projectsRequiringEot + kpis.projectsWithCostVariation, label: 'items need attention' }}
            stats={[
              { label: 'inspections overdue', value: kpis.overdueInspections, tone: kpis.overdueInspections > 0 ? 'red' : 'default' },
              { label: 'approvals 15+ days', value: kpis.overdueApprovals, tone: kpis.overdueApprovals > 0 ? 'red' : 'default', onClick: () => navigate('/approvals') },
              { label: 'bills > 30 days', value: kpis.billsOver30Days, tone: kpis.billsOver30Days > 0 ? 'red' : 'default', onClick: () => navigate('/finance') },
              { label: 'EOT requests', value: kpis.projectsRequiringEot, tone: 'amber' },
              { label: 'cost variations', value: kpis.projectsWithCostVariation, tone: 'amber' },
              { label: 'handovers due (30d)', value: kpis.handoverDueSoon, tone: 'blue' },
            ]}
          />
        )}
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle className="flex items-center gap-2"><Layers size={15} /> Zone-wise Overview</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {divisionStats.map((z) => (
            <button
              key={z.division}
              onClick={() => setFocusDivision(z.division)}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors hover:border-navy-300 hover:bg-navy-50',
                focusDivision === z.division ? 'border-navy-400 bg-navy-50' : 'border-slate-200 bg-white',
              )}
            >
              <p className="truncate text-xs font-semibold text-slate-800">{z.division.replace(' Division', '')}</p>
              <p className="mt-1 text-xl font-bold text-navy-700">{z.total}</p>
              <p className="mt-0.5 text-[10.5px] text-slate-400">
                {z.completed} completed{z.delayed > 0 && <span className="text-red-500"> · {z.delayed} delayed</span>}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>{t('dashboard.mapTitle')}</CardTitle></CardHeader>
          <CardContent><ProjectMap projects={projects} focusDivision={focusDivision} onDivisionSelect={setFocusDivision} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('dashboard.criticalAlerts')}</CardTitle></CardHeader>
          <CardContent className="space-y-2.5 p-4">
            {criticalAlerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                <ShieldAlert size={14} className="mt-0.5 shrink-0" /> {a.text}
              </div>
            ))}
            {criticalAlerts.length === 0 && <p className="text-xs text-slate-400">{t('dashboard.noCriticalAlerts')}</p>}
            <button onClick={() => navigate('/notifications')} className="flex w-full items-center justify-center gap-1 pt-1 text-xs font-medium text-navy-700 hover:underline">
              {t('header.viewAllNotifications')} <ArrowRight size={12} />
            </button>
          </CardContent>
        </Card>
      </div>

      {isSeniorRole && (
        <Card className="mt-4">
          <CardHeader><CardTitle className="flex items-center gap-2"><Gavel size={15} /> Decision Tracker ({pendingDecisions.length} pending)</CardTitle></CardHeader>
          {pendingDecisions.length === 0 ? (
            <CardContent className="p-4"><p className="text-xs text-slate-400">No decisions currently pending in your jurisdiction.</p></CardContent>
          ) : (
            <Table>
              <THead><Tr><Th>Decision Required</Th><Th>Project</Th><Th>Financial Impact</Th><Th>Schedule Impact</Th><Th>Pending With</Th><Th>Pending Since</Th><Th>Priority</Th><Th /></Tr></THead>
              <TBody>
                {pendingDecisions.map((d) => (
                  <Tr key={d.id}>
                    <Td className="max-w-[240px] truncate font-medium text-slate-800">{d.decisionRequired}</Td>
                    <Td className="max-w-[160px] truncate">{projects.find((p) => p.id === d.projectId)?.name}</Td>
                    <Td>{d.financialImpact ? formatCurrency(d.financialImpact) : '—'}</Td>
                    <Td>{d.scheduleImpactDays ? `${d.scheduleImpactDays} days` : '—'}</Td>
                    <Td>{t(`roles.${d.pendingWith}`)}</Td>
                    <Td>{formatDate(d.pendingSince)}</Td>
                    <Td><StatusBadge status={d.priority} /></Td>
                    <Td>
                      {d.pendingWith === currentUser?.role && (
                        <Button size="sm" variant="outline" onClick={() => { setDecisionId(d.id); setOutcome(''); }}>Decide</Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>{t('dashboard.statusDistribution')}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {statusDist.map((s) => <Cell key={s.key} fill={STATUS_HEX[s.key]} />)}
                </Pie>
                <RTooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('dashboard.physicalVsFinancial')}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4 py-2">
              <div>
                <div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">{t('dashboard.physicalProgress')}</span><span className="font-semibold text-slate-700">{avgPhysical}%</span></div>
                <ProgressBar value={avgPhysical} colorClass="bg-blue-500" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">{t('dashboard.financialProgress')}</span><span className="font-semibold text-slate-700">{avgFinancial}%</span></div>
                <ProgressBar value={avgFinancial} colorClass="bg-emerald-500" />
              </div>
              <p className="rounded-md bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                {Math.abs(avgFinancial - avgPhysical) < 5 ? t('dashboard.gapAligned')
                  : avgFinancial > avgPhysical ? t('dashboard.gapFinancialAhead')
                  : t('dashboard.gapPhysicalAhead')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('dashboard.districtBudget')}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={districtBudget} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f8" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(v)} />
                <YAxis type="category" dataKey="district" width={70} tick={{ fontSize: 10 }} />
                <RTooltip formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="sanctioned" fill="#d7e0ee" name="Sanctioned" radius={[0, 3, 3, 0]} />
                <Bar dataKey="spent" fill="#265aa0" name="Spent" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('dashboard.delayedProjects')}</CardTitle></CardHeader>
          <Table>
            <THead><Tr><Th>{t('dashboard.colProject')}</Th><Th>{t('dashboard.colDistrict')}</Th><Th>{t('dashboard.colDelay')}</Th><Th /></Tr></THead>
            <TBody>
              {delayedProjects.map((p) => (
                <Tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)}>
                  <Td className="font-medium text-slate-800">{p.name}</Td>
                  <Td>{p.district}</Td>
                  <Td><StatusBadge status="DELAYED" label={t('dashboard.daysSuffix', { count: p.delayDays })} /></Td>
                  <Td><ArrowRight size={14} className="text-slate-300" /></Td>
                </Tr>
              ))}
              {delayedProjects.length === 0 && <Tr><Td className="py-6 text-center text-slate-400" ><span /></Td></Tr>}
            </TBody>
          </Table>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('dashboard.pendingApprovalsTitle')}</CardTitle></CardHeader>
          <Table>
            <THead><Tr><Th>{t('dashboard.colType')}</Th><Th>{t('dashboard.colProject')}</Th><Th>{t('dashboard.colAmount')}</Th><Th>{t('dashboard.colStep')}</Th></Tr></THead>
            <TBody>
              {pendingApprovalsList.map((a) => (
                <Tr key={a.id} onClick={() => navigate('/approvals')}>
                  <Td className="font-medium text-slate-800">{a.type.replace('_', ' ')}</Td>
                  <Td className="max-w-[160px] truncate">{projects.find((p) => p.id === a.projectId)?.name}</Td>
                  <Td>{a.amount ? formatCurrency(a.amount) : '—'}</Td>
                  <Td><StatusBadge status="PENDING" label={a.chain[a.currentStepIndex]?.replace('_', ' ')} /></Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      </div>

      {/* Upcoming Inspections and Workforce on Site are field-operational widgets — not part of
          an executive command-centre view. Senior roles see Contractor Performance only, which
          is the accountability signal a Secretary/Commissioner actually needs at this altitude. */}
      <div className={cn('mt-4 grid grid-cols-1 gap-4', isSeniorRole ? '' : 'lg:grid-cols-3')}>
        {!isSeniorRole && (
          <Card>
            <CardHeader><CardTitle>{t('dashboard.upcomingInspections')}</CardTitle></CardHeader>
            <CardContent className="space-y-2.5">
              {upcomingInspections.map((i) => (
                <div key={i.id} className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-medium text-slate-700">{i.category.replace('_', ' ')}</p>
                    <p className="text-[10.5px] text-slate-400">{projects.find((p) => p.id === i.projectId)?.name}</p>
                  </div>
                  <span className="text-[10.5px] text-slate-500">{formatDate(i.scheduledDate)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className={isSeniorRole ? 'lg:max-w-md' : ''}>
          <CardHeader><CardTitle>{t('dashboard.contractorPerformance')}</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {topContractors.map((c) => (
              <div key={c.id}>
                <div className="mb-1 flex justify-between text-xs"><span className="truncate font-medium text-slate-700">{c.company}</span><span className="text-slate-500">{c.performanceScore}%</span></div>
                <ProgressBar value={c.performanceScore} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        {!isSeniorRole && (
          <Card>
            <CardHeader><CardTitle>{t('dashboard.workforceOnSite')}</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <p className="text-4xl font-bold text-navy-800">{workersOnSite}</p>
              <p className="mt-1 text-xs text-slate-400">{t('dashboard.workforceSub', { total: workers.length })}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>{t('dashboard.recentSiteImages')}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {recentPhotos.map((ph) => (
              <button key={ph.id} onClick={() => navigate(`/projects/${ph.projectId}?tab=photos`)} className="group overflow-hidden rounded-md border border-slate-200 text-left">
                <img src={seededImageUrl(ph.seed, 300, 200, ph.stage)} className="h-24 w-full object-cover transition-transform group-hover:scale-105" />
                <div className="p-1.5">
                  <p className="truncate text-[10.5px] font-medium text-slate-700">{ph.stage}</p>
                  <p className="text-[10px] text-slate-400">{formatDate(ph.date)}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      </>
      )}

      <Dialog open={!!decisionId} onOpenChange={(v) => !v && setDecisionId(null)}>
        {activeDecision && (
          <DialogContent title="Record Decision" description={activeDecision.decisionRequired}>
            <div className="space-y-2 text-xs">
              <p className="text-slate-500">Recommended action: <span className="text-slate-700">{activeDecision.recommendedAction}</span></p>
              <Textarea rows={3} placeholder="Decision outcome / remarks…" value={outcome} onChange={(e) => setOutcome(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDecisionId(null)}>Cancel</Button>
              <Button onClick={() => { resolveDecision(activeDecision.id, outcome.trim() || 'Decided.'); toast.success('Decision recorded.'); setDecisionId(null); }}>Record Decision</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
