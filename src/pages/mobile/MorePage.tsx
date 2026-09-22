import { ChevronRight, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { uiText } from '../../i18n/ui';
import { useStore } from '../../store/useStore';
import { MOBILE_TABS, NAV_ITEMS } from '../../components/layout/navConfig';

export function MorePage() {
  const currentUser = useStore(s => s.currentUser);
  const rolePermissions = useStore(s => s.rolePermissions);
  const logout = useStore(s => s.logout);
  const navigate = useNavigate();
  if (!currentUser) return null;
  const primary = new Set(MOBILE_TABS[currentUser.role].flatMap(destination => ({ overview: ['dashboard'], today: ['dashboard'], status: ['dashboard'], bills: ['finance'], inspect: ['quality'], attendance: ['dashboard'], profile: [] } as Record<string, string[]>)[destination] ?? [destination]));
  const keys = (rolePermissions[currentUser.role] ?? []).filter(key => !primary.has(key) && key !== 'notifications');
  return <div className="mobile-workspace mx-auto max-w-3xl space-y-5"><header className="mobile-page-hero"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-blue-200">{uiText('Workspace')}</p><h1>{uiText('More')}</h1><p>{uiText(currentUser.designation)}</p></div></header>
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">{keys.map(key => { const item = NAV_ITEMS[key]; if (!item) return null; const Icon = item.icon; return <button type="button" key={key} onClick={() => navigate(item.path)} className="flex min-h-[60px] w-full items-center gap-3 border-b border-slate-100 px-4 text-left last:border-0"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon size={19}/></span><span className="flex-1 text-sm font-semibold text-slate-800">{uiText(item.label)}</span><ChevronRight size={18} className="text-slate-400"/></button>; })}</section>
    <button type="button" onClick={() => { logout(); navigate('/login'); }} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white font-semibold text-red-600"><LogOut size={18}/>{uiText('Sign out')}</button>
  </div>;
}
