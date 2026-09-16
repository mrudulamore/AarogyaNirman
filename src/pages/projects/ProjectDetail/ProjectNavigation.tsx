import { useEffect, useRef, useState } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { ChevronLeft, ChevronRight, LayoutDashboard, CalendarDays, FileSignature, ListChecks, Files, LayoutGrid, Flag, Package, Camera, MapPinned, Users, HardHat, ShieldCheck, Wallet, CheckCircle, History, Landmark } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '../../../components/ui/overlays';
import type { Project360Tab } from '../../../lib/projectTabAccess';
import { cn } from '../../../lib/utils';

const SECTION_ICONS = {
  overview: LayoutDashboard,
  timeline: CalendarDays,
  tender: FileSignature,
  boq: ListChecks,
  governance: Landmark, milestones: Flag, materials: Package, progress: ListChecks,
  photos: Camera, 'field evidence': MapPinned, team: Users, contractor: HardHat, workers: Users,
  quality: ShieldCheck, inspections: ShieldCheck, 'safety & commissioning': ShieldCheck,
  defects: ShieldCheck, risks: ShieldCheck, finance: Wallet, approvals: CheckCircle,
  documents: Files, handover: CheckCircle, audit: History,
};

const SECTION_GROUPS = [
  { label: 'Overview', keys: ['overview', 'governance'] },
  { label: 'Schedule', keys: ['timeline', 'tender', 'milestones'] },
  { label: 'Work & Materials', keys: ['boq', 'materials', 'progress'] },
  { label: 'Evidence', keys: ['photos', 'field evidence'] },
  { label: 'People', keys: ['team', 'contractor', 'workers'] },
  { label: 'Quality & Safety', keys: ['quality', 'inspections', 'safety & commissioning', 'defects', 'risks'] },
  { label: 'Finance & Approvals', keys: ['finance', 'approvals'] },
  { label: 'Documents & Handover', keys: ['documents', 'handover', 'audit'] },
];

