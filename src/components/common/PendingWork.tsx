import { ArrowLeft, ArrowRight, ClipboardList, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { pendingWork, daysLate, DEFAULT_ESCALATION, type EscalationPolicy } from '../../lib/pendingWork';
import { todayDate } from '../../lib/fundDisbursal';
import { tabsForRole } from '../../lib/projectTabAccess';
import { Card, CardContent } from '../ui/primitives';
import { uiText } from '../../i18n/ui';

export function PendingWorkPage() {
  const s = useStore();
  const [filter, setFilter] = useState('ALL');
  const [project, setProject] = useState('ALL');
  const [limit, setLimit] = useState(20);
  const policy = s.escalationPolicy ?? DEFAULT_ESCALATION;
  const tasks = pendingWork(s, todayDate(), policy);
  const tabs = tabsForRole(s.currentUser?.role).map(t => t.value);
  const filtered = tasks.filter(t => (project === 'ALL' || t.projectId === project) && (filter === 'ALL' || (filter === 'OVERDUE' ? daysLate(t.due, todayDate()) > 0 : t.tab === filter)));
  const visible = filtered.slice(0, limit);
  function change(patch: Partial<EscalationPolicy>) { try { s.setEscalationPolicy({ ...policy, ...patch }); } catch (e) { toast.error(uiText((e as Error).message)); } }
  return <div className="mx-auto max-w-4xl space-y-4">
    <Link to="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm text-navy-700"><ArrowLeft size={16} />{uiText('Back to dashboard')}</Link>
    <div><h1 className="text-xl font-semibold text-slate-800">{uiText('My pending work')}</h1><p className="mt-1 text-sm text-slate-500">{uiText('Review priorities and open a task to take action.')}</p></div>
    <div className="flex flex-wrap gap-2" aria-label={uiText('Filter pending work')}>
      {[['ALL', 'All'], ['OVERDUE', 'Overdue'], ['approvals', 'Approvals'], ['milestones', 'Milestones'], ['inspections', 'Inspections'], ['defects', 'Defects'], ['finance', 'Bills'], ['monthly', 'Monthly reports'], ['controls', 'Documents & renewals']].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setLimit(20); }} className={`min-h-11 rounded-full border px-4 text-xs font-medium transition-colors ${filter === value ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{uiText(label)}</button>)}
    </div>
    <label className="block text-xs text-slate-500">{uiText('Project')}<select className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700" value={project} onChange={e => { setProject(e.target.value); setLimit(20); }}><option value="ALL">{uiText('All assigned projects')}</option>{s.projects.filter(p => tasks.some(t => t.projectId === p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <Card><CardContent className="space-y-3 p-4">
    <p className="text-xs text-slate-500">{filtered.length} {uiText('tasks')}</p>
    {!filtered.length && <div className="py-8 text-center"><CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={28} /><p className="text-sm text-slate-500">{uiText(tasks.length ? 'No tasks match these filters.' : 'No pending work for your role.')}</p></div>}
    {visible.map(task => <Link key={task.id} to={`/projects/${task.projectId}?tab=${tabs.includes(task.tab) ? task.tab : 'overview'}${task.billId ? `&bill=${encodeURIComponent(task.billId)}` : ''}`} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 text-sm transition-colors hover:border-blue-200 hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
      <span className="min-w-0 break-words"><span className="font-medium text-slate-700">{task.title}</span><span className="block text-xs text-slate-500">{s.projects.find(p => p.id === task.projectId)?.name} · {task.due}</span></span>
      <span className={daysLate(task.due, todayDate()) ? 'text-red-700' : 'text-slate-500'}>{daysLate(task.due, todayDate()) ? `${daysLate(task.due, todayDate())} ${uiText('days overdue')}` : uiText('Open')}</span>
    </Link>)}
    {filtered.length > limit && <button className="min-h-11 text-sm text-navy-700" onClick={() => setLimit(limit + 20)}>{uiText('Load more')}</button>}
    {s.currentUser?.role === 'COMMISSIONER' && <details><summary className="min-h-11 cursor-pointer text-sm">{uiText('Delay escalation settings')}</summary>
      <p className="mb-2 text-xs text-slate-500">{uiText('In-app reminders are evaluated while the app is open.')}</p>
      <div className="grid gap-3 sm:grid-cols-3">{(['approvalDays', 'firstDays', 'secondDays'] as const).map((key, index) => <label key={key} className="text-xs">{uiText(['Approval due after (days)', 'First escalation after (days)', 'Second escalation after (days)'][index])}<input className="block min-h-11 w-full rounded border px-2" type="number" min={1} value={policy[key]} onChange={e => { const n = Number(e.target.value); if (Number.isInteger(n) && n > 0) change({ [key]: n }); }} /></label>)}</div>
      {(['firstRole', 'secondRole'] as const).map(key => <label key={key} className="mt-2 block text-xs">{uiText(key === 'firstRole' ? 'First escalation recipient' : 'Second escalation recipient')}<select className="ml-2 min-h-11 rounded border" value={policy[key]} onChange={e => change({ [key]: e.target.value as EscalationPolicy['firstRole'] })}>{['EXECUTIVE_ENGINEER', 'PROJECT_MANAGER', 'CIVIL_SURGEON', 'REGIONAL_DIRECTOR', 'COMMISSIONER'].map(role => <option key={role} value={role}>{uiText(role)}</option>)}</select></label>)}
    </details>}
  </CardContent></Card></div>;
}

export function PendingWork() {
  const s = useStore();
  const tasks = pendingWork(s, todayDate(), s.escalationPolicy ?? DEFAULT_ESCALATION);
  const overdue = tasks.filter(t => daysLate(t.due, todayDate()) > 0).length;
  return <div className="mb-4"><Link to="/dashboard/pending-work" className="pending-work-summary group mb-4 flex min-h-16 items-center gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><ClipboardList size={20} /></span>
    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-700">{uiText('My pending work')}</span><span className="block text-xs text-slate-500">{uiText(tasks.length ? 'View tasks and priorities' : 'No pending work for your role.')}</span></span>
    <span className="flex shrink-0 items-center gap-2"><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-700">{tasks.length}</span>{overdue > 0 && <span className="hidden text-xs text-amber-700 sm:inline">{overdue} {uiText('Overdue')}</span>}<ArrowRight size={16} className="text-blue-600" /></span>
  </Link><div className="grid gap-2 sm:grid-cols-3">{tasks.filter(task => !task.billId).slice(0, 3).map(task => <Link key={task.id} to={`/projects/${task.projectId}?tab=${task.tab}${task.billId ? `&bill=${encodeURIComponent(task.billId)}` : ''}`} className="min-w-0 rounded-xl border border-blue-100 bg-white p-3 text-sm hover:bg-blue-50"><p className="break-words font-semibold text-slate-800">{task.title}</p><p className="mt-1 break-words text-xs text-slate-500">{s.projects.find(p => p.id === task.projectId)?.name}</p><p className="mt-2 text-xs text-blue-700">{task.due} · {uiText('Open')} →</p></Link>)}</div></div>;
}
