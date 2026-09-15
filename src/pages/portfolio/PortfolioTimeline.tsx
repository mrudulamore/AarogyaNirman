import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GanttChart } from 'lucide-react';
import { useProjectScope } from '../../lib/scope';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { Card, CardContent } from '../../components/ui/primitives';
import { formatDate, cn } from '../../lib/utils';

const STATUS_HEX: Record<string, string> = { ON_TRACK: '#3b82f6', AT_RISK: '#f59e0b', DELAYED: '#ef4444', COMPLETED: '#10b981' };

/** Portfolio-wide schedule rollup — a single-project timeline already exists (the vertical
 * stepper on each Project 360 page); this is the missing cross-project view: one horizontal bar
 * per managed project, spanning its registered start date to its (actual or currently planned)
 * completion date, so a Project Manager can see their whole schedule at a glance instead of
 * opening each project individually. */
export function PortfolioTimeline() {
  const navigate = useNavigate();
  const { projects, scopeLabel } = useProjectScope();

  const rows = useMemo(() => {
    const withDates = projects
      .map((p) => ({
        project: p,
        start: new Date(p.startDate).getTime(),
        end: new Date(p.actualCompletionDate ?? p.plannedCompletionDate).getTime(),
      }))
      .filter((r) => Number.isFinite(r.start) && Number.isFinite(r.end) && r.end >= r.start)
      .sort((a, b) => a.start - b.start);
    return withDates;
  }, [projects]);

  const { minTime, maxTime } = useMemo(() => {
    if (rows.length === 0) return { minTime: Date.now(), maxTime: Date.now() + 86400000 };
    const allStarts = rows.map((r) => r.start);
    const allEnds = rows.map((r) => r.end);
    const min = Math.min(...allStarts);
    const max = Math.max(...allEnds, Date.now());
    const pad = (max - min) * 0.03;
    return { minTime: min - pad, maxTime: max + pad };
  }, [rows]);

  const span = Math.max(1, maxTime - minTime);
  const pct = (t: number) => ((t - minTime) / span) * 100;
  const now = Date.now();
  const todayPct = now >= minTime && now <= maxTime ? pct(now) : null;

  const axisTicks = useMemo(() => {
    const count = 6;
    return Array.from({ length: count + 1 }, (_, i) => {
      const t = minTime + (span * i) / count;
      return { pct: (i / count) * 100, label: new Date(t).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) };
    });
  }, [minTime, span]);

  return (
    <div>
      <PageHeader
        title="Portfolio Timeline"
        description={`Schedule rollup across your managed portfolio — ${scopeLabel}`}
      />

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center">
          <GanttChart className="mx-auto mb-2 text-slate-300" size={28} />
          <p className="text-sm font-medium text-slate-600">No projects with schedule dates in your portfolio.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-4 text-[11px] text-slate-500">
              {Object.entries({ ON_TRACK: 'On Track', AT_RISK: 'At Risk', DELAYED: 'Delayed', COMPLETED: 'Completed' }).map(([k, label]) => (
                <span key={k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: STATUS_HEX[k] }} />{label}</span>
              ))}
              <span className="ml-auto flex items-center gap-1.5"><span className="h-2.5 w-0.5 bg-navy-700" /> Today</span>
            </div>

            <div className="overflow-x-auto">
              <div style={{ minWidth: 720 }}>
                {/* Axis */}
                <div className="relative ml-44 h-6 border-b border-slate-200 text-[10px] text-slate-400">
                  {axisTicks.map((tick, i) => (
                    <span key={i} className="absolute -translate-x-1/2" style={{ left: `${tick.pct}%` }}>{tick.label}</span>
                  ))}
                </div>

                <div className="relative">
                  {todayPct !== null && (
                    <div
                      className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-navy-700"
                      style={{ left: `calc(11rem + (100% - 11rem) * ${(todayPct / 100).toFixed(4)})` }}
                    />
                  )}
                  {rows.map(({ project: p, start, end }) => {
                    const left = pct(start);
                    const width = Math.max(0.6, pct(end) - left);
                    const color = STATUS_HEX[p.status] ?? '#64748b';
                    return (
                      <div key={p.id} className="flex items-center gap-0 border-b border-slate-50 py-2 last:border-0">
                        <button
                          onClick={() => navigate(`/projects/${p.id}?tab=timeline`)}
                          className="w-44 shrink-0 truncate pr-3 text-left text-xs font-medium text-slate-700 hover:text-navy-700 hover:underline"
                          title={p.name}
                        >
                          {p.name}
                        </button>
                        <div className="relative h-5 flex-1 rounded bg-slate-50">
                          <div
                            className="absolute inset-y-0 rounded"
                            style={{ left: `${left}%`, width: `${width}%`, background: `${color}33`, border: `1px solid ${color}66` }}
                            title={`${formatDate(p.startDate)} → ${formatDate(p.actualCompletionDate ?? p.plannedCompletionDate)}`}
                          >
                            <div className="h-full rounded" style={{ width: `${p.physicalProgress}%`, background: color }} />
                          </div>
                          <span
                            className={cn('absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-medium', left + width > 70 ? 'text-right' : '')}
                            style={{ left: `calc(${left + width}% + 6px)`, color }}
                          >
                            {p.physicalProgress}%{p.delayDays > 0 && ` · ${p.delayDays}d late`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
