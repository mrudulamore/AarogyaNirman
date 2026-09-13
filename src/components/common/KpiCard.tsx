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
  return (
    <div onClick={onClick} className={cn('rounded-lg border border-slate-200 bg-white p-4 shadow-card transition-all', onClick && 'cursor-pointer hover:-translate-y-0.5 hover:border-navy-300 hover:shadow-md')}>
      <div className="flex items-start justify-between">
        <p className="text-[11.5px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        {Icon && <div className={cn('flex h-7 w-7 items-center justify-center rounded-md', TONE_CLASSES[tone])}><Icon size={14} /></div>}
      </div>
      <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

export interface GroupStat {
  label: string;
  value: string | number;
  tone?: 'default' | 'blue' | 'amber' | 'red' | 'emerald';
  onClick?: () => void;
}

/** A single card that bundles several related numbers together (one headline stat + a row of
 * smaller linked stats) instead of spending a whole tile per metric — keeps the KPI strip to a
 * handful of cards regardless of how many underlying numbers a role's dashboard tracks. */
export function KpiGroupCard({ title, icon: Icon, tone = 'default', primary, stats, onPrimaryClick }: {
  title: string; icon?: LucideIcon; tone?: 'default' | 'blue' | 'amber' | 'red' | 'emerald';
  primary: { value: string | number; label?: string }; stats: GroupStat[]; onPrimaryClick?: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <p className="text-[11.5px] font-medium uppercase tracking-wide text-slate-400">{title}</p>
        {Icon && <div className={cn('flex h-7 w-7 items-center justify-center rounded-md', TONE_CLASSES[tone])}><Icon size={14} /></div>}
      </div>
      <div onClick={onPrimaryClick} className={cn('mt-1.5 inline-flex items-baseline gap-1.5', onPrimaryClick && 'cursor-pointer')}>
        <p className="text-2xl font-bold text-slate-900">{primary.value}</p>
        {primary.label && <p className="text-[11px] text-slate-400">{primary.label}</p>}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
        {stats.map((s, i) => (
          <button
            key={i}
            onClick={s.onClick}
            disabled={!s.onClick}
            className={cn(
              'flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] leading-none disabled:cursor-default',
              s.onClick && 'hover:bg-slate-50',
            )}
          >
            <span className={cn('font-bold', TONE_TEXT[s.tone ?? 'default'])}>{s.value}</span>
            <span className="text-slate-400">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
