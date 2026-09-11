import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from './AuthLayout';
import { Button } from '../../components/ui/primitives';
import { useStore } from '../../store/useStore';

export function Otp() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentUser = useStore((s) => s.currentUser);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!currentUser) navigate('/login');
  }, [currentUser, navigate]);

  function update(i: number, v: string) {
    if (!/^[0-9]?$/.test(v)) return;
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) { setError(t('auth.otpError')); return; }
    navigate('/select-role');
  }

  return (
    <AuthLayout title={t('auth.otpTitle')} subtitle={t('auth.otpSubtitle')}>
      <form onSubmit={submit} className="space-y-5">
        <div className="flex justify-between gap-2">
          {digits.map((d, i) => (
            <input
              key={i} ref={(el) => { refs.current[i] = el; }} value={d} maxLength={1}
              onChange={(e) => update(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus(); }}
              className="h-12 w-11 rounded-md border border-slate-300 text-center text-lg font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          ))}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button type="submit" size="lg" className="w-full">{t('auth.verifyContinue')}</Button>
        <p className="text-center text-xs text-slate-400">{t('auth.resendPrompt')} <button type="button" className="font-medium text-navy-700 hover:underline">{t('auth.resend')}</button></p>
      </form>
    </AuthLayout>
  );
}
