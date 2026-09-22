import { Camera, ClipboardPlus, HardHat, MapPin, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { uiText } from '../../i18n/ui';
import { useProjectScope } from '../../lib/scope';

const actions = [
  { label: 'Site photo', description: 'Camera, GPS, time and project', tab: 'field evidence', icon: Camera },
  { label: 'Progress update', description: 'Work completed, labour and material', tab: 'progress', icon: HardHat },
  { label: 'Report defect', description: 'Record severity and corrective action', tab: 'defects', icon: ClipboardPlus },
  { label: 'Field note', description: 'Capture a location-linked site note', tab: 'monthly', icon: Mic },
];

export function CapturePage() {
  const { projects } = useProjectScope();
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const project = projects.find(item => item.id === projectId) ?? projects[0];
  return <div className="mobile-workspace mx-auto max-w-3xl space-y-5"><header className="mobile-page-hero"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-blue-200">{uiText('Field tools')}</p><h1>{uiText('Capture')}</h1><p>{uiText('Evidence is saved with project, time and location.')}</p></div><MapPin className="text-blue-100" size={30}/></header>
    {!project ? <p className="rounded-2xl bg-white p-5 text-sm text-slate-600">{uiText('No project is assigned to this account.')}</p> : <><label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{uiText('Project')}<select className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800" value={project.id} onChange={event => setProjectId(event.target.value)}>{projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="grid gap-3">{actions.map(({ label, description, tab, icon: Icon }) => <button type="button" key={tab} onClick={() => navigate(`/projects/${project.id}?tab=${encodeURIComponent(tab)}`)} className="flex min-h-[82px] items-center gap-4 rounded-[22px] border border-slate-200 bg-white p-4 text-left shadow-sm"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white"><Icon size={22}/></span><span><strong className="block text-[15px] text-slate-900">{uiText(label)}</strong><small className="mt-1 block text-xs leading-5 text-slate-500">{uiText(description)}</small></span></button>)}</div></>}
  </div>;
}
