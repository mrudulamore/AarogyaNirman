import { DeadlineBadge } from '../../components/common/DeadlineBadge';
import { uiText, useUiLanguage } from '../../i18n/ui';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, List as ListIcon, ArrowRight, ChevronRight, Landmark, Building2, Map, MapPinned, Hospital, RotateCcw } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { Card, CardContent, ProgressBar, StatusBadge, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { optionsWithCounts, type FilterOption } from '../../lib/cascadingFilters';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import type { Project } from '../../types';


type QuickFilter = 'AT_RISK' | 'DELAYED' | 'NO_RECENT_EVIDENCE' | 'QUALITY_ISSUE' | 'APPROVAL_PENDING' | 'FINANCE_ISSUE' | 'HANDOVER_DUE';

function riskStatus(p: Project): 'High Risk' | 'Medium Risk' | 'Low Risk' | 'Closed' {
  return p.status === 'DELAYED' ? 'High Risk' : p.status === 'AT_RISK' ? 'Medium Risk' : p.status === 'COMPLETED' ? 'Closed' : 'Low Risk';
}

export function ProjectsList() {
  useUiLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { projects: scopedProjects, scopeLabel, isStatewide } = useProjectScope();
  const contractors = useStore((s) => s.contractors);
  const photos = useStore((s) => s.photos);
  const inspections = useStore((s) => s.inspections);
  const approvals = useStore((s) => s.approvals);
  const bills = useStore((s) => s.bills);

  // Cascading hierarchy: Scheme -> Facility Type -> Region -> District -> Project/Hospital.
  const [scheme, setScheme] = useState('ALL');
  const [facilityType, setFacilityType] = useState('ALL');
  const [region, setRegion] = useState(searchParams.get('region') ?? 'ALL');
  useEffect(() => { setRegion(searchParams.get('region') ?? 'ALL'); }, [searchParams]);
  const [district, setDistrict] = useState('ALL');
  const [projectId, setProjectId] = useState('ALL');
  const [quickFilters, setQuickFilters] = useState<Set<QuickFilter>>(new Set());
  const [view, setView] = useState<'grid' | 'list'>('grid');

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
      <p className="mb-3 text-xs font-medium text-blue-700">{uiText("Demonstration portfolio · fictional project records")}</p>
      <PageHeader
        title={uiText(t('pages.projects.title'))}
        description={uiText(t('pages.projects.desc', { shown: filtered.length, total: scopedProjects.length }))}
        actions={<>
          <div className="flex overflow-hidden rounded-md border border-slate-300">
            <button onClick={() => setView('grid')} className={`p-1.5 ${view === 'grid' ? 'bg-navy-700 text-white' : 'bg-white text-slate-500'}`}><LayoutGrid size={15} /></button>
            <button onClick={() => setView('list')} className={`p-1.5 ${view === 'list' ? 'bg-navy-700 text-white' : 'bg-white text-slate-500'}`}><ListIcon size={15} /></button>
          </div>
        </>}
      />

      {!isStatewide && (
        <div className="mb-4 rounded-md border border-navy-200 bg-navy-50 px-3 py-2 text-xs font-medium text-navy-700">{uiText("Showing projects within your jurisdiction: ")}{uiText(scopeLabel)}
        </div>
      )}

      <Card className="mb-4 overflow-hidden">
        <div className="flex items-center justify-between bg-gradient-to-r from-navy-50 to-white px-4 py-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-navy-700">
            <Landmark size={12} />{uiText(" Jurisdictional Drill-Down")}</p>
          {(scheme !== 'ALL' || facilityType !== 'ALL' || region !== 'ALL' || district !== 'ALL' || projectId !== 'ALL') && (
            <button
              onClick={() => { setScheme('ALL'); setFacilityType('ALL'); setRegion('ALL'); setDistrict('ALL'); setProjectId('ALL'); }}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-navy-700"
            >
              <RotateCcw size={11} />{uiText(" Reset filters")}</button>
          )}
        </div>
        <CardContent className="p-4 pt-3">
          <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
            <CascadeSelect icon={Landmark} label={uiText("Scheme")} value={scheme} onChange={setScheme} options={schemeOptions} />
            <ChevronRight size={16} className="hidden shrink-0 self-center text-slate-300 lg:block" />
            <CascadeSelect icon={Building2} label={uiText("Facility Type")} value={facilityType} onChange={setFacilityType} options={facilityOptions} />
            <ChevronRight size={16} className="hidden shrink-0 self-center text-slate-300 lg:block" />
            <CascadeSelect icon={Map} label={uiText("Region")} value={region} onChange={setRegion} options={regionOptions} />
            <ChevronRight size={16} className="hidden shrink-0 self-center text-slate-300 lg:block" />
            <CascadeSelect icon={MapPinned} label={uiText("District")} value={district} onChange={setDistrict} options={districtOptions} />
            <ChevronRight size={16} className="hidden shrink-0 self-center text-slate-300 lg:block" />
            <CascadeSelect icon={Hospital} label={uiText("Hospital / Project")} value={projectId} onChange={setProjectId} options={projectOptions} />
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
                {uiText(qf.label)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {view === 'grid' ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((p) => {
            const risk = riskStatus(p);
            return (
              <Link key={p.id} to={`/projects/${p.id}`} className="hospital-project-card group" aria-label={`${uiText('View project')}: ${p.name}`}>
                <div className="hospital-card-banner">
                  <div className="hospital-card-symbol"><Hospital size={22} strokeWidth={1.5} /></div>
                  <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold uppercase tracking-widest text-blue-100">{uiText(p.district)}</p><p className="mt-1 text-xs text-blue-200">{p.id}</p></div>
                  <StatusBadge status={p.status} />
                  <div className="hospital-card-lines" aria-hidden="true" />
                </div>
                <div className="hospital-card-body">
                  <div className="flex flex-wrap gap-2"><span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{uiText(p.scheme)}</span><span className={cn('rounded-md px-2.5 py-1 text-xs font-medium', risk === 'High Risk' ? 'bg-red-50 text-red-700' : risk === 'Medium Risk' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600')}>{uiText(risk)}</span></div>
                  <h2 className="mt-4 text-lg font-semibold leading-snug tracking-tight text-slate-900 group-hover:text-blue-800">{p.name}</h2>
                  <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-slate-500"><MapPinned size={15} className="mt-0.5 shrink-0"/>{uiText(p.taluka)} · {uiText(p.facilityType)} · {p.bedCount} {uiText('beds')}</p>
                  <div className="hospital-card-metrics">
                    <div><p className="text-xs font-medium text-slate-500">{uiText('Sanctioned Budget')}</p><p className="mt-1 text-xl font-semibold tracking-tight text-blue-950">{formatCurrency(p.sanctionedBudget)}</p></div>
                    <div className="text-right"><p className="text-xs font-medium text-slate-500">{uiText('Physical Progress')}</p><p className="mt-1 text-xl font-semibold tracking-tight text-blue-700">{p.physicalProgress}<span className="ml-0.5 text-sm text-slate-500">%</span></p></div>
                    <div className="col-span-2"><ProgressBar value={p.physicalProgress} className="h-1.5" /></div>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-xs"><span className="text-slate-500">{uiText('Planned Completion')}</span><span className="font-semibold text-slate-700">{formatDate(p.plannedCompletionDate)}</span></div><DeadlineBadge project={p} />
                </div>
                <div className="hospital-card-footer"><div className="min-w-0"><p className="text-[11px] text-slate-500">{uiText('Contractor')}</p><p className="mt-1 truncate text-xs font-semibold text-slate-700">{contractors.find(c => c.id === p.contractorId)?.company ?? '—'}</p></div><span className="hospital-card-open" aria-hidden="true"><ArrowRight size={20}/></span></div>
              </Link>
            );
          })}
          {filtered.length === 0 && <p className="col-span-full py-16 text-center text-sm text-slate-400">{uiText("No projects match the selected filters.")}</p>}
        </div>
      ) : (
        <Card>
          <Table>
            <THead>
              <Tr><Th>{uiText("Project")}</Th><Th>{uiText("Facility")}</Th><Th>{uiText("Scheme")}</Th><Th>{uiText("District")}</Th><Th>{uiText("Contractor")}</Th><Th>{uiText("Physical")}</Th><Th>{uiText("Financial")}</Th><Th>{uiText("Status")}</Th><Th>{uiText("Risk")}</Th><Th>{uiText("Original Completion")}</Th><Th>{uiText("Current Completion")}</Th></Tr>
            </THead>
            <TBody>
              {filtered.map((p) => (
                <Tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)}>
                  <Td className="max-w-[200px] truncate font-medium text-slate-800">{p.name}</Td>
                  <Td>{uiText(p.facilityType)}</Td>
                  <Td>{uiText(p.scheme)}</Td>
                  <Td>{uiText(p.district)}</Td>
                  <Td className="max-w-[140px] truncate">{contractors.find((c) => c.id === p.contractorId)?.company ?? '—'}</Td>
                  <Td>{p.physicalProgress}%</Td>
                  <Td>{p.financialProgress}%</Td>
                  <Td><StatusBadge status={p.status} /></Td>
                  <Td>{uiText(riskStatus(p))}</Td>
                  <Td>{uiText(formatDate(p.originalCompletionDate))}</Td>
                  <Td className={p.plannedCompletionDate !== p.originalCompletionDate ? 'font-medium text-amber-600' : ''}>{uiText(formatDate(p.plannedCompletionDate))}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

    </div>
  );
}

function CascadeSelect({ label, value, onChange, options, icon: Icon }: { label: string; value: string; onChange: (v: string) => void; options: FilterOption[]; icon: any }) {
  useUiLanguage();
  const isActive = value !== 'ALL';
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1 flex items-center gap-1 text-[11px] font-medium text-slate-500"><Icon size={11} className={isActive ? 'text-navy-700' : 'text-slate-400'} /> {uiText(label)}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn('transition-colors', isActive && 'border-navy-300 bg-navy-50/60 font-medium text-navy-800')}><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{uiText(o.label)} <span className="text-slate-400">[{o.count}]</span></SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
