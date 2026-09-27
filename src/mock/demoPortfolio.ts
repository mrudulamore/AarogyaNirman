import hospitalReferences from './hospitalReferences.json';

const PUNE_DEMO_HOSPITALS = [
  'Rural Hospital — Baramati', 'Sub-District Hospital — Indapur',
  'Women & Child Hospital — Shirur', 'Rural Hospital — Junnar',
  'Community Health Centre — Bhor', 'Rural Hospital — Wai',
  'Sub-District Hospital — Karad', 'Women & Child Hospital — Miraj',
  'Rural Hospital — Pandharpur', 'Community Health Centre — Ichalkaranji',
  'Rural Hospital — Daund', 'Sub-District Hospital — Phaltan',
];

/** Real facility names with explicitly illustrative project records. IDs stay stable. */
export function extendDemoPortfolio<T extends { projects: any[]; users: any[]; contractors: any[] }>(data: T): T {
  const result: any = { ...data };
  for (const [key, value] of Object.entries(data)) if (Array.isArray(value)) result[key] = [...value];
  const puneTemplates = data.projects.filter(project => project.division === 'Pune Division');
  for (let i = 0; i < 4 + (puneTemplates.length ? PUNE_DEMO_HOSPITALS.length : 0); i++) {
    const template = i < 4 ? data.projects[i + 1] : puneTemplates[(i - 4) % puneTemplates.length];
    const projectId = `DEMO24-PRJ-${21 + i}`;
    if (result.projects.some((p: any) => p.id === projectId)) continue;
    const groups: Record<string, any[]> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === 'projects') groups[key] = [template];
      else if (Array.isArray(value) && !['users', 'contractors'].includes(key)) groups[key] = value.filter((v: any) => v.projectId === template.id);
    }
    const ids = new Map<string,string>([[template.id,projectId]]);
    function collect(v: any) { if (!v || typeof v !== 'object') return; if (v.id && !ids.has(v.id)) ids.set(v.id,`DEMO24-${21+i}-${v.id}`); Object.values(v).forEach(collect); }
    Object.values(groups).forEach(collect);
    const name = i < 4 ? hospitalReferences[i].name : PUNE_DEMO_HOSPITALS[i - 4];
    function clone(v: any): any { if (typeof v === 'string') return ids.get(v) ?? (v === template.name ? name : v); if (Array.isArray(v)) return v.map(clone); if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k,x]) => [k,clone(x)])); return v; }
    for (const [key, rows] of Object.entries(groups)) result[key].push(...clone(rows));
    const p = result.projects[result.projects.length - 1];
    p.description = i < 4
      ? `Government hospital reference: ${hospitalReferences[i].source}. Construction activity, dates, finances, coordinates and photos are illustrative sample records, not verified information about this facility.`
      : 'Fictional hospital project for demonstration. Construction activity, dates, finances, coordinates and photos are illustrative sample records, not verified information about a real facility.';
    for (const key of ['users','contractors']) result[key] = result[key].map((u: any) => u.assignedProjectIds?.includes(template.id) ? { ...u, assignedProjectIds: [...u.assignedProjectIds, projectId] } : u);
  }
  return result;
}

/** Add demo samples on hydration without replacing edited records or resetting storage. */
export function mergeDemoSamples<T extends { projects: any[] }>(saved: T, seed: T): T {
  const result: any = { ...saved };
  const renamed = new Map<string, string>();
  result.projects = saved.projects.map((project: any) => {
    const reference = seed.projects.find((p: any) => p.id === project.id);
    if (!reference || !project.id.startsWith('DEMO24-PRJ-')) return project;
    const legacyName = /^Demo Hospital (21|22|23|24) /.test(project.name);
    const prefixedName = project.name === `Demo ${reference.name}`;
    if (!legacyName && !prefixedName) return project;
    renamed.set(project.name, reference.name);
    return { ...project, name: reference.name, description: reference.description };
  });
  for (const [key,value] of Object.entries(seed)) {
    if (!Array.isArray(value) || !Array.isArray((saved as any)[key])) continue;
    const existing = result[key]; const ids = new Set(existing.map((v: any) => v.id));
    result[key] = [...existing, ...value.filter((v: any) => typeof v.id === 'string' && v.id.startsWith('DEMO24-') && !ids.has(v.id))];
  }
  for (const key of ['users','contractors']) if (result[key]) result[key] = result[key].map((u: any) => {
    const base = (seed as any)[key].find((v: any) => v.id === u.id);
    return base ? { ...u, assignedProjectIds: [...new Set([...(u.assignedProjectIds ?? []), ...base.assignedProjectIds.filter((id: string) => id.startsWith('DEMO24-'))])] } : u;
  });
  if (result.auditLog) result.auditLog = result.auditLog.map((entry: any) => renamed.has(entry.project) ? { ...entry, project: renamed.get(entry.project) } : entry);
  return result;
}
