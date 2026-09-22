import { DeadlineBadge } from '../../../components/common/DeadlineBadge';
import { hubForTab, projectHubsForRole, reportGroupsForRole, reportNavigation } from '../../../lib/projectReportGroups';
import { uiText, useUiLanguage } from '../../../i18n/ui';
import { lazy, Suspense, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, Wallet, HardHat, UserRound, AlertOctagon, Edit3, ShieldAlert } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { useProjectScope } from '../../../lib/scope';
import { Breadcrumbs } from '../../../components/layout/Breadcrumbs';
import { Card, CardContent, ProgressBar, StatusBadge, Button, Textarea } from '../../../components/ui/primitives';
import { Tabs, TabsContent } from '../../../components/ui/tabs';
import { ProjectNavigation } from './ProjectNavigation';
import { Dialog, DialogContent, DialogFooter } from '../../../components/ui/overlays';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { PHYSICAL_VS_FINANCIAL_THRESHOLD } from '../../../lib/constants';
import { toast } from 'sonner';
import { ProjectMobileHome } from './ProjectMobileHome';
import { SegmentedControl } from '../../../components/ui/mobile';

const OverviewTab = lazy(() => import('./tabs/OverviewTab').then(m => ({ default: m.OverviewTab })));
const MinistryOverviewTab = lazy(() => import('./tabs/MinistryOverviewTab').then(m => ({ default: m.MinistryOverviewTab })));
const TimelineTab = lazy(() => import('./tabs/TimelineTab').then(m => ({ default: m.TimelineTab })));
const TenderTab = lazy(() => import('./tabs/TenderTab').then(m => ({ default: m.TenderTab })));
const MilestonesTab = lazy(() => import('./tabs/MilestonesTab').then(m => ({ default: m.MilestonesTab })));
const GovernanceTab = lazy(() => import('./tabs/GovernanceTab').then(m => ({ default: m.GovernanceTab })));
const ProgressTab = lazy(() => import('./tabs/ProgressTab').then(m => ({ default: m.ProgressTab })));
const PhotosTab = lazy(() => import('./tabs/PhotosTab').then(m => ({ default: m.PhotosTab })));
const FieldEvidenceTab = lazy(() => import('./tabs/FieldEvidenceTab').then(m => ({ default: m.FieldEvidenceTab })));
const TeamTab = lazy(() => import('./tabs/TeamTab').then(m => ({ default: m.TeamTab })));
const QualityTab = lazy(() => import('./tabs/QualityInspectionsTab').then(m => ({ default: m.QualityTab })));
const InspectionsTab = lazy(() => import('./tabs/QualityInspectionsTab').then(m => ({ default: m.InspectionsTab })));
const DefectsTab = lazy(() => import('./tabs/DefectsTab').then(m => ({ default: m.DefectsTab })));
const WorkersTab = lazy(() => import('./tabs/WorkersTab').then(m => ({ default: m.WorkersTab })));
const ContractorTab = lazy(() => import('./tabs/ContractorTab').then(m => ({ default: m.ContractorTab })));
const BoqTab = lazy(() => import('./tabs/BoqMaterialsTab').then(m => ({ default: m.BoqTab })));
const MaterialsTab = lazy(() => import('./tabs/BoqMaterialsTab').then(m => ({ default: m.MaterialsTab })));
const FinanceTab = lazy(() => import('./tabs/FinanceTab').then(m => ({ default: m.FinanceTab })));
const DocumentsTab = lazy(() => import('./tabs/DocumentsTab').then(m => ({ default: m.DocumentsTab })));
const ApprovalsTab = lazy(() => import('./tabs/ApprovalsTab').then(m => ({ default: m.ApprovalsTab })));
const RisksTab = lazy(() => import('./tabs/SafetyRisksTab').then(m => ({ default: m.RisksTab })));
const SafetyCommissioningTab = lazy(() => import('./tabs/SafetyCommissioningTab').then(m => ({ default: m.SafetyCommissioningTab })));
const HandoverTab = lazy(() => import('./tabs/CommissioningHandoverTab').then(m => ({ default: m.HandoverTab })));
const AuditTab = lazy(() => import('./tabs/AuditTab').then(m => ({ default: m.AuditTab })));
import { tabsForRole } from '../../../lib/projectTabAccess';
const ContractControlsTab = lazy(() => import('./tabs/ContractControlsTab').then(m => ({ default: m.ContractControlsTab })));

