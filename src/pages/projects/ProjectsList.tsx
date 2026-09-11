import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, LayoutGrid, List as ListIcon, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { Button, Card, CardContent, Input, ProgressBar, StatusBadge, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogFooter } from '../../components/ui/overlays';
import { ALL_DISTRICTS, MAHARASHTRA_HIERARCHY } from '../../lib/constants';
import { optionsWithCounts, type FilterOption } from '../../lib/cascadingFilters';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import { toast } from 'sonner';
import type { Project, ProjectType } from '../../types';

const PROJECT_TYPES: ProjectType[] = ['District Hospital', 'Rural Hospital', 'Sub-District Hospital', 'Women & Child Hospital', 'Tribal Area Hospital', 'Community Health Centre'];
const CAN_SANCTION_PROJECTS = ['COMMISSIONER', 'REGIONAL_DIRECTOR', 'CIVIL_SURGEON'];

type QuickFilter = 'AT_RISK' | 'DELAYED' | 'NO_RECENT_EVIDENCE' | 'QUALITY_ISSUE' | 'APPROVAL_PENDING' | 'FINANCE_ISSUE' | 'HANDOVER_DUE';

function riskStatus(p: Project): 'High Risk' | 'Medium Risk' | 'Low Risk' | 'Closed' {
  return p.status === 'DELAYED' ? 'High Risk' : p.status === 'AT_RISK' ? 'Medium Risk' : p.status === 'COMPLETED' ? 'Closed' : 'Low Risk';
}

