import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, ChevronRight, ClipboardCheck, FileCheck2, Hammer, IndianRupee, MapPin, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Project, Role } from '../../../types';
import { projectHubsForRole } from '../../../lib/projectReportGroups';
import { useStore } from '../../../store/useStore';
import { uiText } from '../../../i18n/ui';
import { ProgressBar, StatusBadge } from '../../../components/ui/primitives';
import { StickyActionBar } from '../../../components/ui/mobile';

const HUB_ICONS = { plan: FileCheck2, build: Hammer, quality: ShieldCheck, money: IndianRupee, closeout: CheckCircle2 };

export function ProjectMobileHome({ project, role }: { project: Project; role?: Role }) {
  const navigate = useNavigate();
  const state = useStore();
  const hubs = projectHubsForRole(role);
  const defects = state.defects.filter(item => item.projectId === project.id && item.status !== 'CLOSED').length;
  const approvals = state.approvals.filter(item => item.projectId === project.id && item.status === 'PENDING').length;
  const evidence = state.photos.filter(item => item.projectId === project.id).length;
  const milestones = state.milestones.filter(item => item.projectId === project.id);
  const nextMilestone = milestones.filter(item => !['CERTIFIED', 'BILL_ELIGIBLE', 'PAID'].includes(item.status)).sort((a, b) => a.plannedDate.localeCompare(b.plannedDate))[0];
  const counts: Record<string, string> = { plan: project.stage.replaceAll('_', ' '), build: `${evidence} photos`, quality: `${defects} open`, money: `${approvals} pending`, closeout: `${state.documents.filter(item => item.projectId === project.id).length} files` };
  return <div className="project-mobile-home space-y-5 lg:hidden">
    <button type="button" className="mobile-back" onClick={() => navigate('/projects')}><ArrowLeft size={19}/>{uiText('Projects')}</button>
    <section className="project-mobile-hero"><div className="flex items-start justify-between gap-3"><div><p>{project.id} · {project.district}</p><h1>{project.name}</h1></div><StatusBadge status={project.status}/></div><div className="mt-5 grid grid-cols-4 gap-2">{[
      ['Reported', project.reportedProgress], ['Verified', project.verifiedProgress], ['Certified', project.physicalProgress], ['Financial', project.financialProgress],
    ].map(([label, value]) => <div key={label as string}><strong>{value}%</strong><span>{uiText(label as string)}</span></div>)}</div><ProgressBar className="mt-4 bg-white/20" colorClass="bg-blue-200" value={project.physicalProgress}/></section>
    <div className="grid grid-cols-2 gap-3">{hubs.map(hub => { const Icon = HUB_ICONS[hub.key]; return <button type="button" key={hub.key} onClick={() => navigate(`/projects/${project.id}/${hub.key}`)} className={`project-hub-card hub-${hub.key}`}><span><Icon size={21}/></span><strong>{uiText(hub.label)}</strong><small>{uiText(hub.description)}</small><em>{uiText(counts[hub.key])}<ChevronRight size={14}/></em></button>; })}</div>
    <section className="rounded-[22px] border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><h2 className="text-sm font-bold text-slate-900">{uiText('Next milestone')}</h2>{nextMilestone && <span className="text-xs font-semibold text-slate-500">{nextMilestone.plannedDate}</span>}</div><p className="mt-2 text-sm text-slate-700">{uiText(nextMilestone?.name ?? 'No milestone pending')}</p>{nextMilestone && <p className="mt-1 text-xs text-slate-500">{uiText(nextMilestone.status.replaceAll('_', ' '))}</p>}</section>
    <StickyActionBar><button type="button" onClick={() => navigate(`/projects/${project.id}?tab=field%20evidence`)}><Camera size={18}/>{uiText('Evidence')}</button><button type="button" onClick={() => navigate(`/projects/${project.id}?tab=defects`)}><AlertTriangle size={18}/>{uiText('Defect')}</button><button type="button" onClick={() => window.open(`https://www.google.com/maps?q=${project.siteLat},${project.siteLng}`, '_blank')}><MapPin size={18}/>{uiText('Site')}</button><button type="button" onClick={() => navigate(`/projects/${project.id}?tab=approvals`)}><ClipboardCheck size={18}/>{uiText('Approvals')}</button></StickyActionBar>
  </div>;
}
