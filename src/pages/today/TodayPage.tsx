import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Building2, Camera, CheckCircle2, ClipboardCheck, IndianRupee, ShieldCheck } from 'lucide-react';
import { pendingWork } from '../../lib/pendingWork';
import { useProjectScope } from '../../lib/scope';
import { useStore } from '../../store/useStore';
import { formatCurrency } from '../../lib/utils';
import { uiText } from '../../i18n/ui';
import { ListCard, SyncBadge } from '../../components/ui/mobile';
import { ProgressBar, StatusBadge } from '../../components/ui/primitives';

const OVERSIGHT = new Set(['SUPERADMIN', 'MINISTER', 'COMMISSIONER', 'REGIONAL_DIRECTOR', 'CIVIL_SURGEON']);
const MANAGERS = new Set(['PROJECT_MANAGER', 'EXECUTIVE_ENGINEER']);

export function TodayPage() {
  const state = useStore();
  const { currentUser } = state;
  const { projects } = useProjectScope();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const work = useMemo(() => pendingWork(state, today).slice(0, 6), [state, today]);
  const openDefects = state.defects.filter(d => projects.some(p => p.id === d.projectId) && d.status !== 'CLOSED');
  const pendingApprovals = state.approvals.filter(a => projects.some(p => p.id === a.projectId) && a.status === 'PENDING');
  const sanctioned = projects.reduce((sum, p) => sum + p.sanctionedBudget, 0);
  const released = projects.reduce((sum, p) => sum + p.amountReleased, 0);
  const spent = projects.reduce((sum, p) => sum + p.amountSpent, 0);
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;

  if (!currentUser) return null;
  if (currentUser.role === 'WORKFORCE') {
    const worker = state.workers.find(item => item.id === currentUser.workerId);
    const attendance = state.attendance.filter(item => item.workerId === worker?.id);
    return <MobilePage title={uiText('My attendance')} subtitle={uiText(currentUser.name)}><Hero title={attendance.some(a => a.date === today) ? uiText('Attendance marked today') : uiText('Ready to mark attendance')} value={`${attendance.length}`} label={uiText('attendance records')} /><ListCard title={worker?.name ?? currentUser.name} subtitle={worker ? `${worker.role} · ${worker.phone}` : currentUser.designation} meta={uiText('Your attendance and profile are available on this device.')} /></MobilePage>;
  }

  const oversight = OVERSIGHT.has(currentUser.role);
  const manager = MANAGERS.has(currentUser.role);
  return <MobilePage title={uiText(oversight ? 'Portfolio overview' : 'Today')} subtitle={uiText(`${currentUser.designation} · ${projects.length} projects`)} badge={<SyncBadge online={online} />}>
    {oversight ? <>
      <Hero title={uiText('Statewide programme')} value={`${projects.filter(p => p.status === 'ON_TRACK' || p.status === 'COMPLETED').length}/${projects.length}`} label={uiText('projects stable')} />
      <div className="mobile-kpi-grid">
        <Kpi icon={IndianRupee} label="Sanctioned" value={formatCurrency(sanctioned)} />
        <Kpi icon={IndianRupee} label="Disbursed" value={formatCurrency(released)} />
        <Kpi icon={IndianRupee} label="Expenditure" value={formatCurrency(spent)} />
        <Kpi icon={ClipboardCheck} label="Decisions due" value={`${pendingApprovals.length}`} />
      </div>
    </> : <>
      <div className="mobile-action-grid">
        <QuickAction icon={Camera} label="Capture evidence" onClick={() => navigate('/capture')} />
        <QuickAction icon={ClipboardCheck} label={manager ? 'Review approvals' : 'My work'} onClick={() => navigate(manager ? '/approvals' : '/dashboard/pending-work')} />
        <QuickAction icon={AlertTriangle} label="Report defect" onClick={() => navigate('/defects')} />
      </div>
      <div className="mobile-kpi-grid">
        <Kpi icon={Building2} label="My projects" value={`${projects.length}`} />
        <Kpi icon={AlertTriangle} label="Open defects" value={`${openDefects.length}`} tone="amber" />
        <Kpi icon={ClipboardCheck} label="Approvals" value={`${pendingApprovals.length}`} />
        <Kpi icon={ShieldCheck} label="At risk" value={`${projects.filter(p => p.status === 'AT_RISK' || p.status === 'DELAYED').length}`} tone="red" />
      </div>
    </>}

    <section><SectionTitle title={oversight ? 'Projects needing attention' : 'Priority work'} action={() => navigate('/dashboard/pending-work')} />
      <div className="grid gap-3">{work.length ? work.map(item => {
        const project = projects.find(p => p.id === item.projectId);
        return <ListCard key={item.id} title={uiText(item.title)} subtitle={project?.name ?? item.projectId} trailing={<span className={item.due < today ? 'text-xs font-semibold text-red-600' : 'text-xs font-semibold text-slate-500'}>{item.due}</span>} onClick={() => navigate(`/projects/${item.projectId}?tab=${encodeURIComponent(item.tab)}`)} />;
      }) : <ListCard title={uiText('No urgent work')} subtitle={uiText('Your assigned items are up to date.')} leading={<CheckCircle2 className="text-emerald-500" />} />}</div>
    </section>

    <section><SectionTitle title="Project pulse" action={() => navigate('/projects')} />
      <div className="grid gap-3">{projects.slice(0, 4).map(project => <ListCard key={project.id} title={project.name} subtitle={`${project.district} · ${uiText(project.stage.replaceAll('_', ' '))}`} trailing={<StatusBadge status={project.status} />} onClick={() => navigate(`/projects/${project.id}`)}><div className="flex items-center gap-3"><ProgressBar value={project.physicalProgress} /><span className="text-xs font-semibold text-slate-700">{project.physicalProgress}%</span></div></ListCard>)}</div>
    </section>
  </MobilePage>;
}

function MobilePage({ title, subtitle, badge, children }: { title: string; subtitle: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return <div className="mobile-workspace mx-auto max-w-5xl space-y-6"><header className="mobile-page-hero"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-blue-200">{uiText('Aarogya Nirman')}</p><h1>{title}</h1><p>{subtitle}</p></div>{badge}</header>{children}</div>;
}
function Hero({ title, value, label }: { title: string; value: string; label: string }) { return <section className="mobile-focus-card"><p>{title}</p><strong>{value}</strong><span>{label}</span></section>; }
function Kpi({ icon: Icon, label, value, tone = 'blue' }: { icon: typeof Building2; label: string; value: string; tone?: string }) { return <div className={`mobile-kpi tone-${tone}`}><Icon size={18}/><span>{uiText(label)}</span><strong>{value}</strong></div>; }
function QuickAction({ icon: Icon, label, onClick }: { icon: typeof Camera; label: string; onClick: () => void }) { return <button type="button" onClick={onClick}><span><Icon size={21}/></span>{uiText(label)}</button>; }
function SectionTitle({ title, action }: { title: string; action: () => void }) { return <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-bold text-slate-900">{uiText(title)}</h2><button type="button" onClick={action} className="flex min-h-11 items-center gap-1 px-2 text-xs font-semibold text-blue-700">{uiText('View all')}<ArrowRight size={14}/></button></div>; }
