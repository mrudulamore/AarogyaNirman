import { uiText, useUiLanguage } from '../../i18n/ui';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

const TONE_CLASSES: Record<string, string> = {
  default: 'bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-sm shadow-slate-300',
  blue: 'bg-gradient-to-br from-blue-400 to-govblue-700 text-white shadow-sm shadow-blue-200',
  amber: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm shadow-amber-200',
  red: 'bg-gradient-to-br from-red-400 to-red-600 text-white shadow-sm shadow-red-200',
  emerald: 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm shadow-emerald-200',
};
const TONE_TEXT: Record<string, string> = {
  default: 'text-slate-700', blue: 'text-blue-600', amber: 'text-amber-600', red: 'text-red-600', emerald: 'text-emerald-600',
};

export function KpiCard({ label, value, sub, icon: Icon, tone = 'default', onClick }: {
  label: string; value: string | number; sub?: string; icon?: LucideIcon;
  tone?: 'default' | 'blue' | 'amber' | 'red' | 'emerald'; onClick?: () => void;
}) {
  useUiLanguage();
  return (
    <div onClick={onClick} className={cn('metric-card rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:p-5 transition-all', onClick && 'cursor-pointer hover:-translate-y-0.5 hover:border-navy-300 hover:shadow-md')}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">{uiText(label)}</p>
        {Icon && <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', TONE_CLASSES[tone])}><Icon size={14} /></div>}
      </div>
      <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900">{uiText(value)}</p>
      {sub && <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{uiText(sub)}</p>}
    </div>
  );
}

export interface GroupStat {
  label: string;
  value: string | number;
  tone?: 'default' | 'blue' | 'amber' | 'red' | 'emerald';
  onClick?: () => void;
  /** Marks this stat as the currently-selected page filter — gets a highlighted pill so it
   * reads as "on" rather than just another number. */
  active?: boolean;
}

/** A single card that bundles several related numbers together (one headline stat + a row of
 * smaller linked stats) instead of spending a whole tile per metric — keeps the KPI strip to a
 * handful of cards regardless of how many underlying numbers a role's dashboard tracks. */
export function KpiGroupCard({ title, icon: Icon, tone = 'default', primary, stats, onPrimaryClick }: {
  title: string; icon?: LucideIcon; tone?: 'default' | 'blue' | 'amber' | 'red' | 'emerald';
  primary: { value: string | number; label?: string }; stats: GroupStat[]; onPrimaryClick?: () => void;
}) {
  useUiLanguage();
  return (
    <div className="metric-card metric-group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">{uiText(title)}</p>
        {Icon && <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', TONE_CLASSES[tone])}><Icon size={14} /></div>}
      </div>
      <div onClick={onPrimaryClick} className={cn('mt-1.5 inline-flex items-baseline gap-1.5', onPrimaryClick && 'cursor-pointer')}>
        <p className="text-2xl font-bold text-slate-900">{uiText(primary.value)}</p>
        {primary.label && <p className="text-[11px] text-slate-400">{uiText(primary.label)}</p>}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
        {stats.map((s, i) => (
          <button
            key={i}
            onClick={s.onClick}
            disabled={!s.onClick}
            title={uiText(s.onClick ? `Filter by ${s.label}` : undefined)}
            className={cn(
              'flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] leading-none transition-colors disabled:cursor-default',
              s.onClick && !s.active && 'hover:bg-slate-50',
              s.active && 'bg-slate-100 ring-1 ring-inset ring-slate-300',
            )}
          >
            <span className={cn('font-bold', TONE_TEXT[s.tone ?? 'default'])}>{uiText(s.value)}</span>
            <span className={cn(s.active ? 'text-slate-600' : 'text-slate-400')}>{uiText(s.label)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
