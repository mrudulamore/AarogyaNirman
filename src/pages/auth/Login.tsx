import { uiText, useUiLanguage } from '../../i18n/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button, Input, Label } from '../../components/ui/primitives';
import { useStore } from '../../store/useStore';
import type { Role } from '../../types';

const DEMO_ACCOUNTS: { role: Role; username: string }[] = [
  { role: 'SUPERADMIN', username: 'superadmin' },
  { role: 'MINISTER', username: 'minister.secretary' },
  { role: 'COMMISSIONER', username: 'commissioner' },
  { role: 'REGIONAL_DIRECTOR', username: 'regional.director' },
  { role: 'CIVIL_SURGEON', username: 'civil.surgeon' },
  { role: 'EXECUTIVE_ENGINEER', username: 'exec.engineer' },
  { role: 'PROJECT_MANAGER', username: 'project.manager' },
  { role: 'DEPUTY_ENGINEER', username: 'deputy.engineer' },
  { role: 'CONTRACTOR', username: 'contractor' },
  { role: 'MEDICAL_OFFICER', username: 'medical.officer' },
  { role: 'VIGILANCE_AUDIT', username: 'vigilance.audit' },
  { role: 'IT_ADMIN', username: 'it.admin' },
];

export function Login() {
  useUiLanguage();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const login = useStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  function quickLogin(role: Role) {
    login(role);
    navigate('/select-role');
  }

  function manualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const match = DEMO_ACCOUNTS.find((a) => a.username === username.trim()) ?? DEMO_ACCOUNTS[0];
    login(match.role);
    navigate('/select-role');
  }

  return (
    <AuthLayout title={uiText(t('auth.signInTitle'))} subtitle={t('auth.signInSubtitle')}>
      <form onSubmit={manualSubmit} className="space-y-3.5">
        <div>
          <Label>{t('auth.userId')}</Label>
          <Input placeholder={uiText(t('auth.userIdPlaceholder') ?? undefined)} value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <Label>{t('auth.password')}</Label>
          <div className="relative">
            <Input type={showPw ? 'text' : 'password'} placeholder={uiText("••••••••")} value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <a href="/forgot-password" onClick={(e) => { e.preventDefault(); navigate('/forgot-password'); }} className="text-navy-700 hover:underline">{t('auth.forgotPassword')}</a>
          <span className="flex items-center gap-1 text-slate-400"><ShieldCheck size={12} /> {t('auth.securedSession')}</span>
        </div>
        <Button type="submit" className="w-full" size="lg">{t('auth.signIn')}</Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[11px] text-slate-400">
        <div className="h-px flex-1 bg-slate-200" /> {t('auth.demoAccounts').toUpperCase()} <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="grid max-h-72 grid-cols-1 gap-1.5 overflow-y-auto pr-1">
        {DEMO_ACCOUNTS.map((a) => (
          <button
            key={a.role}
            onClick={() => quickLogin(a.role)}
            className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs hover:border-navy-300 hover:bg-navy-50"
          >
            <span className="font-medium text-slate-700">{t(`roles.${a.role}`)}</span>
            <span className="text-[10px] text-slate-400">{uiText(a.username)}</span>
          </button>
        ))}
      </div>
    </AuthLayout>
  );
}
