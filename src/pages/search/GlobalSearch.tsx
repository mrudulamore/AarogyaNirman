import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search as SearchIcon } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, StatusBadge } from '../../components/ui/primitives';
import { formatCurrency } from '../../lib/utils';

export function GlobalSearch() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const currentUser = useStore((s) => s.currentUser);
  const canSeeWorkers = currentUser?.role === 'DEPUTY_ENGINEER';
  const projects = useStore((s) => s.projects);
  const contractors = useStore((s) => s.contractors);
  const workers = useStore((s) => s.workers);
  const users = useStore((s) => s.users);
  const bills = useStore((s) => s.bills);
  const inspections = useStore((s) => s.inspections);
  const defects = useStore((s) => s.defects);
  const documents = useStore((s) => s.documents);

  const query = (params.get('q') ?? '').toLowerCase();

  const results = useMemo(() => {
    if (!query) return null;
    return {
      projects: projects.filter((p) => p.name.toLowerCase().includes(query) || p.district.toLowerCase().includes(query)).slice(0, 8),
      contractors: contractors.filter((c) => c.company.toLowerCase().includes(query)).slice(0, 8),
      workers: workers.filter((w) => w.name.toLowerCase().includes(query)).slice(0, 8),
      engineers: users.filter((u) => u.name.toLowerCase().includes(query)).slice(0, 8),
      bills: bills.filter((b) => b.billNumber.toLowerCase().includes(query)).slice(0, 8),
      inspections: inspections.filter((i) => i.category.toLowerCase().includes(query.replace(/ /g, '_'))).slice(0, 8),
      defects: defects.filter((d) => d.id.toLowerCase().includes(query) || d.description.toLowerCase().includes(query)).slice(0, 8),
      documents: documents.filter((d) => d.name.toLowerCase().includes(query)).slice(0, 8),
    };
  }, [query, projects, contractors, workers, users, bills, inspections, defects, documents]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setParams({ q });
  }

  return (
    <div>
      <PageHeader title={t('pages.search.title')} description={t('pages.search.desc')} />

      <form onSubmit={submit} className="mb-5 flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2.5">
        <SearchIcon size={16} className="text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search everything…" className="w-full text-sm outline-none" autoFocus />
      </form>

      {!results && <p className="py-10 text-center text-sm text-slate-400">Enter a search term to begin.</p>}

      {results && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ResultCard title="Projects" empty="No matching projects">
            {results.projects.map((p) => (
              <ResultRow key={p.id} onClick={() => navigate(`/projects/${p.id}`)} primary={p.name} secondary={`${p.district} · ${formatCurrency(p.sanctionedBudget)}`} badge={<StatusBadge status={p.status} />} />
            ))}
          </ResultCard>
          <ResultCard title="Contractors" empty="No matching contractors">
            {results.contractors.map((c) => (
              <ResultRow key={c.id} onClick={() => navigate('/contractors')} primary={c.company} secondary={c.regId} />
            ))}
          </ResultCard>
          {canSeeWorkers && (
            <ResultCard title="Workers" empty="No matching workers">
              {results.workers.map((w) => (
                <ResultRow key={w.id} onClick={() => navigate('/workers')} primary={w.name} secondary={w.role} />
              ))}
            </ResultCard>
          )}
          <ResultCard title="Officers & Engineers" empty="No matching officers">
            {results.engineers.map((u) => (
              <ResultRow key={u.id} onClick={() => navigate('/staff')} primary={u.name} secondary={u.designation} />
            ))}
          </ResultCard>
          <ResultCard title="Bills" empty="No matching bills">
            {results.bills.map((b) => (
              <ResultRow key={b.id} onClick={() => navigate(`/projects/${b.projectId}?tab=bills`)} primary={b.billNumber} secondary={formatCurrency(b.netPayable)} badge={<StatusBadge status={b.status} />} />
            ))}
          </ResultCard>
          <ResultCard title="Defects" empty="No matching defects">
            {results.defects.map((d) => (
              <ResultRow key={d.id} onClick={() => navigate(`/projects/${d.projectId}?tab=defects`)} primary={d.id} secondary={d.description.slice(0, 60)} badge={<StatusBadge status={d.status} />} />
            ))}
          </ResultCard>
          <ResultCard title="Documents" empty="No matching documents">
            {results.documents.map((d) => (
              <ResultRow key={d.id} onClick={() => navigate(`/projects/${d.projectId}?tab=documents`)} primary={d.name} secondary={d.type} />
            ))}
          </ResultCard>
        </div>
      )}
    </div>
  );
}

function ResultCard({ title, children, empty }: { title: string; children: React.ReactNode; empty: string }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-1 p-2">
        {hasChildren ? children : <p className="px-3 py-4 text-center text-xs text-slate-400">{empty}</p>}
      </CardContent>
    </Card>
  );
}

function ResultRow({ primary, secondary, onClick, badge }: { primary: string; secondary?: string; onClick?: () => void; badge?: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-slate-50">
      <div>
        <p className="text-xs font-medium text-slate-800">{primary}</p>
        {secondary && <p className="text-[10.5px] text-slate-400">{secondary}</p>}
      </div>
      {badge}
    </button>
  );
}