export function ProjectsList() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentUser = useStore((s) => s.currentUser);
  const { projects: scopedProjects, scopeLabel, isStatewide } = useProjectScope();
  const contractors = useStore((s) => s.contractors);
  const photos = useStore((s) => s.photos);
  const inspections = useStore((s) => s.inspections);
  const approvals = useStore((s) => s.approvals);
  const bills = useStore((s) => s.bills);
  const addProject = useStore((s) => s.addProject);
  const canCreateProject = !!currentUser && CAN_SANCTION_PROJECTS.includes(currentUser.role);

  // Cascading hierarchy: Scheme -> Facility Type -> Region -> District -> Project/Hospital.
  const [scheme, setScheme] = useState('ALL');
  const [facilityType, setFacilityType] = useState('ALL');
  const [region, setRegion] = useState('ALL');
  const [district, setDistrict] = useState('ALL');
  const [projectId, setProjectId] = useState('ALL');
  const [quickFilters, setQuickFilters] = useState<Set<QuickFilter>>(new Set());
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'District Hospital' as ProjectType, district: ALL_DISTRICTS[0], taluka: '', bedCount: 100, sanctionedBudget: 1000 });

  // Each level's options are computed from the set already narrowed by every level above it —
  // this is what makes the dropdowns interdependent instead of independent.
  const schemeOptions = useMemo(() => optionsWithCounts(scopedProjects, (p) => p.scheme, 'All Schemes'), [scopedProjects]);
  const afterScheme = useMemo(() => scheme === 'ALL' ? scopedProjects : scopedProjects.filter((p) => p.scheme === scheme), [scopedProjects, scheme]);

  const facilityOptions = useMemo(() => optionsWithCounts(afterScheme, (p) => p.facilityType, 'All Facility Types'), [afterScheme]);
  const afterFacility = useMemo(() => facilityType === 'ALL' ? afterScheme : afterScheme.filter((p) => p.facilityType === facilityType), [afterScheme, facilityType]);

  const regionOptions = useMemo(() => optionsWithCounts(afterFacility, (p) => p.division, 'All Regions'), [afterFacility]);
  const afterRegion = useMemo(() => region === 'ALL' ? afterFacility : afterFacility.filter((p) => p.division === region), [afterFacility, region]);

  const districtOptions = useMemo(() => optionsWithCounts(afterRegion, (p) => p.district, 'All Districts'), [afterRegion]);
  const afterDistrict = useMemo(() => district === 'ALL' ? afterRegion : afterRegion.filter((p) => p.district === district), [afterRegion, district]);

  const projectOptions = useMemo(() => optionsWithCounts(afterDistrict, (p) => p.id, 'All Hospitals / Projects').map((o) => ({
    ...o, label: o.value === 'ALL' ? o.label : afterDistrict.find((p) => p.id === o.value)?.name ?? o.value,
  })), [afterDistrict]);
  const afterProject = useMemo(() => projectId === 'ALL' ? afterDistrict : afterDistrict.filter((p) => p.id === projectId), [afterDistrict, projectId]);

  // If an upstream filter changes and narrows the set so far that a downstream selection no
  // longer exists in it, reset that downstream filter back to ALL rather than showing a stale,
  // now-invalid selection.
  useEffect(() => { if (facilityType !== 'ALL' && !facilityOptions.some((o) => o.value === facilityType)) setFacilityType('ALL'); }, [facilityOptions, facilityType]);
  useEffect(() => { if (region !== 'ALL' && !regionOptions.some((o) => o.value === region)) setRegion('ALL'); }, [regionOptions, region]);
  useEffect(() => { if (district !== 'ALL' && !districtOptions.some((o) => o.value === district)) setDistrict('ALL'); }, [districtOptions, district]);
  useEffect(() => { if (projectId !== 'ALL' && !projectOptions.some((o) => o.value === projectId)) setProjectId('ALL'); }, [projectOptions, projectId]);

  const now = Date.now();
  const filtered = useMemo(() => afterProject.filter((p) => {
    if (quickFilters.size === 0) return true;
    return Array.from(quickFilters).every((qf) => {
      switch (qf) {
        case 'AT_RISK': return p.status === 'AT_RISK';
        case 'DELAYED': return p.status === 'DELAYED';
        case 'NO_RECENT_EVIDENCE': {
          const last = photos.filter((ph) => ph.projectId === p.id).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
          return p.status !== 'COMPLETED' && (!last || (now - new Date(last.date).getTime()) / 86400000 > 14);
        }
        case 'QUALITY_ISSUE': return inspections.some((i) => i.projectId === p.id && i.overallResult === 'FAIL');
        case 'APPROVAL_PENDING': return approvals.some((a) => a.projectId === p.id && a.status === 'PENDING');
        case 'FINANCE_ISSUE': return bills.some((b) => b.projectId === p.id && !['PAID', 'REJECTED'].includes(b.status) && (now - new Date(b.submittedDate).getTime()) / 86400000 > 30);
        case 'HANDOVER_DUE': return p.status !== 'COMPLETED' && (new Date(p.plannedCompletionDate).getTime() - now) / 86400000 <= 30 && (new Date(p.plannedCompletionDate).getTime() - now) / 86400000 >= 0;
        default: return true;
      }
    });
  }), [afterProject, quickFilters, photos, inspections, approvals, bills, now]);

  function toggleQuickFilter(qf: QuickFilter) {
    setQuickFilters((prev) => { const next = new Set(prev); if (next.has(qf)) next.delete(qf); else next.add(qf); return next; });
  }

  function submitCreate() {
    if (!form.name.trim()) { toast.error('Project name is required.'); return; }
    const p = addProject({
      name: form.name, type: form.type, district: form.district, taluka: form.taluka || 'HQ Taluka',
      division: MAHARASHTRA_HIERARCHY.find((d) => d.districts.some((x) => x.district === form.district))?.division ?? 'Pune Division',
      bedCount: form.bedCount, sanctionedBudget: form.sanctionedBudget * 100000,
      lat: 20 + Math.random() * 60, lng: 20 + Math.random() * 60,
    });
    toast.success(`Project "${p.name}" created.`);
    setCreateOpen(false);
    navigate(`/projects/${p.id}`);
  }

  const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
    { key: 'AT_RISK', label: 'At Risk' },
    { key: 'DELAYED', label: 'Delayed' },
    { key: 'NO_RECENT_EVIDENCE', label: 'No Recent Evidence' },
    { key: 'QUALITY_ISSUE', label: 'Quality Issue' },
    { key: 'APPROVAL_PENDING', label: 'Approval Pending' },
    { key: 'FINANCE_ISSUE', label: 'Finance Issue' },
    { key: 'HANDOVER_DUE', label: 'Handover Due' },
  ];

  return (
    <div>
      <PageHeader
        title={t('pages.projects.title')}
        description={t('pages.projects.desc', { shown: filtered.length, total: scopedProjects.length })}
        actions={<>
          <div className="flex overflow-hidden rounded-md border border-slate-300">
            <button onClick={() => setView('grid')} className={`p-1.5 ${view === 'grid' ? 'bg-navy-700 text-white' : 'bg-white text-slate-500'}`}><LayoutGrid size={15} /></button>
            <button onClick={() => setView('list')} className={`p-1.5 ${view === 'list' ? 'bg-navy-700 text-white' : 'bg-white text-slate-500'}`}><ListIcon size={15} /></button>
          </div>
          {canCreateProject && <Button onClick={() => setCreateOpen(true)}><Plus size={15} /> Add Project</Button>}
        </>}
      />

      {!isStatewide && (
        <div className="mb-4 rounded-md border border-navy-200 bg-navy-50 px-3 py-2 text-xs font-medium text-navy-700">
          Showing projects within your jurisdiction: {scopeLabel}
        </div>
      )}

      <Card className="mb-4">
        <CardContent className="p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Scheme → Facility Type → Region → District → Hospital / Project</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <CascadeSelect label="Scheme" value={scheme} onChange={setScheme} options={schemeOptions} />
            <CascadeSelect label="Facility Type" value={facilityType} onChange={setFacilityType} options={facilityOptions} />
            <CascadeSelect label="Region" value={region} onChange={setRegion} options={regionOptions} />
            <CascadeSelect label="District" value={district} onChange={setDistrict} options={districtOptions} />
            <CascadeSelect label="Hospital / Project" value={projectId} onChange={setProjectId} options={projectOptions} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {QUICK_FILTERS.map((qf) => (
              <button
                key={qf.key}
                onClick={() => toggleQuickFilter(qf.key)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                  quickFilters.has(qf.key) ? 'border-navy-600 bg-navy-700 text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                )}
              >
                {qf.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {view === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const risk = riskStatus(p);
            return (
              <Card key={p.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate(`/projects/${p.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug text-slate-800">{p.name}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{p.taluka}, {p.district} · {p.facilityType}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full border border-navy-200 bg-navy-50 px-2 py-0.5 text-[10px] font-medium text-navy-700">{p.scheme}</span>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', risk === 'High Risk' ? 'border-red-200 bg-red-50 text-red-700' : risk === 'Medium Risk' ? 'border-amber-200 bg-amber-50 text-amber-700' : risk === 'Closed' ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{risk}</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="mb-1 flex justify-between text-[11px] text-slate-500"><span>Physical Progress</span><span className="font-semibold">{p.physicalProgress}%</span></div>
                      <ProgressBar value={p.physicalProgress} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="text-slate-500">{formatCurrency(p.sanctionedBudget)} · {p.contractorId && contractors.find((c) => c.id === p.contractorId)?.company}</span>
                    <span className="flex items-center gap-1 font-medium text-navy-700">View <ArrowRight size={12} /></span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <p className="col-span-full py-16 text-center text-sm text-slate-400">No projects match the selected filters.</p>}
        </div>
      ) : (
        <Card>
          <Table>
            <THead>
              <Tr><Th>Project</Th><Th>Facility</Th><Th>Scheme</Th><Th>District</Th><Th>Contractor</Th><Th>Physical</Th><Th>Financial</Th><Th>Status</Th><Th>Risk</Th><Th>Original Completion</Th><Th>Current Completion</Th></Tr>
            </THead>
            <TBody>
              {filtered.map((p) => (
                <Tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)}>
                  <Td className="max-w-[200px] truncate font-medium text-slate-800">{p.name}</Td>
                  <Td>{p.facilityType}</Td>
                  <Td>{p.scheme}</Td>
                  <Td>{p.district}</Td>
                  <Td className="max-w-[140px] truncate">{contractors.find((c) => c.id === p.contractorId)?.company ?? '—'}</Td>
                  <Td>{p.physicalProgress}%</Td>
                  <Td>{p.financialProgress}%</Td>
                  <Td><StatusBadge status={p.status} /></Td>
                  <Td>{riskStatus(p)}</Td>
                  <Td>{formatDate(p.originalCompletionDate)}</Td>
                  <Td className={p.plannedCompletionDate !== p.originalCompletionDate ? 'font-medium text-amber-600' : ''}>{formatDate(p.plannedCompletionDate)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent title="Add New Hospital Project" description="Register a new project under administrative sanction.">
          <div className="space-y-3">
            <LField label="Project Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sub-District Hospital — Osmanabad" /></LField>
            <div className="grid grid-cols-2 gap-3">
              <LField label="Project Type">
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ProjectType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROJECT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </LField>
              <LField label="District">
                <Select value={form.district} onValueChange={(v) => setForm({ ...form, district: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ALL_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </LField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <LField label="Taluka"><Input value={form.taluka} onChange={(e) => setForm({ ...form, taluka: e.target.value })} placeholder="Taluka" /></LField>
              <LField label="Bed Count"><Input type="number" value={form.bedCount} onChange={(e) => setForm({ ...form, bedCount: +e.target.value })} /></LField>
            </div>
            <LField label="Sanctioned Budget (₹ Lakh)"><Input type="number" value={form.sanctionedBudget} onChange={(e) => setForm({ ...form, sanctionedBudget: +e.target.value })} /></LField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate}>Create Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CascadeSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: FilterOption[] }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium text-slate-500">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label} [{o.count}]</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function LField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-1 text-xs font-medium text-slate-600">{label}</p>{children}</div>;
}
