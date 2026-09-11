import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Landmark, HardHat, ClipboardList, Radar, Hammer, Stethoscope, Crown, MapPinned } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ROLE_LABELS, ROLE_DEPARTMENTS } from '../../lib/constants';
import type { Role } from '../../types';
import { cn } from '../../lib/utils';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher';

const ROLE_ICONS: Record<Role, typeof Building2> = {
  MINISTER: Crown, COMMISSIONER: Landmark, REGIONAL_DIRECTOR: MapPinned, CIVIL_SURGEON: Building2,
  EXECUTIVE_ENGINEER: Hammer, DEPUTY_ENGINEER: HardHat, CONTRACTOR: ClipboardList,
  MEDICAL_OFFICER: Stethoscope, VIGILANCE_AUDIT: Radar,
};

export function SelectRole() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentUser = useStore((s) => s.currentUser);
  const login = useStore((s) => s.login);
  const roles = Object.keys(ROLE_LABELS) as Role[];

  function choose(role: Role) {
    login(role);
    navigate('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t('auth.selectRoleTitle')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('auth.selectRoleSubtitle')}</p>
          </div>
          <LanguageSwitcher variant="inline" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => {
            const Icon = ROLE_ICONS[role];
            const active = currentUser?.role === role;
            return (
              <button
                key={role}
                onClick={() => choose(role)}
                className={cn(
                  'flex items-start gap-3 rounded-lg border bg-white p-4 text-left shadow-sm transition-colors hover:border-navy-400 hover:shadow-md',
                  active ? 'border-navy-500 ring-1 ring-navy-400' : 'border-slate-200',
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy-700">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{t(`roles.${role}`)}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{ROLE_DEPARTMENTS[role]}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
