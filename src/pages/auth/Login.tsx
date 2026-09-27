import { uiText, useUiLanguage } from '../../i18n/ui';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button, Input, Label } from '../../components/ui/primitives';
import { useStore } from '../../store/useStore';
import type { Role } from '../../types';

const DEMO_ACCOUNTS: { role: Role; username: string; userId?: string; name?: string }[] = [
  { role: 'CHIEF_ENGINEER', username: 'chief.engineer' },
  { role: 'SUPERINTENDING_ENGINEER', username: 'superintending.engineer' },
  { role: 'SITE_SUPERVISOR', username: 'site.supervisor' },
  { role: 'WORKFORCE', username: 'workforce' },
  { role: 'SUPERADMIN', username: 'superadmin' },
  { role: 'MINISTER', username: 'minister.secretary' },
  { role: 'COMMISSIONER', username: 'commissioner' },
  { role: 'REGIONAL_DIRECTOR', username: 'regional.director' },
  { role: 'CIVIL_SURGEON', username: 'civil.surgeon' },
  { role: 'EXECUTIVE_ENGINEER', username: 'exec.engineer' },
  { role: 'PROJECT_MANAGER', username: 'project.manager' },
  { role: 'DEPUTY_ENGINEER', username: 'deputy.engineer' },
  { role: 'DEPUTY_ENGINEER', username: 'pune.je1@example.test', userId: 'PUNE-DEMO-JE-1', name: 'Aditya Patil' },
  { role: 'DEPUTY_ENGINEER', username: 'pune.je2@example.test', userId: 'PUNE-DEMO-JE-2', name: 'Sneha Deshmukh' },
  { role: 'DEPUTY_ENGINEER', username: 'pune.je3@example.test', userId: 'PUNE-DEMO-JE-3', name: 'Rohan Jadhav' },
  { role: 'DEPUTY_ENGINEER', username: 'pune.je4@example.test', userId: 'PUNE-DEMO-JE-4', name: 'Priya Shinde' },
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
  const [error, setError] = useState(false);

  function manualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const match = DEMO_ACCOUNTS.find((a) => a.username === username.trim().toLowerCase());
    const entered = username.trim().toLowerCase();
    const user = useStore.getState().users.find(u => u.email.toLowerCase() === entered || u.id.toLowerCase() === entered);
    if (user) login(user.role, user.id);
    else if (match) login(match.role, match.userId);
    else { setError(true); return; }
    if (!useStore.getState().currentUser) { setError(true); return; }
    navigate('/dashboard', { replace: true });
  }

  return (
    <AuthLayout title={uiText(t('auth.signInTitle'))} subtitle={t('auth.signInSubtitle')} backTo="/">
      <form onSubmit={manualSubmit} className="space-y-3.5">
        <div>
          <Label htmlFor="login-id">{t('auth.userId')}</Label>
          <Input id="login-id" name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-invalid={error} aria-describedby={error ? 'login-error' : undefined} placeholder={t('auth.userIdPlaceholder') ?? undefined} value={username} onChange={(e) => { setUsername(e.target.value); setError(false); }} />
        </div>
        <div>
          <Label htmlFor="login-password">{t('auth.password')}</Label>
          <div className="relative">
            <Input id="login-password" name="password" autoComplete="current-password" type={showPw ? 'text' : 'password'} placeholder={uiText("••••••••")} value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <a href="/forgot-password" onClick={(e) => { e.preventDefault(); navigate('/forgot-password'); }} className="text-navy-700 hover:underline">{t('auth.forgotPassword')}</a>
          <span className="flex items-center gap-1 text-slate-400"><ShieldCheck size={12} /> {t('auth.securedSession')}</span>
        </div>
        {error && <p id="login-error" role="alert" className="text-xs text-red-600">{t('auth.unknownLoginId')}</p>}
        <Button type="submit" className="w-full" size="lg">{t('auth.signIn')}</Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[11px] text-slate-400">
        <div className="h-px flex-1 bg-slate-200" /> {t('auth.demoAccounts').toUpperCase()} <div className="h-px flex-1 bg-slate-200" />
      </div>

      <Link to="/select-role" className="flex min-h-11 w-full items-center justify-center rounded-lg border border-navy-300 px-4 py-3 text-sm font-semibold text-navy-700 hover:bg-navy-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-govblue-500">
        {t('auth.selectDemoRole')}
      </Link>
    </AuthLayout>
  );
}
