import { Link } from 'react-router-dom';
import { Camera, Users, AlertTriangle, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { pendingWork, daysLate } from '../../lib/pendingWork';
import { todayDate } from '../../lib/fundDisbursal';
import { tabsForRole } from '../../lib/projectTabAccess';
import { NAV_ITEMS } from '../../components/layout/navConfig';
import { uiText, useUiLanguage } from '../../i18n/ui';

export function MobileFieldHome() {
  useUiLanguage();
  const state = useStore();
  const { projects, scopeLabel } = useProjectScope();
  const user = state.currentUser!;
  const permissions = state.rolePermissions[user.role] ?? [];
  const tasks = pendingWork(state, todayDate());
  const tabs = tabsForRole(user.role).map(tab => tab.value);
  const overdue = tasks.filter(task => daysLate(task.due, todayDate()) > 0);
  return <div className="mobile-task-home mx-auto max-w-2xl space-y-6">
    <section><p className="text-sm text-blue-700">{uiText('Your work today')} · {todayDate()}</p><h1 className="mt-2 text-2xl font-bold text-slate-900">{user.name}</h1><p className="mt-1 text-sm text-slate-500">{uiText(scopeLabel)}</p></section>
    <section aria-label={uiText('Work summary')} className="grid grid-cols-3 gap-2">{[['Projects', projects.length], ['Pending', tasks.length], ['Overdue', overdue.length]].map(([label, value]) => <div key={label} className="rounded-2xl border border-blue-100 bg-white p-3"><p className="text-2xl font-bold text-blue-900">{value}</p><p className="mt-1 text-xs text-slate-600">{uiText(String(label))}</p></div>)}</section>
    {permissions.includes('field') && projects.length > 0 && <section><h2 className="mb-3 font-semibold text-slate-800">{uiText('Quick actions')}</h2><div className="grid grid-cols-3 gap-2">
      {[{label:'Site photo', action:'photo', icon:Camera}, {label:'Attendance', action:'attendance', icon:Users}, {label:user.role === 'CONTRACTOR' ? 'Defects' : 'Log defect', action:user.role === 'CONTRACTOR' ? '' : 'defect', icon:AlertTriangle}].map(item => <Link key={item.label} to={item.action ? `/field?action=${item.action}` : '/defects'} className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-center text-sm font-medium text-blue-900"><item.icon size={24}/>{uiText(item.label)}</Link>)}
    </div></section>}
    <section className="rounded-2xl border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{uiText('Needs attention')}</h2><Link className="inline-flex min-h-11 items-center text-sm text-blue-700" to="/dashboard/pending-work">{uiText('View all')}</Link></div>
      {!tasks.length && <p className="py-4 text-sm text-slate-500">{uiText('No pending work for your role.')}</p>}
      {tasks.slice(0,4).map(task => <Link key={task.id} to={`/projects/${task.projectId}?tab=${encodeURIComponent(tabs.includes(task.tab) ? task.tab : 'overview')}${task.billId ? `&bill=${encodeURIComponent(task.billId)}` : ''}`} className="flex items-center gap-3 border-t border-slate-100 py-4"><div className="min-w-0 flex-1"><p className="break-words text-sm font-medium text-slate-800">{uiText(task.title)}</p><p className="mt-1 text-xs text-slate-500">{projects.find(p => p.id === task.projectId)?.name}</p><p className="mt-1 text-xs text-amber-700">{task.due}</p></div><ArrowRight size={18} className="shrink-0 text-blue-600"/></Link>)}
    </section>
    <section><h2 className="mb-3 font-semibold">{uiText('Your workspace')}</h2><div className="grid grid-cols-2 gap-3">{permissions.filter(key => NAV_ITEMS[key] && !['dashboard','notifications','search','field'].includes(key)).map(key => { const item=NAV_ITEMS[key]; return <Link key={key} to={item.path} className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700"><item.icon size={21} className="shrink-0 text-blue-600"/>{uiText(item.label)}</Link>; })}</div></section>
  </div>;
}
