import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Building2, AlertTriangle, Wallet, ClipboardCheck, ShieldAlert, ArrowRight, MapPinned, ScanEye, Gavel, Layers, X,
  Flame, GitBranch, CalendarClock, TriangleAlert,
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { KpiGroupCard } from '../../components/common/KpiCard';
import { ProjectMap } from '../../components/common/ProjectMap';
import { Card, CardContent, CardHeader, CardTitle, ProgressBar, StatusBadge, Button, Textarea, Table, THead, TBody, Tr, Th, Td, Label } from '../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogFooter } from '../../components/ui/overlays';
import { formatCurrency, formatDate, photoSrc, cn } from '../../lib/utils';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { AccessManagement } from '../admin/AccessManagement';
import { FieldHome } from '../field/FieldHome';
import { SCHEMES, MAHARASHTRA_HIERARCHY } from '../../lib/constants';
import type { Project, SitePhoto } from '../../types';
import { Capacitor } from '@capacitor/core';

const SENIOR_ROLES = ['MINISTER', 'COMMISSIONER', 'REGIONAL_DIRECTOR'];
const FIELD_ROLES = ['DEPUTY_ENGINEER', 'CONTRACTOR'];
const PRIORITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const STATUS_HEX: Record<string, string> = { ON_TRACK: '#3b82f6', AT_RISK: '#f59e0b', DELAYED: '#ef4444', COMPLETED: '#10b981' };

type StatusFilterKey = 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'ANOMALY' | 'STALE';

const BUDGET_BANDS: { key: string; label: string; test: (p: Project) => boolean }[] = [
  { key: 'UNDER_10', label: 'Under ₹10 Cr', test: (p) => p.sanctionedBudget < 100000000 },
  { key: '10_25', label: '₹10–25 Cr', test: (p) => p.sanctionedBudget >= 100000000 && p.sanctionedBudget < 250000000 },
  { key: '25_50', label: '₹25–50 Cr', test: (p) => p.sanctionedBudget >= 250000000 && p.sanctionedBudget < 500000000 },
  { key: 'OVER_50', label: '₹50 Cr+', test: (p) => p.sanctionedBudget >= 500000000 },
];

/** Zone/Budget/Scheme are simple field-level filters — no dependency on other derived state. */
function matchesScopeFilters(p: Project, f: { zone: string; budget: string; scheme: string }) {
  if (f.zone !== 'ALL' && p.division !== f.zone) return false;
  if (f.scheme !== 'ALL' && p.scheme !== f.scheme) return false;
  if (f.budget !== 'ALL') {
    const band = BUDGET_BANDS.find((b) => b.key === f.budget);
    if (band && !band.test(p)) return false;
  }
  return true;
}

function isFinancialAnomaly(p: Project) {
  return p.status !== 'COMPLETED' && (p.reportedProgress - p.physicalProgress >= 8 || p.financialProgress - p.physicalProgress >= 15);
}
function isStaleProject(p: Project, photos: SitePhoto[]) {
  if (p.status === 'COMPLETED') return false;
  const lastPhoto = photos.filter((ph) => ph.projectId === p.id).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (!lastPhoto) return true;
  return (Date.now() - new Date(lastPhoto.date).getTime()) / 86400000 > 14;
}
/** The status-click filter depends on staleness, which itself needs a photo set — kept as a
 * separate function so callers can pass whichever photo scope is appropriate. */
function matchesStatusFilter(p: Project, status: StatusFilterKey | null, photos: SitePhoto[]) {
  if (!status) return true;
  if (status === 'IN_PROGRESS') return p.status === 'ON_TRACK' || p.status === 'AT_RISK';
  if (status === 'COMPLETED') return p.status === 'COMPLETED';
  if (status === 'DELAYED') return p.status === 'DELAYED';
  if (status === 'ANOMALY') return isFinancialAnomaly(p);
  if (status === 'STALE') return isStaleProject(p, photos);
  return true;
}

