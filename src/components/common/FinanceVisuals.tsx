import { uiText } from '../../i18n/ui';

/** Labeled charts without hover targets, resize observers or gesture handlers. */
export function FinanceBars({ label, rows, max }: { label: string; rows: { label: string; value: number; display: string; color?: string }[]; max?: number }) {
  const scale = Math.max(1, max ?? Math.max(...rows.map(row => Math.abs(row.value))));
  const signed = rows.some(row => row.value < 0);
  return <div className="finance-visual space-y-3" role="group" aria-label={uiText(label)}>
    {signed && <div className="flex justify-between text-[11px] text-slate-500"><span>{uiText('Negative')}</span><span>0</span><span>{uiText('Positive')}</span></div>}
    {rows.map(row => <div key={row.label} className="min-w-0">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs"><span className="min-w-0 break-words text-slate-600">{uiText(row.label)}</span><strong className="tabular-nums text-slate-900">{row.display}</strong></div>
      <div aria-hidden="true" className="relative h-3 rounded-full bg-slate-100">{signed && <span className="absolute left-1/2 top-0 h-3 border-l border-slate-400"/>}<div className="absolute h-full rounded-full" data-finance-bar style={{ left: signed ? (row.value < 0 ? 50-Math.min(50,Math.abs(row.value)/scale*50) : 50)+'%' : 0, width: Math.min(signed ? 50 : 100, Math.abs(row.value) / scale * (signed ? 50 : 100)) + '%', backgroundColor: row.color ?? '#2865bc' }}/></div>
    </div>)}
  </div>;
}