export function ProjectDetail() {
  useUiLanguage();
  const { id, hub } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const currentUser = useStore((s) => s.currentUser);
  const projects = useStore((s) => s.projects);
  const contractors = useStore((s) => s.contractors);
  const users = useStore((s) => s.users);
  const extensionsOfTime = useStore((s) => s.extensionsOfTime);
  const updateProject = useStore((s) => s.updateProject);
  const { projectIds } = useProjectScope();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ description: '' });

  const project = projects.find((p) => p.id === id);
  const visibleTabs = tabsForRole(currentUser?.role);
  const mobileHub = projectHubsForRole(currentUser?.role).find(item => item.key === hub);
  const requestedTab = params.get('tab') ?? mobileHub?.sections[0]?.value ?? 'overview';
  const tab = visibleTabs.some((t) => t.value === requestedTab) ? requestedTab : (visibleTabs[0]?.value ?? 'overview');

  const reportGroups = reportGroupsForRole(currentUser?.role);
  const activeReportGroup = reportGroups.find(group => group.sections.some(section => section.value === tab));
  const navigationTabs = reportNavigation(currentUser?.role, tab);
  const selectedHub = hubForTab(currentUser?.role, tab);

  if (!project) {
    return <div className="py-20 text-center text-sm text-slate-500">{uiText("Project not found. ")}<button className="text-navy-700 underline" onClick={() => navigate('/projects')}>{uiText("Back to projects")}</button></div>;
  }

  if (!projectIds.has(project.id)) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <ShieldAlert className="mx-auto mb-3 text-red-400" size={32} />
        <p className="text-sm font-semibold text-slate-700">{uiText("Access restricted")}</p>
        <p className="mt-1 text-xs text-slate-500">
          "{project.name}{uiText("\" is outside your assigned jurisdiction (")}{uiText(currentUser ? currentUser.designation : 'your role')}{uiText("). Contact your Executive Engineer or District Health Officer for access.")}</p>
        <button className="mt-4 text-xs font-medium text-navy-700 underline" onClick={() => navigate('/projects')}>{uiText("Back to my projects")}</button>
      </div>
    );
  }

  const contractor = contractors.find((c) => c.id === project.contractorId);
  const ee = users.find((u) => u.id === project.executiveEngineerId);
  const projectManager = users.find((u) => u.id === project.projectManagerId);
  const ownerDirector = users.find((u) => u.id === project.ownerDirectorId);
  const gap = project.financialProgress - project.physicalProgress;
  const canEditProject = currentUser?.role !== 'MINISTER' && currentUser?.role !== 'VIGILANCE_AUDIT';
  const riskStatus = project.status === 'DELAYED' ? 'High Risk' : project.status === 'AT_RISK' ? 'Medium Risk' : project.status === 'COMPLETED' ? 'Closed' : 'Low Risk';
  const approvedEot = extensionsOfTime.filter((e) => e.projectId === project.id && e.status === 'APPROVED').reduce((s, e) => s + (e.approvedDays ?? 0), 0);

  return (
    <div>
      {!hub && !params.has('tab') && <ProjectMobileHome project={project} role={currentUser?.role} />}
      <div className="hidden lg:block"><DeadlineBadge project={project} />
      <Breadcrumbs items={[{ label: 'Projects', to: '/projects' }, { label: project.name }]} />

      <Card className="mb-4">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-lg font-bold text-slate-900">{project.name}</h1>
                <StatusBadge status={project.status} />
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${riskStatus === 'High Risk' ? 'border-red-200 bg-red-50 text-red-700' : riskStatus === 'Medium Risk' ? 'border-amber-200 bg-amber-50 text-amber-700' : riskStatus === 'Closed' ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{uiText(riskStatus)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {project.id} · {uiText(project.taluka)}, {uiText(project.district)} · {uiText(project.division)} · {uiText(project.type)} · {project.bedCount}{uiText(" beds")}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-navy-200 bg-navy-50 px-2 py-0.5 text-[10.5px] font-medium text-navy-700">{uiText("Scheme: ")}{uiText(project.scheme)}</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10.5px] font-medium text-slate-600">{uiText("Facility: ")}{uiText(project.facilityType)}</span>
              </div>
            </div>
            {canEditProject && (
              <Button variant="outline" size="sm" onClick={() => { setEditForm({ description: project.description }); setEditOpen(true); }}><Edit3 size={13} />{uiText(" Edit")}</Button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <MiniStat icon={Building2} label={uiText("Stage")} value={project.stage.replace(/_/g, ' ')} />
            <MiniStat icon={Wallet} label={uiText("Contract Value")} value={formatCurrency(project.workOrderValue || project.sanctionedBudget)} />
            <MiniStat icon={HardHat} label={uiText("Contractor")} value={contractor?.company ?? '—'} small />
            <MiniStat icon={UserRound} label={uiText("Project Manager")} value={projectManager?.name ?? ee?.name ?? '—'} small />
            <MiniStat icon={UserRound} label={uiText("Owner / Director")} value={ownerDirector?.name ?? '—'} small />
            <MiniStat icon={AlertOctagon} label={uiText("Days Delayed")} value={project.delayDays > 0 ? `${project.delayDays} days` : 'On schedule'} alert={project.delayDays > 0} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <MiniStat icon={UserRound} label={uiText("Exec. Engineer")} value={ee?.name ?? '—'} small />
            <MiniStat icon={Calendar} label={uiText("Original Completion")} value={formatDate(project.originalCompletionDate)} small />
            <MiniStat icon={Calendar} label={uiText("Revised Completion")} value={formatDate(project.plannedCompletionDate)} small alert={project.plannedCompletionDate !== project.originalCompletionDate} />
            <button onClick={() => setParams({ tab: 'governance' })} className="text-left">
              <MiniStat icon={AlertOctagon} label={uiText("EOT (click for Governance)")} value={approvedEot > 0 ? `+${approvedEot} days` : 'None'} small alert={approvedEot > 0} />
            </button>
          </div>

          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">{uiText("Progress Traceability — Reported vs. Verified vs. Certified vs. Financial")}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <TraceStat label={uiText("Contractor Reported")} value={project.reportedProgress} colorClass="bg-slate-400" />
              <TraceStat label={uiText("Engineer Verified")} value={project.verifiedProgress} colorClass="bg-amber-500" />
              <TraceStat label={uiText("Certified (Physical)")} value={project.physicalProgress} colorClass="bg-blue-500" />
              <TraceStat label={uiText("Financial Progress")} value={project.financialProgress} colorClass="bg-emerald-500" />
            </div>
            {project.reportedProgress - project.physicalProgress >= 8 && (
              <p className="mt-2.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">{uiText("Contractor-reported progress is ")}{project.reportedProgress - project.physicalProgress}{uiText(" points ahead of certified progress — pending engineer verification/certification.")}</p>
            )}
          </div>
          {Math.abs(gap) >= PHYSICAL_VS_FINANCIAL_THRESHOLD && (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {uiText(gap > 0 ? 'Financial progress is significantly ahead of physical progress.' : 'Physical progress is ahead of expenditure.')}
            </p>
          )}
          {project.delayReason && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              <strong>{uiText("Delay reason:")}</strong> {uiText(project.delayReason)}. <strong>{uiText("Recovery plan:")}</strong> {uiText(project.recoveryPlan)}
            </p>
          )}
        </CardContent>
      </Card></div>

      <div className={!hub && !params.has('tab') ? 'hidden lg:block' : ''}><Suspense fallback={<div role="status" className="mt-5 animate-pulse space-y-3"><div className="h-12 rounded-xl bg-blue-100"/><div className="h-40 rounded-2xl bg-slate-100"/></div>}><Tabs value={tab} onValueChange={(value) => setParams((previous) => { const next = new URLSearchParams(previous); next.set('tab', value); return next; })}>
        {selectedHub && <div className="mb-4 lg:hidden"><button type="button" onClick={() => navigate(`/projects/${project.id}`)} className="mobile-back mb-3"><ArrowLeft size={19}/>{uiText(project.name)}</button><h1 className="mb-3 text-xl font-bold text-slate-950">{uiText(selectedHub.label)}</h1><SegmentedControl label={selectedHub.label} value={tab} items={selectedHub.sections} onChange={(value) => setParams({ tab: value })}/></div>}
        <div className="hidden lg:block"><ProjectNavigation tabs={navigationTabs} value={tab} onSelect={(value) => setParams((previous) => { const next = new URLSearchParams(previous); next.set('tab', value); return next; })} /></div>

        {activeReportGroup && activeReportGroup.sections.length > 1 && <section className="report-group-panel mt-4 hidden rounded-2xl border border-blue-100 bg-white p-4 sm:p-5 lg:block" aria-label={uiText(activeReportGroup.label)}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold text-blue-950">{uiText(activeReportGroup.label)}</h2><span className="text-xs text-slate-500">{activeReportGroup.sections.length} {uiText('related reports')}</span></div>
          <nav aria-label={uiText('Reports in this section')} className="flex flex-wrap gap-2">{activeReportGroup.sections.map(section => <button key={section.value} type="button" aria-current={section.value === tab ? 'page' : undefined} onClick={() => setParams(previous => { const next = new URLSearchParams(previous); next.set('tab', section.value); return next; })} className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${section.value === tab ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-blue-100 bg-blue-50/60 text-blue-900 hover:bg-blue-100'}`}>{uiText(section.label)}</button>)}</nav>
        </section>}

        <TabsContent value="overview">{currentUser?.role === 'MINISTER' ? <MinistryOverviewTab project={project} /> : <OverviewTab project={project} />}</TabsContent>
        <TabsContent value="governance"><GovernanceTab project={project} /></TabsContent>
        <TabsContent value="timeline"><TimelineTab project={project} /></TabsContent>
        <TabsContent value="tender"><TenderTab project={project} /></TabsContent>
        <TabsContent value="boq"><BoqTab project={project} /></TabsContent>
        <TabsContent value="materials"><MaterialsTab project={project} /></TabsContent>
        <TabsContent value="milestones"><MilestonesTab project={project} /></TabsContent>
        <TabsContent value="progress"><ProgressTab key={project.id + currentUser?.id} project={project} /></TabsContent>
        <TabsContent value="photos"><PhotosTab project={project} /></TabsContent>
        <TabsContent value="field evidence"><FieldEvidenceTab project={project} /></TabsContent>
        <TabsContent value="team"><TeamTab project={project} /></TabsContent>
        <TabsContent value="contractor"><ContractorTab project={project} /></TabsContent>
        <TabsContent value="workers"><WorkersTab project={project} /></TabsContent>
        <TabsContent value="quality"><QualityTab project={project} /></TabsContent>
        <TabsContent value="inspections"><InspectionsTab project={project} /></TabsContent>
        <TabsContent value="safety & commissioning"><SafetyCommissioningTab project={project} /></TabsContent>
        <TabsContent value="defects"><DefectsTab project={project} /></TabsContent>
        <TabsContent value="risks"><RisksTab project={project} /></TabsContent>
        <TabsContent value="finance"><FinanceTab project={project} /></TabsContent>
        <TabsContent value="approvals"><ApprovalsTab project={project} /></TabsContent>
        <TabsContent value="documents"><DocumentsTab project={project} /></TabsContent>
        <TabsContent value="handover"><HandoverTab project={project} /></TabsContent>
        <TabsContent value="audit"><AuditTab project={project} /></TabsContent>
        <TabsContent value="controls"><ContractControlsTab key={project.id} project={project} /></TabsContent>
        <TabsContent value="monthly"><ContractControlsTab key={project.id + '-monthly'} project={project} monthly /></TabsContent>
      </Tabs></Suspense></div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title={uiText("Edit Project")} description={uiText(project.name)}>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">{uiText("Description")}</p>
              <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={4} />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{uiText("Cancel")}</Button>
            <Button onClick={() => { try {  updateProject(project.id, editForm); toast.success(uiText('Project updated.')); setEditOpen(false);  } catch (error) { toast.error(uiText((error as Error).message)); } }}>{uiText("Save Changes")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TraceStat({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  useUiLanguage();
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px]"><span className="text-slate-500">{uiText(label)}</span><span className="font-semibold text-slate-800">{value}%</span></div>
      <ProgressBar value={value} colorClass={colorClass} />
    </div>
  );
}
function MiniStat({ icon: Icon, label, value, small, alert }: { icon: any; label: string; value: string; small?: boolean; alert?: boolean }) {
  useUiLanguage();
  return (
    <div>
      <p className="flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-wide text-slate-400"><Icon size={11} /> {uiText(label)}</p>
      <p className={`mt-0.5 truncate font-semibold ${alert ? 'text-red-600' : 'text-slate-800'} ${small ? 'text-xs' : 'text-[13px]'}`}>{uiText(value)}</p>
    </div>
  );
}
