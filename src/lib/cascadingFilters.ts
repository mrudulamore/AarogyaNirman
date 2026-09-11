import type { Project } from '../types';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

/** Builds a dropdown option list with live counts derived from the given project set — never
 * hardcoded. The "ALL" option always sits first and carries the full set's count. */
export function optionsWithCounts(projects: Project[], keyFn: (p: Project) => string, allLabel: string): FilterOption[] {
  const counts = new Map<string, number>();
  for (const p of projects) {
    const k = keyFn(p);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const entries = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, label: value, count }));
  return [{ value: 'ALL', label: allLabel, count: projects.length }, ...entries];
}