export function ProjectNavigation({ tabs, value, onSelect }: { tabs: Project360Tab[]; value: string; onSelect: (value: string) => void }) {
  const [jumpOpen, setJumpOpen] = useState(false);
  const activeIndex = tabs.findIndex((tab) => tab.value === value);
  const activeTab = tabs[activeIndex];
  const ActiveIcon = SECTION_ICONS[value as keyof typeof SECTION_ICONS] ?? Files;
  const railRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const tabKeys = tabs.map((tab) => tab.value).join('|');

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const update = () => setEdges({ left: rail.scrollLeft > 2, right: rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 2 });
    const observer = new ResizeObserver(update);
    observer.observe(rail);
    if (rail.firstElementChild) observer.observe(rail.firstElementChild);
    rail.addEventListener('scroll', update, { passive: true });
    update();
    return () => { observer.disconnect(); rail.removeEventListener('scroll', update); };
  }, [tabKeys]);

  useEffect(() => {
    const rail = railRef.current;
    const selected = rail?.querySelector<HTMLElement>('[data-state="active"]');
    if (!rail || !selected) return;
    const item = selected.getBoundingClientRect();
    const viewport = rail.getBoundingClientRect();
    if (item.left < viewport.left) rail.scrollLeft -= viewport.left - item.left + 8;
    else if (item.right > viewport.right) rail.scrollLeft += item.right - viewport.right + 8;
  }, [value, tabKeys]);

  function scroll(direction: number) {
    const rail = railRef.current;
    if (rail) rail.scrollBy({ left: direction * rail.clientWidth * 0.7, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  return (
    <Dialog open={jumpOpen} onOpenChange={setJumpOpen}>
    <div className="sticky top-0 z-20 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur-md md:static">
      <div className="flex min-w-0 items-center gap-2">
        <button type="button" aria-label="Previous project section" disabled={activeIndex <= 0} onClick={() => onSelect(tabs[activeIndex - 1].value)} className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-25 md:hidden"><ChevronLeft size={18} /></button>
      <div className="hidden min-w-0 flex-1 items-center gap-1 md:flex">
        <button type="button" aria-label="Scroll project sections left" disabled={!edges.left} onClick={() => scroll(-1)} className="flex h-11 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-500"><ChevronLeft size={18} /></button>
        <div ref={railRef} className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsPrimitive.List aria-label="Project sections" className="flex w-max min-w-full flex-nowrap gap-1" loop>
            {tabs.map((tab) => {
              const Icon = SECTION_ICONS[tab.value as keyof typeof SECTION_ICONS] ?? Files;
              return <TabsPrimitive.Trigger key={tab.value} value={tab.value}
                className={cn('flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition-colors sm:px-4 sm:text-sm',
                  'text-slate-500 hover:bg-slate-50 hover:text-navy-700 data-[state=active]:bg-navy-50 data-[state=active]:text-navy-800 data-[state=active]:shadow-[inset_0_-2px_0_0_#265aa0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-500')}>
                <Icon size={16} aria-hidden="true" />{tab.label}
              </TabsPrimitive.Trigger>;
            })}
          </TabsPrimitive.List>
        </div>
        <button type="button" aria-label="Scroll project sections right" disabled={!edges.right} onClick={() => scroll(1)} className="flex h-11 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-500"><ChevronRight size={18} /></button>
      </div>
      <DialogTrigger asChild>
        <button type="button" aria-label={`Jump to Section, current section ${activeTab?.label ?? ''}, ${activeIndex + 1} of ${tabs.length}`} className="flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left shadow-sm hover:bg-navy-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-500 md:order-first md:min-h-11 md:shrink-0 md:flex-none md:border-transparent md:bg-gradient-to-br md:from-navy-700 md:to-sky-500 md:text-white md:shadow-none md:hover:brightness-105">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-navy-700 to-sky-500 text-white md:hidden"><ActiveIcon size={19} /></span>
          <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800 md:hidden">{activeTab?.label}</span>
          <span className="shrink-0 text-[11px] tabular-nums text-slate-400 md:hidden">{activeIndex + 1}/{tabs.length}</span>
          <LayoutGrid size={17} className="shrink-0 text-navy-700 md:text-white" />
        </button>
      </DialogTrigger>
      <button type="button" aria-label="Next project section" disabled={activeIndex < 0 || activeIndex >= tabs.length - 1} onClick={() => onSelect(tabs[activeIndex + 1].value)} className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-25 md:hidden"><ChevronRight size={18} /></button>
      </div>
      <div className="mt-2 flex gap-1 px-1 pb-1" aria-label="Section position">
        {tabs.map((tab) => <button key={tab.value} type="button" onClick={() => onSelect(tab.value)} title={tab.label} aria-label={`Go to ${tab.label}`} aria-current={tab.value === value ? 'step' : undefined} className="group flex h-5 min-w-0 flex-1 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-500">
          <span className={cn('h-1 w-full rounded-full transition-colors', tab.value === value ? 'bg-navy-600' : 'bg-slate-100 group-hover:bg-navy-200')} />
        </button>)}
      </div>
    </div>
    <DialogContent title="Jump to Section" description={`${tabs.length} sections available for your role`} size="lg">
      <div className="space-y-6">
        {SECTION_GROUPS.map((group) => {
          const available = group.keys.flatMap((key) => tabs.filter((tab) => tab.value === key));
          if (!available.length) return null;
          return <section key={group.label} aria-label={group.label}>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group.label}</h3>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {available.map((tab) => {
                const Icon = SECTION_ICONS[tab.value as keyof typeof SECTION_ICONS] ?? Files;
                return <button key={tab.value} type="button" aria-pressed={tab.value === value} onClick={() => { onSelect(tab.value); setJumpOpen(false); }} className={cn('flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-500', tab.value === value ? 'border-navy-300 bg-navy-50 text-navy-800' : 'border-slate-200 text-slate-600 hover:border-navy-200 hover:bg-slate-50')}>
                  <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg', tab.value === value ? 'bg-gradient-to-br from-navy-700 to-sky-500 text-white' : 'bg-slate-100 text-slate-500')}><Icon size={21} /></span>
                  {tab.label}
                </button>;
              })}
            </div>
          </section>;
        })}
      </div>
    </DialogContent>
    </Dialog>
  );
}
