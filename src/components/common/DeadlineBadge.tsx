import type { Project } from '../../types';
import { todayDate } from '../../lib/fundDisbursal';
import { uiText, uiMessage } from '../../i18n/ui';
import { daysBetween } from '../../lib/utils';
export function deadlineState(project: Pick<Project, 'status' | 'plannedCompletionDate'>, today = todayDate()) {
  if (project.status === 'COMPLETED') return { label: 'Completed', days: 0, tone: 'bg-emerald-50 text-emerald-700' };
  if (!project.plannedCompletionDate) return { label: 'Schedule pending', days: 0, tone: 'bg-slate-50 text-slate-600' };
  const days = daysBetween(today, project.plannedCompletionDate);
  return { label: days < 0 ? '{{0}} days overdue' : days === 0 ? 'Due today' : '{{0}} days left', days: Math.abs(days), tone: days < 0 ? 'bg-red-50 text-red-700' : days <= 30 ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-700' };
}
export function DeadlineBadge({ project }: { project: Project }) {
  const state = deadlineState(project);
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${state.tone}`}>{state.label.includes('{{0}}') ? uiMessage(state.label, [state.days]) : uiText(state.label)}</span>;
}
