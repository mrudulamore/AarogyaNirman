import { uiText, useUiLanguage } from '../../i18n/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button, Input, Label } from '../../components/ui/primitives';

export function ForgotPassword() {
  useUiLanguage();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <AuthLayout title={uiText(t('auth.resetTitle'))} subtitle={t('auth.resetSubtitle')}>
      {sent ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="mb-2" size={20} />
          {t('auth.resetSentPrefix')} <strong>{uiText(email)}</strong>. {t('auth.resetSentSuffix')}
          <Button variant="outline" className="mt-4 w-full" onClick={() => navigate('/login')}>{t('auth.backToSignIn')}</Button>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-3.5">
          <div>
            <Label>{t('auth.registeredEmail')}</Label>
            <Input type="email" required placeholder={uiText("you@maharashtra.gov.in")} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" size="lg" className="w-full">{t('auth.sendResetLink')}</Button>
          <button type="button" onClick={() => navigate('/login')} className="w-full text-center text-xs text-navy-700 hover:underline">{t('auth.backToSignIn')}</button>
        </form>
      )}
    </AuthLayout>
  );
}
