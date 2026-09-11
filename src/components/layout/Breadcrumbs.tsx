import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
      <Link to="/dashboard" className="flex items-center text-slate-400 hover:text-navy-700"><Home size={13} /></Link>
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight size={12} className="text-slate-300" />
          {c.to ? <Link to={c.to} className="hover:text-navy-700">{c.label}</Link> : <span className="font-medium text-slate-700">{c.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
