import { BrandLogo } from '../common/BrandLogo';
import { uiText, useUiLanguage } from '../../i18n/ui';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPinned } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { useNavCounts } from '../../lib/navCounts';
import { NAV_ITEMS } from './navConfig';
import { cn } from '../../lib/utils';

// Only these nav keys ever show a counter — kept short so it stays a signal, not clutter.
const COUNTED_KEYS = new Set(['projects', 'approvals', 'defects', 'quality', 'finance', 'notifications', 'tenders']);

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  useUiLanguage();
  const { t } = useTranslation();
  const currentUser = useStore((s) => s.currentUser);
  const rolePermissions = useStore((s) => s.rolePermissions);
  const { scopeLabel } = useProjectScope();
  const counts = useNavCounts();
  const grantedKeys = currentUser?.role === 'WORKFORCE' ? ['dashboard'] : currentUser ? rolePermissions[currentUser.role] ?? [] : [];
  const keys = Object.keys(NAV_ITEMS).filter(key => grantedKeys.includes(key));

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside className={cn(
        'app-sidebar fixed inset-y-0 left-0 z-50 flex min-h-0 w-64 shrink-0 flex-col overflow-hidden border-r border-navy-800 bg-navy-900 text-slate-200 transition-transform lg:static lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="sidebar-brand flex shrink-0 items-center gap-2.5 border-b border-navy-800/70 px-4 py-4">
          <BrandLogo className="h-14 w-14" />
          <div className="min-w-0 leading-tight">
            <p className="text-[13px] font-semibold text-white">{t('sidebar.govName')}</p>
            <p className="text-[11px] text-navy-200">{t('sidebar.govTagline')}</p>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-3">
          {keys.map((key) => {
            const item = NAV_ITEMS[key];
            const count = COUNTED_KEYS.has(key) ? counts[key] : undefined;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => cn(
                  'flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors',
                  isActive ? 'bg-govblue-600 text-white shadow-md shadow-black/10 ring-1 ring-white/15' : 'text-navy-200 hover:bg-navy-800 hover:text-white',
                )}
              >
                <item.icon size={16} className="shrink-0" />
                <span className="flex-1">{currentUser?.role === 'WORKFORCE' ? uiText('My attendance') : t(`nav.${key}`)}</span>
                {!!count && (
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                    (key === 'defects' || key === 'approvals') && count > 0 ? 'bg-red-500 text-white' : 'bg-navy-700 text-navy-100',
                  )}>{count}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {currentUser && (
          <div className="sidebar-account shrink-0 border-t border-navy-800/70 px-4 py-3">
            <p className="text-[11px] text-navy-300">{t('sidebar.signedInAs')}</p>
            <p className="truncate text-xs font-medium text-white">{t(`roles.${currentUser.role}`)}</p>
            <p className="mt-1.5 flex items-center gap-1 truncate text-[10.5px] text-navy-300">
              <MapPinned size={11} className="shrink-0" /> {uiText(scopeLabel)}
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
