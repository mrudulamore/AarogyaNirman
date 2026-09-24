import { BrandLogo } from '../../components/common/BrandLogo';
import { useState } from 'react';
import { Dialog, DialogContent } from '../../components/ui/overlays';
import { uiText, useUiLanguage } from '../../i18n/ui';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Landmark, HardHat, ClipboardList, Radar, Hammer, Stethoscope, Crown, MapPinned, KeyRound, Settings2, ArrowLeft, ArrowRight, Briefcase } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ROLE_LABELS, ROLE_DEPARTMENTS } from '../../lib/constants';
import type { Role } from '../../types';
import { cn } from '../../lib/utils';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher';

const ROLE_ICONS: Record<Role, typeof Building2> = {
  CHIEF_ENGINEER: Hammer, SUPERINTENDING_ENGINEER: Hammer,
  SITE_SUPERVISOR: HardHat,
  WORKFORCE: HardHat,
  SUPERADMIN: KeyRound, MINISTER: Crown, COMMISSIONER: Landmark, REGIONAL_DIRECTOR: MapPinned, CIVIL_SURGEON: Building2,
  EXECUTIVE_ENGINEER: Hammer, PROJECT_MANAGER: Briefcase, DEPUTY_ENGINEER: HardHat, CONTRACTOR: ClipboardList,
  MEDICAL_OFFICER: Stethoscope, VIGILANCE_AUDIT: Radar, IT_ADMIN: Settings2,
};

export function SelectRole() {
  useUiLanguage();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentUser = useStore((s) => s.currentUser);
  const login = useStore((s) => s.login);
  const logout = useStore((s) => s.logout);
  const users = useStore((s) => s.users);
  const projects = useStore((s) => s.projects);
  const [chooseJunior, setChooseJunior] = useState(false);
  const puneHospitals = projects.filter(project => project.division === 'Pune Division');
  const juniors = users.filter(user => user.role === 'DEPUTY_ENGINEER' &&
    puneHospitals.some(project => project.siteEngineerId === user.id));
  const roles: Role[] = (Object.keys(ROLE_LABELS) as Role[]).filter(role => role !== 'WORKFORCE');
  roles.splice(roles.indexOf('DEPUTY_ENGINEER') + 1, 0, 'WORKFORCE');

  function choose(role: Role) {
    if (role === 'DEPUTY_ENGINEER') {
      setChooseJunior(true);
      return;
    }
    login(role);
    navigate('/dashboard', { replace: true });
  }

  if (currentUser?.role === 'WORKFORCE') return <Navigate to="/dashboard" replace />;
  return (
    <div className="relative min-h-screen overflow-hidden bg-navy-950 px-6 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-govblue-600/20 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-navy-500/20 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '28px 28px',
        }} />
      </div>

      <Dialog open={chooseJunior} onOpenChange={setChooseJunior}>
        <DialogContent title={uiText('Junior Engineer')} size="sm">
          <div className="space-y-2">
            {juniors.map(user => (
              <button key={user.id} type="button" onClick={() => {
                login('DEPUTY_ENGINEER', user.id);
                navigate('/dashboard', { replace: true });
              }} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-govblue-500">
                <span><span className="block text-sm font-medium">{user.name}</span><span className="block text-xs text-slate-500">{uiText('Junior Engineer')} — {uiText(puneHospitals.find(project => project.siteEngineerId === user.id)!.district)}</span></span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <div className="relative mx-auto max-w-5xl">
        <Link to="/" className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-govblue-400">
          <ArrowLeft size={20} aria-hidden="true" />
          {t('common.back')}
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-14 w-14" />
            <div>
              <h1 className="text-xl font-bold text-white">{t('auth.selectRoleTitle')}</h1>
              <p className="mt-1 text-sm text-navy-200">{t('auth.selectRoleSubtitle')}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <LanguageSwitcher variant="inline" />
            <button type="button" onClick={() => { logout(); navigate('/login', { replace: true }); }} className="rounded-md border border-white/30 px-3 py-2 text-xs text-white hover:bg-white/10">{t('header.switchAccount')}</button>
          </div>
        </div>

        <div className="role-card-grid mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => {
            const Icon = ROLE_ICONS[role];
            const active = currentUser?.role === role;
            return (
              <button
                key={role}
                onClick={() => choose(role)}
                className={cn(
                  'group relative flex items-start gap-3 overflow-hidden rounded-xl border bg-white/[0.04] p-4 text-left shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.08] hover:shadow-xl hover:shadow-govblue-950/40',
                  active ? 'border-govblue-400 ring-1 ring-govblue-400' : 'border-white/10',
                )}
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-govblue-500/90 to-navy-700 text-white shadow-inner">
                  <Icon size={18} />
                </div>
                <div className="relative min-w-0">
                  <p className="text-sm font-semibold text-white">{t(`roles.${role}`, { defaultValue: ROLE_LABELS[role] })}</p>
                  <p className="mt-0.5 truncate text-[11px] text-navy-300">{uiText(ROLE_DEPARTMENTS[role])}</p>
                </div>
                <ArrowRight size={15} className="relative ml-auto mt-1 shrink-0 text-navy-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
