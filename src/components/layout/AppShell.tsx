import { BarChart3, Building2, Camera, ClipboardCheck, FileText, Gauge, HardHat, KeyRound, LayoutDashboard, Menu, Radar, ShieldCheck, UserRound, Wallet } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { uiText } from '../../i18n/ui';
import { Outlet, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore } from '../../store/useStore';
import { MOBILE_TABS, NAV_ITEMS, type MobileDestination } from './navConfig';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const PendingWork = lazy(() => import('../common/PendingWork').then(m => ({ default: m.PendingWork })));
let demoNoticeShown = false;

const MOBILE_DESTINATIONS: Record<MobileDestination, { label: string; path: string; icon: typeof Menu }> = {
  today: { label: 'Today', path: '/today', icon: Gauge }, overview: { label: 'Overview', path: '/today', icon: LayoutDashboard }, status: { label: 'Status', path: '/today', icon: Gauge },
  projects: { label: 'Projects', path: '/projects', icon: Building2 }, capture: { label: 'Capture', path: '/capture', icon: Camera }, inspect: { label: 'Inspect', path: '/quality', icon: ShieldCheck },
  bills: { label: 'Bills', path: '/finance', icon: Wallet }, finance: { label: 'Finance', path: '/finance', icon: Wallet }, approvals: { label: 'Approvals', path: '/approvals', icon: ClipboardCheck },
  quality: { label: 'Quality', path: '/quality', icon: ShieldCheck }, reports: { label: 'Reports', path: '/reports', icon: BarChart3 }, observer: { label: 'Observer', path: '/observer', icon: Radar },
  audit: { label: 'Audit', path: '/audit', icon: FileText }, access: { label: 'Access', path: '/access', icon: KeyRound }, attendance: { label: 'Attendance', path: '/today', icon: HardHat },
  profile: { label: 'Profile', path: '/today?view=profile', icon: UserRound }, documents: { label: 'Documents', path: '/documents', icon: FileText }, more: { label: 'More', path: '/more', icon: Menu },
};

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
  const mobileAlias = location.pathname === '/capture' ? 'field' : location.pathname === '/today' ? 'dashboard' : null;
  const allowed = currentUser?.role === 'WORKFORCE' ? ['/dashboard', '/today'].includes(location.pathname) : currentUser ? (navKey ? (rolePermissions[currentUser.role] ?? []).includes(navKey) : mobileAlias ? (rolePermissions[currentUser.role] ?? []).includes(mobileAlias) : true) : true;

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
    if (location.pathname !== '/dashboard' || window.matchMedia('(min-width: 1024px)').matches) return;
    navigate('/today', { replace: true });
  }, [location.pathname, navigate]);

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
          {MOBILE_TABS[currentUser.role].map(destination => {
            const item = MOBILE_DESTINATIONS[destination];
            const Icon = item.icon;
            return <NavLink key={destination} to={item.path} className={({isActive}) => `${isActive ? 'dock-link is-active' : 'dock-link'} ${destination === 'capture' ? 'dock-capture' : ''}`}><span className="dock-icon"><Icon size={destination === 'capture' ? 24 : 21}/></span><span>{uiText(item.label)}</span></NavLink>;
          })}
        </nav>
      </div>
    </div>
  );
}
