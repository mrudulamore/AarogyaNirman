import { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore } from '../../store/useStore';
import { NAV_ITEMS } from './navConfig';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navKey = currentUser ? navKeyForPath(location.pathname) : null;
  const allowed = currentUser ? !navKey || (rolePermissions[currentUser.role] ?? []).includes(navKey) : true;

  useEffect(() => {
    if (currentUser && !allowed) {
      toast.error("You don't have access to that section for your role.");
      navigate('/dashboard', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, currentUser?.role]);

  if (!currentUser) return <Navigate to="/login" replace />;
  if (!allowed) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