export function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { projects: roleProjects, scopeLabel, isStatewide } = useProjectScope();
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

  // Zone / Budget / Scheme are plain data filters; the status filter comes from clicking a KPI
  // card segment (Projects: In Progress/Completed/Delayed, Data Integrity: Anomalies/Stale).
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [budgetFilter, setBudgetFilter] = useState('ALL');
  const [schemeFilter, setSchemeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey | null>(null);
  const filtersActive = zoneFilter !== 'ALL' || budgetFilter !== 'ALL' || schemeFilter !== 'ALL' || !!statusFilter;

  function selectZone(division: string | null) {
    setZoneFilter(division ?? 'ALL');
    setFocusDivision(division);
  }
  function toggleStatusFilter(key: StatusFilterKey) {
    setStatusFilter((cur) => (cur === key ? null : key));
  }
  function clearFilters() {
    setZoneFilter('ALL'); setBudgetFilter('ALL'); setSchemeFilter('ALL'); setStatusFilter(null); setFocusDivision(null);
  }

  // Layer 1 (zone/budget/scheme) — drives the KPI strip + status pie chart, which stay showing
  // every category so a card never collapses to a single number when you click one of its own
  // segments.
  const scopedProjects = useMemo(
    () => roleProjects.filter((p) => matchesScopeFilters(p, { zone: zoneFilter, budget: budgetFilter, scheme: schemeFilter })),
    [roleProjects, zoneFilter, budgetFilter, schemeFilter]);
  const scopedProjectIds = useMemo(() => new Set(scopedProjects.map((p) => p.id)), [scopedProjects]);
  const scopedPhotos = useMemo(() => allPhotos.filter((p) => scopedProjectIds.has(p.projectId)), [allPhotos, scopedProjectIds]);
  const scopedApprovals = useMemo(() => allApprovals.filter((a) => scopedProjectIds.has(a.projectId)), [allApprovals, scopedProjectIds]);
  const scopedInspections = useMemo(() => allInspections.filter((i) => scopedProjectIds.has(i.projectId)), [allInspections, scopedProjectIds]);

  // Layer 2 (status click) on top of layer 1 — this is what every other section of the page
  // (map, zone overview, charts, tables, lists) renders, so "select a card" changes the whole page.
  const finalProjects = useMemo(
    () => scopedProjects.filter((p) => matchesStatusFilter(p, statusFilter, scopedPhotos)),
    [scopedProjects, statusFilter, scopedPhotos]);
  const projects = finalProjects;
  const projectIds = useMemo(() => new Set(finalProjects.map((p) => p.id)), [finalProjects]);

  const allExtensionsOfTime = useStore((s) => s.extensionsOfTime);
  const allChangeOrders = useStore((s) => s.changeOrders);
  const allRisks = useStore((s) => s.risks);
  const allSiteIssues = useStore((s) => s.siteIssues);
  const allBills = useStore((s) => s.bills);

  const approvals = useMemo(() => allApprovals.filter((a) => projectIds.has(a.projectId)), [allApprovals, projectIds]);
  const inspections = useMemo(() => allInspections.filter((i) => projectIds.has(i.projectId)), [allInspections, projectIds]);
  const photos = useMemo(() => allPhotos.filter((p) => projectIds.has(p.projectId)), [allPhotos, projectIds]);
  const workers = useMemo(() => allWorkers.filter((w) => projectIds.has(w.projectId)), [allWorkers, projectIds]);
  const contractors = useMemo(() => allContractors.filter((c) => c.assignedProjectIds.some((id) => projectIds.has(id))), [allContractors, projectIds]);

  const kpis = useMemo(() => {
    const total = scopedProjects.length;
    const inProgress = scopedProjects.filter((p) => p.status === 'ON_TRACK' || p.status === 'AT_RISK').length;
    const completed = scopedProjects.filter((p) => p.status === 'COMPLETED').length;
    const delayed = scopedProjects.filter((p) => p.status === 'DELAYED').length;
    const sanctioned = scopedProjects.reduce((s, p) => s + p.sanctionedBudget, 0);
    const spent = scopedProjects.reduce((s, p) => s + p.amountSpent, 0);
    const pendingApprovals = scopedApprovals.filter((a) => a.status === 'PENDING').length;
    const failedQc = scopedInspections.filter((i) => i.overallResult === 'FAIL').length;
    // Exception-first signals: a report shouldn't just be "72% physical progress" — it should
    // also surface where reported/financial progress has drifted ahead of certified field evidence.
    const financialAnomalies = scopedProjects.filter(isFinancialAnomaly).length;
    const now = Date.now();
    const staleProjects = scopedProjects.filter((p) => isStaleProject(p, scopedPhotos)).length;
    const overdueInspections = scopedInspections.filter((i) => i.status === 'SCHEDULED' && new Date(i.scheduledDate) < new Date()).length;
    const overdueApprovals = scopedApprovals.filter((a) => a.status === 'PENDING' && (now - new Date(a.submittedDate).getTime()) / 86400000 > 15).length;
    const billsOver30Days = allBills.filter((b) => scopedProjectIds.has(b.projectId) && !['PAID', 'REJECTED'].includes(b.status) && (now - new Date(b.submittedDate).getTime()) / 86400000 > 30).length;
    const projectsRequiringEot = allExtensionsOfTime.filter((e) => scopedProjectIds.has(e.projectId) && (e.status === 'PENDING' || e.status === 'RECOMMENDED')).length;
    const projectsWithCostVariation = allChangeOrders.filter((c) => scopedProjectIds.has(c.projectId) && c.status === 'PENDING_APPROVAL').length;
    const handoverDueSoon = scopedProjects.filter((p) => p.status !== 'COMPLETED' && (new Date(p.plannedCompletionDate).getTime() - now) / 86400000 <= 30 && (new Date(p.plannedCompletionDate).getTime() - now) / 86400000 >= 0).length;
    return { total, inProgress, completed, delayed, sanctioned, spent, pendingApprovals, failedQc, financialAnomalies, staleProjects, overdueInspections, overdueApprovals, billsOver30Days, projectsRequiringEot, projectsWithCostVariation, handoverDueSoon };
  }, [scopedProjects, scopedApprovals, scopedInspections, scopedPhotos, scopedProjectIds, allBills, allExtensionsOfTime, allChangeOrders]);

  const statusDist = ['ON_TRACK', 'AT_RISK', 'DELAYED', 'COMPLETED'].map((s) => ({
    name: s.replace('_', ' '), value: scopedProjects.filter((p) => p.status === s).length, key: s,
  }));

  // Every zone tile stays visible (counts reflect budget/scheme/status, but never zone itself) so
  // picking a zone narrows the rest of the page without hiding the other zones you could switch to.
  const divisionStats = useMemo(() => {
    const base = roleProjects.filter((p) => matchesScopeFilters(p, { zone: 'ALL', budget: budgetFilter, scheme: schemeFilter }));
    const baseIds = new Set(base.map((p) => p.id));
    const basePhotos = allPhotos.filter((p) => baseIds.has(p.projectId));
    const forTiles = base.filter((p) => matchesStatusFilter(p, statusFilter, basePhotos));
    const map = new Map<string, { division: string; total: number; delayed: number; completed: number }>();
    MAHARASHTRA_HIERARCHY.forEach((d) => map.set(d.division, { division: d.division, total: 0, delayed: 0, completed: 0 }));
    forTiles.forEach((p) => {
      const cur = map.get(p.division) ?? { division: p.division, total: 0, delayed: 0, completed: 0 };
      cur.total += 1;
      if (p.status === 'DELAYED') cur.delayed += 1;
      if (p.status === 'COMPLETED') cur.completed += 1;
      map.set(p.division, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [roleProjects, budgetFilter, schemeFilter, statusFilter, allPhotos]);

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
  const isProjectManager = currentUser?.role === 'PROJECT_MANAGER';
  const pendingDecisions = useMemo(() =>
    allDecisions
      .filter((d) => d.status === 'PENDING' && projectIds.has(d.projectId))
      .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.pendingSince < b.pendingSince ? -1 : 1)),
    [allDecisions, projectIds]);
  const activeDecision = pendingDecisions.find((d) => d.id === decisionId);

  // PM Dashboard rollup — Risk/Site-Issue/Change-Order/EOT registers already exist per-project
  // (GovernanceTab, SafetyRisksTab) but nowhere aggregates them across a manager's portfolio.
  const portfolioRisks = useMemo(
    () => allRisks.filter((r) => projectIds.has(r.projectId) && r.status !== 'CLOSED').sort((a, b) => b.score - a.score),
    [allRisks, projectIds]);
  const portfolioSiteIssues = useMemo(
    () => allSiteIssues.filter((i) => projectIds.has(i.projectId) && i.status !== 'RESOLVED'),
    [allSiteIssues, projectIds]);
  const portfolioChangeOrders = useMemo(
    () => allChangeOrders.filter((c) => projectIds.has(c.projectId) && c.status === 'PENDING_APPROVAL'),
    [allChangeOrders, projectIds]);
  const portfolioEots = useMemo(
    () => allExtensionsOfTime.filter((e) => projectIds.has(e.projectId) && (e.status === 'PENDING' || e.status === 'RECOMMENDED')),
    [allExtensionsOfTime, projectIds]);

  // Superadmin's "dashboard" is the Access Management console — access/permission
  // governance is their job, not project monitoring.
  if (currentUser?.role === 'SUPERADMIN') return <AccessManagement />;

  // The native app is built for field roles: Deputy/Junior Engineers and Contractors land
  // straight on the Field app (capture, progress, defects) instead of the desktop-oriented
  // command-centre dashboard. The website itself is unaffected — same code, different shell.
  if (Capacitor.isNativePlatform() && currentUser && FIELD_ROLES.includes(currentUser.role)) return <FieldHome />;

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

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="w-full sm:w-52">
            <Label>Zone</Label>
            <Select value={zoneFilter} onValueChange={(v) => selectZone(v === 'ALL' ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Zones</SelectItem>
                {MAHARASHTRA_HIERARCHY.map((d) => <SelectItem key={d.division} value={d.division}>{d.division}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-48">
            <Label>Budget</Label>
            <Select value={budgetFilter} onValueChange={setBudgetFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Budgets</SelectItem>
                {BUDGET_BANDS.map((b) => <SelectItem key={b.key} value={b.key}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-52">
            <Label>Scheme</Label>
            <Select value={schemeFilter} onValueChange={setSchemeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Schemes</SelectItem>
                {SCHEMES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {filtersActive && (
            <Button variant="outline" size="sm" onClick={clearFilters}><X size={13} /> Clear Filters</Button>
          )}
        </CardContent>
      </Card>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center">
          <Building2 className="mx-auto mb-2 text-slate-300" size={28} />
          <p className="text-sm font-medium text-slate-600">
            {filtersActive ? 'No projects match the current filters.' : 'No projects are currently assigned to your account.'}
          </p>
          {filtersActive ? (
            <button onClick={clearFilters} className="mt-1 text-xs font-medium text-navy-700 hover:underline">Clear filters</button>
          ) : (
            <p className="mt-1 text-xs text-slate-400">Contact your Executive Engineer or District Health Officer if this seems incorrect.</p>
          )}
        </div>
      ) : (
      <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiGroupCard
          title={t('dashboard.kpiTotalProjects')} icon={Building2} tone="blue"
          primary={{ value: kpis.total, label: 'projects' }} onPrimaryClick={() => setStatusFilter(null)}
          stats={[
            { label: t('dashboard.kpiInProgress').toLowerCase(), value: kpis.inProgress, tone: 'blue', onClick: () => toggleStatusFilter('IN_PROGRESS'), active: statusFilter === 'IN_PROGRESS' },
            { label: t('dashboard.kpiCompleted').toLowerCase(), value: kpis.completed, tone: 'emerald', onClick: () => toggleStatusFilter('COMPLETED'), active: statusFilter === 'COMPLETED' },
            { label: t('dashboard.kpiDelayed').toLowerCase(), value: kpis.delayed, tone: 'red', onClick: () => toggleStatusFilter('DELAYED'), active: statusFilter === 'DELAYED' },
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
          primary={{ value: kpis.financialAnomalies + kpis.staleProjects, label: 'flagged projects' }}
          stats={[
            { label: 'progress/financial anomalies', value: kpis.financialAnomalies, tone: 'amber', onClick: () => toggleStatusFilter('ANOMALY'), active: statusFilter === 'ANOMALY' },
            { label: 'no recent field activity', value: kpis.staleProjects, tone: 'red', onClick: () => toggleStatusFilter('STALE'), active: statusFilter === 'STALE' },
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
              onClick={() => selectZone(zoneFilter === z.division ? null : z.division)}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors hover:border-navy-300 hover:bg-navy-50',
                zoneFilter === z.division ? 'border-navy-400 bg-navy-50 ring-1 ring-navy-300' : 'border-slate-200 bg-white',
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
          <CardContent><ProjectMap projects={projects} focusDivision={focusDivision} onDivisionSelect={selectZone} /></CardContent>
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

      {(isSeniorRole || isProjectManager) && (
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

      {isProjectManager && (
        <Card className="mt-4">
          <CardHeader><CardTitle className="flex items-center gap-2"><Flame size={15} /> Portfolio Governance & Risk Rollup</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <RollupPanel
              icon={Flame} title="Open Risks" count={portfolioRisks.length} emptyText="No open risks in your portfolio."
              items={portfolioRisks.slice(0, 4).map((r) => ({
                id: r.id, primary: r.risk, secondary: `${projects.find((p) => p.id === r.projectId)?.name ?? ''} · ${r.level}`,
                onClick: () => navigate(`/projects/${r.projectId}?tab=risks`),
              }))}
            />
            <RollupPanel
              icon={TriangleAlert} title="Site Issues" count={portfolioSiteIssues.length} emptyText="No open site issues."
              items={portfolioSiteIssues.slice(0, 4).map((i) => ({
                id: i.id, primary: i.description, secondary: `${projects.find((p) => p.id === i.projectId)?.name ?? ''} · ${i.category.replace(/_/g, ' ')}`,
                onClick: () => navigate(`/projects/${i.projectId}?tab=governance`),
              }))}
            />
            <RollupPanel
              icon={GitBranch} title="Change Orders" count={portfolioChangeOrders.length} emptyText="No change orders pending approval."
              items={portfolioChangeOrders.slice(0, 4).map((c) => ({
                id: c.id, primary: c.title, secondary: `${projects.find((p) => p.id === c.projectId)?.name ?? ''} · ${formatCurrency(c.costImpact)}`,
                onClick: () => navigate(`/projects/${c.projectId}?tab=governance`),
              }))}
            />
            <RollupPanel
              icon={CalendarClock} title="EOT Requests" count={portfolioEots.length} emptyText="No pending EOT requests."
              items={portfolioEots.slice(0, 4).map((e) => ({
                id: e.id, primary: e.reason, secondary: `${projects.find((p) => p.id === e.projectId)?.name ?? ''} · ${e.daysRequested} days requested`,
                onClick: () => navigate(`/projects/${e.projectId}?tab=governance`),
              }))}
            />
          </CardContent>
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
                <img src={photoSrc(ph)} className="h-24 w-full object-cover transition-transform group-hover:scale-105" />
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

/** One register's compact summary within the PM Portfolio Governance & Risk Rollup — a count
 * plus its top few items, each deep-linking to that project's own governance/risk tab rather
 * than duplicating the full register UI here. */
function RollupPanel({ icon: Icon, title, count, items, emptyText }: {
  icon: React.ComponentType<{ size?: number; className?: string }>; title: string; count: number;
  items: { id: string; primary: string; secondary: string; onClick: () => void }[]; emptyText: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"><Icon size={14} className="text-slate-400" /> {title}</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{count}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-slate-400">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <button key={it.id} onClick={it.onClick} className="block w-full text-left">
              <p className="truncate text-[11.5px] font-medium text-slate-700 hover:text-navy-700 hover:underline">{it.primary}</p>
              <p className="truncate text-[10.5px] text-slate-400">{it.secondary}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
