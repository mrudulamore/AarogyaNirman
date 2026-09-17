import { uiText, useUiLanguage } from '../../i18n/ui';
import { useTranslation } from 'react-i18next';
import { Languages, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../../i18n';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/overlays';
import { cn } from '../../lib/utils';

export function LanguageSwitcher({ variant = 'icon' }: { variant?: 'icon' | 'inline' }) {
  useUiLanguage();
  const { i18n } = useTranslation();
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ?? SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'icon' ? (
          <button className="flex items-center gap-1.5 rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label={uiText("Change language")}>
            <Languages size={18} />
          </button>
        ) : (
          <button className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
            <Languages size={13} /> {current.nativeLabel}
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem key={lang.code} onSelect={() => i18n.changeLanguage(lang.code)}>
            <span className={cn('flex w-full items-center justify-between', lang.code === current.code && 'font-semibold text-navy-700')}>
              <span>{lang.nativeLabel} <span className="text-slate-400">({uiText(lang.label)})</span></span>
              {lang.code === current.code && <Check size={13} />}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
