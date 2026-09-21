import { BrandLogo } from '../../components/common/BrandLogo';
import { uiText, useUiLanguage } from '../../i18n/ui';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher';

export function AuthLayout({ children, title, subtitle, backTo }: { children: React.ReactNode; title: string; subtitle: string; backTo?: string }) {
  useUiLanguage();
  const { t } = useTranslation();
  return (
    <div className="auth-shell flex min-h-screen bg-navy-950">
      <div className="auth-art relative hidden w-1/2 flex-col justify-between overflow-hidden bg-navy-900 p-10 text-white lg:flex">
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '28px 28px',
        }} />
        <div className="relative flex items-center gap-3">
          <BrandLogo className="h-14 w-14" />
          <div>
            <p className="text-sm font-semibold">{t('auth.orgLine1')}</p>
            <p className="text-xs text-navy-300">{t('auth.orgLine2')}</p>
          </div>
        </div>
        <div className="relative">
          <h1 className="text-3xl font-bold leading-tight text-balance">{t('auth.heroTitle')}</h1>
          <p className="mt-4 max-w-md text-sm text-navy-200">
            {t('auth.heroSubtitle')}
          </p>
          <div className="mt-8 flex items-center gap-2 text-xs text-navy-300">
            <ShieldCheck size={15} />
            {t('auth.heroFooterNote')}
          </div>
        </div>
        <p className="relative text-[11px] text-navy-400">{t('auth.heroCopyright')}</p>
      </div>

      <div className="auth-form-area flex w-full flex-1 items-center justify-center bg-slate-50 px-6 py-10 lg:w-1/2">
        <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-200/40 sm:p-8">
          {backTo && (
            <Link to={backTo} className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-navy-700 hover:bg-navy-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-govblue-500">
              <ArrowLeft size={20} aria-hidden="true" />
              {t('common.back')}
            </Link>
          )}
          <div className="mb-4 flex items-center justify-between lg:justify-end">
            <div className="flex items-center gap-2 lg:hidden">
              <BrandLogo className="h-14 w-14" />
              <p className="text-xs font-semibold text-navy-900">{t('auth.orgLine1')}</p>
            </div>
            <LanguageSwitcher variant="inline" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{uiText(title)}</h2>
          <p className="mb-6 mt-1 text-sm text-slate-500">{uiText(subtitle)}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
