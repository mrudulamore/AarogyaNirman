import { useTranslation } from 'react-i18next';
import { Landmark, ShieldCheck } from 'lucide-react';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher';

export function AuthLayout({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen bg-navy-950">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-navy-900 p-10 text-white lg:flex">
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '28px 28px',
        }} />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-govblue-600">
            <Landmark size={22} />
          </div>
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

      <div className="flex w-full flex-1 items-center justify-center bg-slate-50 px-6 py-10 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-4 flex items-center justify-between lg:justify-end">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-navy-800">
                <Landmark size={18} className="text-white" />
              </div>
              <p className="text-xs font-semibold text-navy-900">{t('auth.orgLine1')}</p>
            </div>
            <LanguageSwitcher variant="inline" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="mb-6 mt-1 text-sm text-slate-500">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
