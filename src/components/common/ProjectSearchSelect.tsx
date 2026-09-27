import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { uiText } from '../../i18n/ui';

export function ProjectSearchSelect({ projects, query, selectedId, onSearch, onSelect }: {
  projects: { id: string; name: string; district: string }[];
  query: string;
  selectedId: string;
  onSearch: (value: string) => void;
  onSelect: (id: string) => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const options = projects.filter(p => selectedId || [p.name, p.id, p.district].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const choices = [{ id: '', name: uiText('All projects'), district: '' }, ...options];
  function choose(id: string) { onSelect(id); setOpen(false); setActive(-1); }
  return <div className="relative min-w-0 flex-[2] basis-64" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <label htmlFor={listId + '-input'} className="text-xs font-medium text-slate-600">{uiText('Search projects')}</label>
    <div className="mt-1 flex h-11 items-center rounded-xl border border-slate-200 bg-white">
      <input id={listId + '-input'} role="combobox" aria-label={uiText('Search projects')} aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined} autoComplete="off" placeholder={uiText('All projects')} value={selectedId ? projects.find(p => p.id === selectedId)?.name ?? query : query} onFocus={() => setOpen(true)} onChange={event => { onSearch(event.target.value); setOpen(true); setActive(-1); }} onKeyDown={event => {
        if (event.key === 'Escape') { setOpen(false); return; }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive(index => event.key === 'ArrowDown' ? Math.min(index + 1, choices.length - 1) : Math.max(index - 1, 0)); }
        if (event.key === 'Enter' && open && active >= 0) { event.preventDefault(); choose(choices[active].id); }
      }} className="w-full min-w-0 flex-1 rounded-l-xl bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
      <button type="button" aria-label={uiText('Select project')} aria-expanded={open} aria-controls={listId} onClick={() => { setOpen(!open); setActive(-1); }} className="flex h-11 w-11 shrink-0 items-center justify-center text-blue-800"><ChevronDown size={18} /></button>
    </div>
    {open && <div id={listId} role="listbox" aria-label={uiText('Projects')} className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-blue-100 bg-white p-1 shadow-xl">
      {choices.map((p,index) => <div key={p.id} id={`${listId}-${index}`} role="option" aria-selected={selectedId === p.id} onMouseDown={event => event.preventDefault()} onClick={() => choose(p.id)} className={`cursor-pointer rounded-lg px-3 py-3 text-sm ${active === index || selectedId === p.id ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-50'}`}><p className="break-words font-medium">{p.name}</p>{p.id && <p className="mt-1 text-xs text-slate-500">{p.id} · {uiText(p.district)}</p>}</div>)}
      {!options.length && <p className="px-3 py-3 text-xs text-slate-500">{uiText('No projects match these filters.')}</p>}
    </div>}
  </div>;
}
