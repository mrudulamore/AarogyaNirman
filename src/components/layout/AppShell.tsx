import { Menu } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { uiText } from '../../i18n/ui';
import { Outlet, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore } from '../../store/useStore';
import { NAV_ITEMS } from './navConfig';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const PendingWork = lazy(() => import('../common/PendingWork').then(m => ({ default: m.PendingWork })));
let demoNoticeShown = false;

/** Longest matching nav item for a pathname (handles nested routes like /projects/:id). */
function navKeyForPath(pathname: string): string | null {
  let best: { key: string; len: number } | null = null;
  for (const [key, item] of Object.entries(NAV_ITEMS)) {
    if (pathname === item.path || pathname.startsWith(`${item.path}/`)) {
      if (!best || item.path.length > best.len) best = { key, len: item.path.length };
    }
  }
  return best?.key ?? null;
}

export function AppShell() {
  const currentUser = useStore((s) => s.currentUser);
  const rolePermissions = useStore((s) => s.rolePermissions);
  const activeUserId = currentUser?.id;
  const activeRole = currentUser?.role;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showDemoNotice, setShowDemoNotice] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const location = useLocation();
  const navigate = useNavigate();

  const navKey = currentUser ? navKeyForPath(location.pathname) : null;
  const allowed = currentUser?.role === 'WORKFORCE' ? location.pathname === '/dashboard' : currentUser ? !navKey || (rolePermissions[currentUser.role] ?? []).includes(navKey) : true;

  useEffect(() => {
    if (!activeUserId || !allowed || location.pathname !== '/dashboard' || demoNoticeShown) return;
    try {
      if (sessionStorage.getItem('aarogya-demo-notice-shown')) return;
      sessionStorage.setItem('aarogya-demo-notice-shown', '1');
    } catch { /* Keep the once-per-session fallback when storage is unavailable. */ }
    demoNoticeShown = true;
    setShowDemoNotice(true);
  }, [activeUserId, allowed, location.pathname]);

  useEffect(() => {
    if (!showDemoNotice) return;
    const timer = window.setTimeout(() => setShowDemoNotice(false), 3000);
    return () => window.clearTimeout(timer);
  }, [showDemoNotice]);

  useEffect(() => {
    if (currentUser && !allowed) {
      toast.error(uiText("You don't have access to that section for your role."));
      navigate('/dashboard', { replace: true });
    }
  }, [allowed, currentUser, location.pathname, navigate]);

  useEffect(() => {
    if (!activeUserId) return;
    const run = () => useStore.getState().evaluateEscalations();
    run(); const timer = window.setInterval(run, 60000);
    return () => window.clearInterval(timer);
  }, [activeUserId, activeRole]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  if (!currentUser) return <Navigate to="/login" replace />;
  if (!allowed) return null;

  return (
    <div className="app-shell flex h-screen overflow-hidden bg-slate-50">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setMobileOpen(true)} />
        {showDemoNotice && location.pathname === '/dashboard' && <div role="note" className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-[11px] font-medium text-amber-900 sm:px-6">{uiText('Demonstration workspace — project records and approvals are sample data stored on this device.')}</div>}
        {!online && <div role="status" className="border-b border-blue-200 bg-blue-50 px-4 py-2 text-center text-xs font-medium text-blue-900">{uiText('Offline — captured photos and drafts remain on this device. Map tiles may be unavailable.')}</div>}
        <main className="app-content min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          {location.pathname === '/dashboard' && currentUser.role !== 'WORKFORCE' && <Suspense fallback={null}><PendingWork /></Suspense>}
          <Outlet />
        </main>
        <nav className="mobile-dock" aria-label={uiText('Navigation')}>
          {['dashboard', 'projects', 'field', 'notifications'].filter(key => currentUser.role === 'WORKFORCE' ? key === 'dashboard' : (rolePermissions[currentUser.role] ?? []).includes(key)).map(key => {
            const item = NAV_ITEMS[key];
            return <NavLink key={key} to={item.path} className={({isActive}) => isActive ? 'dock-link is-active' : 'dock-link'}><item.icon size={21}/><span>{currentUser.role === 'WORKFORCE' ? uiText('My attendance') : uiText(({ dashboard: 'Home', projects: 'Projects', field: 'Field', notifications: 'Alerts' } as Record<string, string>)[key])}</span></NavLink>;
          })}
          <button type="button" className="dock-link" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={21}/><span>{uiText('Menu')}</span></button>
        </nav>
      </div>
    </div>
  );
}
