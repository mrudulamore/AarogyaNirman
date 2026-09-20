import { WorkforceHome } from '../workers/WorkforceHome';
import { uiMessage, uiText, useUiLanguage } from '../../i18n/ui';
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
import { Card, CardContent, CardHeader, CardTitle, ProgressBar, StatusBadge, Button, Textarea, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/primitives';
import { Dialog, DialogContent, DialogFooter } from '../../components/ui/overlays';
import { formatCurrency, formatDate, formatDateTime, photoSrc, cn } from '../../lib/utils';
import { tabsForRole } from '../../lib/projectTabAccess';
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
function matchesScopeFilters(p: Project, f: { zone: string[]; budget: string[]; scheme: string[] }) {
  if (f.zone.length && !f.zone.includes(p.division)) return false;
  if (f.scheme.length && !f.scheme.includes(p.scheme)) return false;
  if (f.budget.length && !BUDGET_BANDS.some((band) => f.budget.includes(band.key) && band.test(p))) return false;
  return true;
}

function toggleSelection(values: string[], key: string) {
  return values.includes(key) ? values.filter((value) => value !== key) : [...values, key];
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
  useUiLanguage();
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
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState('');


  // Zone / Budget / Scheme are plain data filters; the status filter comes from clicking a KPI
  // card segment (Projects: In Progress/Completed/Delayed, Data Integrity: Anomalies/Stale).
  const [overviewMode, setOverviewMode] = useState<'zone' | 'budget' | 'scheme'>('zone');
  const [zoneFilter, setZoneFilter] = useState<string[]>([]);
  const [budgetFilter, setBudgetFilter] = useState<string[]>([]);
  const [schemeFilter, setSchemeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey | null>(null);
  const filtersActive = zoneFilter.length > 0 || budgetFilter.length > 0 || schemeFilter.length > 0 || !!statusFilter;

  const focusDivision = zoneFilter.length === 1 ? zoneFilter[0] : null;
  function selectZone(division: string | null) {
    setZoneFilter(division ? [division] : []);
  }
  function toggleStatusFilter(key: StatusFilterKey) {
    setStatusFilter((cur) => (cur === key ? null : key));
  }
  function clearFilters() {
    setZoneFilter([]); setBudgetFilter([]); setSchemeFilter([]); setStatusFilter(null);
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
    name: uiText(s), value: scopedProjects.filter((p) => p.status === s).length, key: s,
  }));

  const overviewStats = useMemo(() => {
    const base = roleProjects.filter((p) => matchesScopeFilters(p, {
      zone: overviewMode === 'zone' ? [] : zoneFilter,
      budget: overviewMode === 'budget' ? [] : budgetFilter,
      scheme: overviewMode === 'scheme' ? [] : schemeFilter,
    }) && matchesStatusFilter(p, statusFilter, allPhotos));
    const groups = overviewMode === 'zone'
      ? MAHARASHTRA_HIERARCHY.map((d) => ({ key: d.division, label: d.division.replace(' Division', ''), test: (p: Project) => p.division === d.division }))
      : overviewMode === 'budget' ? BUDGET_BANDS
      : SCHEMES.map((scheme) => ({ key: scheme, label: scheme, test: (p: Project) => p.scheme === scheme }));
    return groups.map((group) => {
      const items = base.filter(group.test);
      return { key: group.key, label: group.label, total: items.length,
        completed: items.filter((p) => p.status === 'COMPLETED').length,
        delayed: items.filter((p) => p.status === 'DELAYED').length };
    });
  }, [roleProjects, overviewMode, zoneFilter, budgetFilter, schemeFilter, statusFilter, allPhotos]);
  const selectedOverview = overviewMode === 'zone' ? zoneFilter : overviewMode === 'budget' ? budgetFilter : schemeFilter;
  function selectOverview(key: string) {
    if (overviewMode === 'zone') navigate(`/projects?region=${encodeURIComponent(key)}`);
    else if (overviewMode === 'budget') setBudgetFilter((values) => toggleSelection(values, key));
    else setSchemeFilter((values) => toggleSelection(values, key));
  }

  const districtBudget = useMemo(() => {
    const map = new Map<string, { district: string; sanctioned: number; spent: number; disbursed: number }>();
    projects.forEach((p) => {
      const cur = map.get(p.district) ?? { district: p.district, sanctioned: 0, spent: 0, disbursed: 0 };
      cur.sanctioned += p.sanctionedBudget; cur.spent += p.amountSpent; cur.disbursed += p.amountReleased;
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
  const recentPhotos = [...photos].sort((a, b) => Number(!!b.dataUrl) - Number(!!a.dataUrl)
    || (b.capturedAt || b.date).localeCompare(a.capturedAt || a.date)).slice(0, 6);
  const selectedPhoto = photos.find((photo) => photo.id === photoId);
  const selectedPhotoProject = projects.find((project) => project.id === selectedPhoto?.projectId);
  const photoTabs = tabsForRole(currentUser?.role);
  const photoProjectTab = photoTabs.find((tab) => tab.value === 'field evidence')
    ?? photoTabs.find((tab) => tab.value === 'photos') ?? photoTabs[0];
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
  if (currentUser?.role === 'WORKFORCE') return <WorkforceHome />;
  if (currentUser?.role === 'SUPERADMIN') return <AccessManagement />;

  // The native app is built for field roles: Deputy/Junior Engineers and Contractors land
  // straight on the Field app (capture, progress, defects) instead of the desktop-oriented
  // command-centre dashboard. The website itself is unaffected — same code, different shell.
  if (currentUser?.role === 'CONTRACTOR' || (Capacitor.isNativePlatform() && currentUser && FIELD_ROLES.includes(currentUser.role))) return <FieldHome key={currentUser.id} />;

  return (
    <div>
      <PageHeader
        title={uiText(t('dashboard.title'))}
        description={uiText(t('dashboard.subtitle', { name: currentUser?.name }))}
      />

      {!isStatewide && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-navy-200 bg-navy-50 px-3 py-2 text-xs font-medium text-navy-700">
          <MapPinned size={14} />{uiText(" Showing data scoped to your jurisdiction: ")}{uiText(scopeLabel)}
        </div>
      )}

      {projects.length > 0 && (
      <div className="dashboard-metrics mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiGroupCard
          title={uiText(t('dashboard.kpiTotalProjects'))} icon={Building2} tone="blue"
          primary={{ value: kpis.total, label: 'projects' }} onPrimaryClick={() => setStatusFilter(null)}
          stats={[
            { label: t('dashboard.kpiInProgress').toLowerCase(), value: kpis.inProgress, tone: 'blue', onClick: () => toggleStatusFilter('IN_PROGRESS'), active: statusFilter === 'IN_PROGRESS' },
            { label: t('dashboard.kpiCompleted').toLowerCase(), value: kpis.completed, tone: 'emerald', onClick: () => toggleStatusFilter('COMPLETED'), active: statusFilter === 'COMPLETED' },
            { label: t('dashboard.kpiDelayed').toLowerCase(), value: kpis.delayed, tone: 'red', onClick: () => toggleStatusFilter('DELAYED'), active: statusFilter === 'DELAYED' },
          ]}
        />
        <KpiGroupCard
          title={uiText("Budget & Spend")} icon={Wallet} tone="amber"
          primary={{ value: formatCurrency(kpis.sanctioned), label: 'sanctioned' }}
          stats={[
            { label: `spent (${kpis.sanctioned ? Math.round((kpis.spent / kpis.sanctioned) * 100) : 0}%)`, value: formatCurrency(kpis.spent), tone: 'amber', onClick: () => navigate('/finance') },
          ]}
        />
        <KpiGroupCard
          title={uiText("Approvals & Quality")} icon={ClipboardCheck} tone="amber"
          primary={{ value: kpis.pendingApprovals, label: 'pending approvals' }} onPrimaryClick={() => navigate('/approvals')}
          stats={[
            { label: t('dashboard.kpiFailedQuality').toLowerCase(), value: kpis.failedQc, tone: 'red', onClick: () => navigate('/quality') },
          ]}
        />
        <KpiGroupCard
          title={uiText("Data Integrity Flags")} icon={ScanEye} tone="red"
          primary={{ value: kpis.financialAnomalies + kpis.staleProjects, label: 'flagged projects' }}
          stats={[
            { label: 'progress/financial anomalies', value: kpis.financialAnomalies, tone: 'amber', onClick: () => toggleStatusFilter('ANOMALY'), active: statusFilter === 'ANOMALY' },
            { label: 'no recent field activity', value: kpis.staleProjects, tone: 'red', onClick: () => toggleStatusFilter('STALE'), active: statusFilter === 'STALE' },
          ]}
        />
        {isSeniorRole && (
          <KpiGroupCard
            title={uiText("Governance Watchlist")} icon={AlertTriangle} tone="red"
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
      )}

      <Card className="mb-4">
        <CardHeader><CardTitle className="flex items-center gap-2"><Layers size={15} />{uiText(" Project Overview")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-5 border-b border-slate-200" role="group" aria-label={uiText("Overview grouping")}>
            {([{ key: 'zone', label: 'Zone wise', icon: MapPinned, count: zoneFilter.length }, { key: 'budget', label: 'Budget wise', icon: Wallet, count: budgetFilter.length }, { key: 'scheme', label: 'Scheme wise', icon: Layers, count: schemeFilter.length }] as const).map((mode) => (
              <button key={mode.key} aria-pressed={overviewMode === mode.key} onClick={() => setOverviewMode(mode.key)}
                className={cn('-mb-px flex items-center gap-2 border-b-2 px-1 pb-3 pt-1 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-500',
                  overviewMode === mode.key ? 'border-navy-700 text-navy-800' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800')}>
                <mode.icon size={15} /> {uiText(mode.label)}
                {mode.count > 0 && <span className="rounded-full bg-navy-50 px-1.5 py-0.5 text-[10px] font-semibold text-navy-700">{mode.count}</span>}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">{uiText("Select one or more options. No selection includes all options.")}</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {overviewStats.map((group) => (
              <button key={group.key} aria-pressed={selectedOverview.includes(group.key)} onClick={() => selectOverview(group.key)}
                className={cn('rounded-lg border p-3 text-left transition-colors hover:border-navy-300 hover:bg-navy-50',
                  selectedOverview.includes(group.key) ? 'border-navy-400 bg-navy-50 ring-1 ring-navy-300' : 'border-slate-200 bg-white')}>
                <p className="text-xs font-semibold text-slate-800">{uiText(group.label)}</p>
                <p className="mt-1 text-xl font-bold text-navy-700">{group.total}</p>
                <p className="mt-0.5 text-[10.5px] text-slate-500">{group.completed}{uiText(" completed")}{group.delayed > 0 && <span className="text-red-500"> &middot; {group.delayed}{uiText(" delayed")}</span>}
                </p>
              </button>
            ))}
          </div>
          {filtersActive && <div className="flex flex-wrap items-center gap-2 text-xs">
            {[
              ...zoneFilter.map((key) => ({ key, label: key, remove: () => setZoneFilter((values) => toggleSelection(values, key)) })),
              ...budgetFilter.map((key) => ({ key, label: BUDGET_BANDS.find((band) => band.key === key)?.label, remove: () => setBudgetFilter((values) => toggleSelection(values, key)) })),
              ...schemeFilter.map((key) => ({ key, label: key, remove: () => setSchemeFilter((values) => toggleSelection(values, key)) })),
            ].map((filter) => <button key={filter.key} onClick={filter.remove} aria-label={uiMessage("Remove {{0}} filter", [filter.label])}
              className="flex items-center gap-1.5 rounded-full bg-navy-50 px-2.5 py-1 text-navy-700 hover:bg-navy-100">
              {uiText(filter.label)}<X size={12} />
            </button>)}
            <Button variant="outline" size="sm" onClick={clearFilters}><X size={13} />{uiText(" Clear Filters")}</Button>
          </div>}
        </CardContent>
      </Card>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center">
          <Building2 className="mx-auto mb-2 text-slate-300" size={28} />
          <p className="text-sm font-medium text-slate-600">
            {uiText(filtersActive ? 'No projects match the current filters.' : 'No projects are currently assigned to your account.')}
          </p>
          {filtersActive ? (
            <button onClick={clearFilters} className="mt-1 text-xs font-medium text-navy-700 hover:underline">{uiText("Clear filters")}</button>
          ) : (
            <p className="mt-1 text-xs text-slate-400">{uiText("Contact your Executive Engineer or District Health Officer if this seems incorrect.")}</p>
          )}
        </div>
      ) : (
      <>
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
                <ShieldAlert size={14} className="mt-0.5 shrink-0" /> {uiText(a.text)}
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
          <CardHeader><CardTitle className="flex items-center gap-2"><Gavel size={15} />{uiText(" Decision Tracker (")}{pendingDecisions.length}{uiText(" pending)")}</CardTitle></CardHeader>
          {pendingDecisions.length === 0 ? (
            <CardContent className="p-4"><p className="text-xs text-slate-400">{uiText("No decisions currently pending in your jurisdiction.")}</p></CardContent>
          ) : (
            <Table>
              <THead><Tr><Th>{uiText("Decision Required")}</Th><Th>{uiText("Project")}</Th><Th>{uiText("Financial Impact")}</Th><Th>{uiText("Schedule Impact")}</Th><Th>{uiText("Pending With")}</Th><Th>{uiText("Pending Since")}</Th><Th>{uiText("Priority")}</Th><Th /></Tr></THead>
              <TBody>
                {pendingDecisions.map((d) => (
                  <Tr key={d.id}>
                    <Td className="max-w-[240px] truncate font-medium text-slate-800">{uiText(d.decisionRequired)}</Td>
                    <Td className="max-w-[160px] truncate">{projects.find((p) => p.id === d.projectId)?.name}</Td>
                    <Td>{uiText(d.financialImpact ? formatCurrency(d.financialImpact) : '—')}</Td>
                    <Td>{uiText(d.scheduleImpactDays ? `${d.scheduleImpactDays} days` : '—')}</Td>
                    <Td>{t(`roles.${d.pendingWith}`)}</Td>
                    <Td>{uiText(formatDate(d.pendingSince))}</Td>
                    <Td><StatusBadge status={d.priority} /></Td>
                    <Td>
                      {d.pendingWith === currentUser?.role && (
                        <Button size="sm" variant="outline" onClick={() => { setDecisionId(d.id); setOutcome(''); }}>{uiText("Decide")}</Button>
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
          <CardHeader><CardTitle className="flex items-center gap-2"><Flame size={15} />{uiText(" Portfolio Governance & Risk Rollup")}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <RollupPanel
              icon={Flame} title={uiText("Open Risks")} count={portfolioRisks.length} emptyText={uiText("No open risks in your portfolio.")}
              items={portfolioRisks.slice(0, 4).map((r) => ({
                id: r.id, primary: r.risk, secondary: `${projects.find((p) => p.id === r.projectId)?.name ?? ''} · ${r.level}`,
                onClick: () => navigate(`/projects/${r.projectId}?tab=risks`),
              }))}
            />
            <RollupPanel
              icon={TriangleAlert} title={uiText("Site Issues")} count={portfolioSiteIssues.length} emptyText={uiText("No open site issues.")}
              items={portfolioSiteIssues.slice(0, 4).map((i) => ({
                id: i.id, primary: i.description, secondary: `${projects.find((p) => p.id === i.projectId)?.name ?? ''} · ${i.category.replace(/_/g, ' ')}`,
                onClick: () => navigate(`/projects/${i.projectId}?tab=governance`),
              }))}
            />
            <RollupPanel
              icon={GitBranch} title={uiText("Change Orders")} count={portfolioChangeOrders.length} emptyText={uiText("No change orders pending approval.")}
              items={portfolioChangeOrders.slice(0, 4).map((c) => ({
                id: c.id, primary: c.title, secondary: `${projects.find((p) => p.id === c.projectId)?.name ?? ''} · ${formatCurrency(c.costImpact)}`,
                onClick: () => navigate(`/projects/${c.projectId}?tab=governance`),
              }))}
            />
            <RollupPanel
              icon={CalendarClock} title={uiText("EOT Requests")} count={portfolioEots.length} emptyText={uiText("No pending EOT requests.")}
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
            <div className="relative">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart style={{ fontSize: 10 }}>
                <Pie data={statusDist.filter((status) => status.value > 0)} dataKey="value" nameKey="name" innerRadius={62} outerRadius={100} paddingAngle={2} labelLine={false}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                    if ((percent ?? 0) < 0.08) return null;
                    const angle = -(midAngle ?? 0) * Math.PI / 180;
                    const radius = (Number(innerRadius) + Number(outerRadius)) / 2;
                    return <text x={Number(cx) + radius * Math.cos(angle)} y={Number(cy) + radius * Math.sin(angle)} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={12} fontWeight={700} stroke="#0f172a" strokeWidth={2} paintOrder="stroke">{uiText(((percent ?? 0) * 100).toFixed(1))}%</text>;
                  }}>
                  {statusDist.filter((status) => status.value > 0).map((s) => <Cell key={s.key} fill={STATUS_HEX[s.key]} />)}
                </Pie>
                <RTooltip formatter={(value) => `${value} ${uiText('Projects')} (${scopedProjects.length ? (Number(value) / scopedProjects.length * 100).toFixed(1) : 0}%)`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-slate-800">{scopedProjects.length}</span>
              <span className="text-xs text-slate-500">{uiText("Total projects")}</span>
            </div>
            </div>
            <div className="pb-2 text-xs">
              <div className="grid grid-cols-[1fr_3rem_4rem] gap-2 border-b border-slate-200 pb-2 text-slate-500"><span>{uiText("Status")}</span><span className="text-right">{uiText("Count")}</span><span className="text-right">{uiText("Share")}</span></div>
              {statusDist.map((status) => <div key={status.key} className="grid grid-cols-[1fr_3rem_4rem] items-center gap-2 border-b border-slate-100 py-2.5 last:border-0">
                <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_HEX[status.key] }} />{status.name}</span>
                <span className="text-right font-semibold tabular-nums text-slate-800">{status.value}</span>
                <span className="text-right tabular-nums text-slate-600">{uiText(scopedProjects.length ? (status.value / scopedProjects.length * 100).toFixed(1) : '0.0')}%</span>
              </div>)}
            </div>
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
                {uiText(Math.abs(avgFinancial - avgPhysical) < 5 ? t('dashboard.gapAligned')
                  : avgFinancial > avgPhysical ? t('dashboard.gapFinancialAhead')
                  : t('dashboard.gapPhysicalAhead'))}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('dashboard.districtBudget')}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(260, districtBudget.length * 64)}>
              <BarChart data={districtBudget} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f8" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(v)} />
                <YAxis type="category" dataKey="district" width={70} tick={{ fontSize: 10 }} />
                <RTooltip formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="sanctioned" fill="#3b82f6" name={uiText("Sanctioned Amount")} radius={[0, 3, 3, 0]} />
                <Bar dataKey="spent" fill="#f59e0b" name={uiText("Amount Spent")} radius={[0, 3, 3, 0]} />
                <Bar dataKey="disbursed" fill="#10b981" name={uiText("Amount Disbursed")} radius={[0, 3, 3, 0]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
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
                  <Td>{uiText(p.district)}</Td>
                  <Td><StatusBadge status="DELAYED" label={uiText(t('dashboard.daysSuffix', { count: p.delayDays }))} /></Td>
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
                  <Td className="font-medium text-slate-800">{uiText(a.type.replace('_', ' '))}</Td>
                  <Td className="max-w-[160px] truncate">{projects.find((p) => p.id === a.projectId)?.name}</Td>
                  <Td>{uiText(a.amount ? formatCurrency(a.amount) : '—')}</Td>
                  <Td><StatusBadge status="PENDING" label={uiText(a.chain[a.currentStepIndex]?.replace('_', ' '))} /></Td>
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
                    <p className="font-medium text-slate-700">{uiText(i.category.replace('_', ' '))}</p>
                    <p className="text-[10.5px] text-slate-400">{projects.find((p) => p.id === i.projectId)?.name}</p>
                  </div>
                  <span className="text-[10.5px] text-slate-500">{uiText(formatDate(i.scheduledDate))}</span>
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
                <div className="mb-1 flex justify-between text-xs"><span className="truncate font-medium text-slate-700">{uiText(c.company)}</span><span className="text-slate-500">{c.performanceScore}%</span></div>
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {recentPhotos.map((ph) => (
              <button key={ph.id} onClick={() => setPhotoId(ph.id)} className="flex gap-3 rounded-lg border border-slate-200 p-2.5 text-left transition-colors hover:border-navy-300 hover:bg-navy-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-500">
                <img src={photoSrc(ph)} alt={uiMessage("{{0}}: {{1}}", [ph.dataUrl ? 'Site capture' : 'Sample construction photo', ph.stage])} loading="lazy" className="h-24 w-20 shrink-0 rounded-md object-cover sm:w-24" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-snug text-slate-800">{projects.find((project) => project.id === ph.projectId)?.name ?? ph.projectId}</p>
                  <p className="mt-1 text-[11px] text-slate-600">{uiText(ph.stage)} &middot; {uiText(ph.location)}</p>
                  <p className="mt-1 flex items-start gap-1 text-[11px] font-medium tabular-nums text-navy-700"><MapPinned size={12} className="mt-0.5 shrink-0" /><span>{uiText("Lat ")}{uiText(ph.lat.toFixed(5))}{uiText(", Lng ")}{uiText(ph.lng.toFixed(5))}</span></p>
                  <p className="mt-1 text-[10px] text-slate-500">{uiText(formatDateTime(ph.capturedAt || ph.date))}</p>
                  {ph.dataUrl && <span className="mt-1 inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">
                    {uiText(ph.locationSource === 'CAPTURED' ? 'Device photo / GPS captured' : 'Device photo / manual location')}
                  </span>}
                </div>
              </button>
            ))}
          </div>
          {recentPhotos.length === 0 && <p className="text-xs text-slate-500">{uiText("No site photos available for the selected projects.")}</p>}
        </CardContent>
      </Card>
      </>
      )}

      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setPhotoId(null)}>
        {selectedPhoto && (
          <DialogContent title={uiText(selectedPhotoProject?.name ?? selectedPhoto.projectId)} description={uiMessage("{{0}} - {{1}}", [selectedPhoto.stage, formatDateTime(selectedPhoto.capturedAt || selectedPhoto.date)])} size="lg">
            <img src={photoSrc(selectedPhoto)} alt={uiText(selectedPhoto.description || selectedPhoto.stage)} className="max-h-[50vh] w-full rounded-lg bg-slate-100 object-contain" />
            <div className="mt-3 space-y-1 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">{uiText(selectedPhoto.location)}</p>
              <p className="tabular-nums">{uiText("Latitude ")}{uiText(selectedPhoto.lat.toFixed(6))}{uiText(" · Longitude ")}{uiText(selectedPhoto.lng.toFixed(6))}</p>
              <p>{selectedPhoto.description}</p>
              <p>{uiText("Uploaded by ")}{uiText(selectedPhoto.uploadedBy)}</p>
              <p>{uiText(selectedPhoto.dataUrl ? (selectedPhoto.locationSource === 'CAPTURED' ? `Device GPS${selectedPhoto.gpsAccuracyM !== undefined ? ` / accuracy ${selectedPhoto.gpsAccuracyM} m` : ''}` : 'Manually supplied location; not verified by device GPS.') : 'Illustrative construction photo and demo coordinates; not live evidence from this site.')}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPhotoId(null)}>{uiText("Close")}</Button>
              {photoProjectTab && <Button onClick={() => { setPhotoId(null); navigate(`/projects/${selectedPhoto.projectId}?${new URLSearchParams({ tab: photoProjectTab.value })}`); }}>{uiText("View project ")}{uiText(photoProjectTab.label.toLowerCase())} <ArrowRight size={13} /></Button>}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!decisionId} onOpenChange={(v) => !v && setDecisionId(null)}>
        {activeDecision && (
          <DialogContent title={uiText("Record Decision")} description={uiText(activeDecision.decisionRequired)}>
            <div className="space-y-2 text-xs">
              <p className="text-slate-500">{uiText("Recommended action: ")}<span className="text-slate-700">{uiText(activeDecision.recommendedAction)}</span></p>
              <Textarea rows={3} placeholder={uiText("Decision outcome / remarks…")} value={outcome} onChange={(e) => setOutcome(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDecisionId(null)}>{uiText("Cancel")}</Button>
              <Button onClick={() => { resolveDecision(activeDecision.id, outcome.trim() || 'Decided.'); toast.success(uiText('Decision recorded.')); setDecisionId(null); }}>{uiText("Record Decision")}</Button>
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
  useUiLanguage();
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"><Icon size={14} className="text-slate-400" /> {uiText(title)}</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{count}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-slate-400">{uiText(emptyText)}</p>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <button key={it.id} onClick={it.onClick} className="block w-full text-left">
              <p className="truncate text-[11.5px] font-medium text-slate-700 hover:text-navy-700 hover:underline">{uiText(it.primary)}</p>
              <p className="truncate text-[10.5px] text-slate-400">{uiText(it.secondary)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
