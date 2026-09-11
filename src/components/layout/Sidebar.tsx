import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Landmark, MapPinned } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { useNavCounts } from '../../lib/navCounts';
import { ROLE_NAV, NAV_ITEMS } from './navConfig';
import { cn } from '../../lib/utils';

// Only these nav keys ever show a counter — kept short so it stays a signal, not clutter.
const COUNTED_KEYS = new Set(['projects', 'approvals', 'defects', 'quality', 'finance', 'notifications', 'tenders']);

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const currentUser = useStore((s) => s.currentUser);
  const { scopeLabel } = useProjectScope();
  const counts = useNavCounts();
  const keys = currentUser ? ROLE_NAV[currentUser.role] : [];

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={onClose} />}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-navy-800 bg-navy-900 text-slate-200 transition-transform lg:static lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="flex items-center gap-2.5 border-b border-navy-800/70 px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-govblue-600">
            <Landmark size={18} className="text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-white">{t('sidebar.govName')}</p>
            <p className="text-[11px] text-navy-200">{t('sidebar.govTagline')}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {keys.map((key) => {
            const item = NAV_ITEMS[key];
            const count = COUNTED_KEYS.has(key) ? counts[key] : undefined;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors',
                  isActive ? 'bg-govblue-600 text-white' : 'text-navy-100 hover:bg-navy-800 hover:text-white',
                )}
              >
                <item.icon size={16} className="shrink-0" />
                <span className="flex-1">{t(`nav.${key}`)}</span>
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
          <div className="border-t border-navy-800/70 px-4 py-3">
            <p className="text-[11px] text-navy-300">{t('sidebar.signedInAs')}</p>
            <p className="truncate text-xs font-medium text-white">{t(`roles.${currentUser.role}`)}</p>
            <p className="mt-1.5 flex items-center gap-1 truncate text-[10.5px] text-navy-300">
              <MapPinned size={11} className="shrink-0" /> {scopeLabel}
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
