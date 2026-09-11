import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export function KpiCard({ label, value, sub, icon: Icon, tone = 'default', onClick }: {
  label: string; value: string | number; sub?: string; icon?: LucideIcon;
  tone?: 'default' | 'blue' | 'amber' | 'red' | 'emerald'; onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    default: 'bg-slate-100 text-slate-600', blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600', emerald: 'bg-emerald-50 text-emerald-600',
  };
  return (
    <div onClick={onClick} className={cn('rounded-lg border border-slate-200 bg-white p-4 shadow-card', onClick && 'cursor-pointer hover:border-navy-300')}>
      <div className="flex items-start justify-between">
        <p className="text-[11.5px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        {Icon && <div className={cn('flex h-7 w-7 items-center justify-center rounded-md', tones[tone])}><Icon size={14} /></div>}
      </div>
      <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}
