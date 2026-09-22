import type { ReactNode } from 'react';
import { Cloud, CloudOff, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { uiText } from '../../i18n/ui';

export function ListCard({ title, subtitle, meta, leading, trailing, onClick, children, className }: {
  title: ReactNode; subtitle?: ReactNode; meta?: ReactNode; leading?: ReactNode; trailing?: ReactNode;
  onClick?: () => void; children?: ReactNode; className?: string;
}) {
  const body = <>
    <div className="flex min-w-0 items-start gap-3">
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="break-words text-[15px] font-semibold leading-5 text-slate-900">{title}</div>
        {subtitle && <div className="mt-1 break-words text-[13px] leading-5 text-slate-500">{subtitle}</div>}
      </div>
      {trailing ?? (onClick ? <ChevronRight className="mt-1 shrink-0 text-slate-400" size={19} /> : null)}
    </div>
    {children && <div className="mt-3">{children}</div>}
    {meta && <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">{meta}</div>}
  </>;
  const classes = cn('mobile-list-card w-full rounded-[20px] border border-slate-200 bg-white p-4 text-left shadow-sm', className);
  return onClick ? <button type="button" onClick={onClick} className={classes}>{body}</button> : <article className={classes}>{body}</article>;
}

export function SegmentedControl({ items, value, onChange, label }: { items: { value: string; label: string }[]; value: string; onChange: (value: string) => void; label: string }) {
  return <div className="mobile-segments" role="tablist" aria-label={uiText(label)}>{items.map(item => <button key={item.value} type="button" role="tab" aria-selected={value === item.value} onClick={() => onChange(item.value)} className={value === item.value ? 'is-active' : ''}>{uiText(item.label)}</button>)}</div>;
}

export function StickyActionBar({ children }: { children: ReactNode }) {
  return <div className="mobile-sticky-actions">{children}</div>;
}

export function SyncBadge({ online, pending = 0 }: { online: boolean; pending?: number }) {
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', online ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800')}>
    {online ? <Cloud size={14} /> : <CloudOff size={14} />}{uiText(online ? (pending ? `${pending} waiting to sync` : 'Synced') : `${pending} saved offline`)}
  </span>;
}
