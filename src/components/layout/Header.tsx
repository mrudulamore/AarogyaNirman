import { uiText, useUiLanguage } from '../../i18n/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, Search, Bell, LogOut, ChevronDown, UserCog } from 'lucide-react';
import { useProjectScope } from '../../lib/scope';
import { useStore } from '../../store/useStore';
import { Avatar } from '../ui/forms';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/overlays';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { formatDateTime } from '../../lib/utils';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  useUiLanguage();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentUser = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);
  const { projectIds } = useProjectScope();
  const notifications = useStore((s) => s.notifications).filter(n => !n.projectId || projectIds.has(n.projectId));
  const markRead = useStore((s) => s.markNotificationRead);
  const markAllRead = useStore((s) => s.markAllNotificationsRead);
  const [q, setQ] = useState('');

  const myNotifications = notifications.filter((n) => currentUser && n.targetRoles.includes(currentUser.role));
  const unread = myNotifications.filter((n) => !n.read).length;

  function switchAccount() {
    logout();
    setQ('');
    navigate('/login', { replace: true });
  }

  return (
    <header className="app-header sticky top-0 z-30 flex min-h-14 flex-wrap items-center gap-2 py-1 border-b border-slate-200 bg-white px-4">
      <button onClick={onMenuClick} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden">
        <Menu size={20} />
      </button>

      <form
        className="hidden max-w-md flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 md:flex"
        onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate(`/search?q=${encodeURIComponent(q)}`); }}
      >
        <Search size={15} className="text-slate-400" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={uiText(t('header.searchPlaceholder') ?? undefined)}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <button onClick={() => navigate('/search')} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden">
          <Search size={18} />
        </button>

        <LanguageSwitcher />
        <button type="button" onClick={switchAccount} className="flex min-h-10 max-w-24 items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-left text-[11px] font-medium text-navy-700 hover:bg-slate-100">
          <UserCog size={15} className="shrink-0" /> {t('header.switchAccount')}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100">
              <Bell size={18} />
              {unread > 0 && <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">{uiText(unread > 9 ? '9+' : unread)}</span>}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="flex items-center justify-between px-2.5 py-1.5">
              <DropdownMenuLabel>{t('header.notifications')}</DropdownMenuLabel>
              {unread > 0 && <button onClick={() => markAllRead()} className="text-[11px] font-medium text-navy-700 hover:underline">{t('header.markAllRead')}</button>}
            </div>
            <div className="max-h-80 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto">
              {myNotifications.slice(0, 8).map((n) => (
                <DropdownMenuItem key={n.id} onSelect={() => { markRead(n.id); if (n.projectId) navigate(`/projects/${n.projectId}`); }} className="flex-col items-start gap-0.5 whitespace-normal py-2">
                  <div className="flex w-full items-start gap-2">
                    {!n.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-govblue-600" />}
                    <span className={n.read ? 'text-slate-500' : 'font-medium text-slate-800'}>{n.message}</span>
                  </div>
                  <span className="ml-3.5 text-[10px] text-slate-400">{uiText(formatDateTime(n.date))}</span>
                </DropdownMenuItem>
              ))}
              {myNotifications.length === 0 && <p className="px-3 py-6 text-center text-xs text-slate-400">{t('header.noNotifications')}</p>}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate('/notifications')}>{t('header.viewAllNotifications')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={t('header.accountMenu')} className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-slate-100">
              <Avatar name={currentUser?.name ?? '?'} size={30} />
              <div className="hidden text-left leading-tight sm:block">
                <p className="text-xs font-semibold text-slate-800">{currentUser?.name}</p>
                <p className="text-[10.5px] text-slate-400">{uiText(currentUser && t(`roles.${currentUser.role}`))}</p>
              </div>
              <ChevronDown size={14} className="hidden text-slate-400 sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{uiText(currentUser?.designation)}</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => navigate('/select-role')}><UserCog size={14} /> {t('header.switchRole')}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={switchAccount}><LogOut size={14} /> {t('header.signOut')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
