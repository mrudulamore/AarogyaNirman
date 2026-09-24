import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import type { InspectionCategory, Project } from '../../types';
import { useStore } from '../../store/useStore';
import { computeProjectScope } from '../../lib/projectScope';
import { INSPECTION_CATEGORIES } from '../../lib/constants';
import { uiText } from '../../i18n/ui';
import { formatDate } from '../../lib/utils';
import { Button, Card, CardContent, CardHeader, CardTitle, StatusBadge } from '../ui/primitives';
import { Dialog, DialogContent, DialogFooter } from '../ui/overlays';
import { InspectionAllocation } from './InspectionAllocation';

export function InspectionRequests({ project }: { project?: Project }) {
  const state = useStore();
  const user = state.currentUser;
  const hospitals = computeProjectScope(user, state.projects, state.contractors).projects;
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const requestsId = useId();
  const [projectId, setProjectId] = useState(project?.id ?? hospitals[0]?.id ?? '');
  const [category, setCategory] = useState<InspectionCategory>('STRUCTURAL');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [scope, setScope] = useState('');
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const ee = user?.role === 'EXECUTIVE_ENGINEER';
  const contractor = user?.role === 'CONTRACTOR';
  const compact = ee && !project;
  if (!project && !ee) return null;
  const requests = state.inspectionAppointments.filter(a => hospitals.some(p => p.id === a.projectId) &&
    (!project || a.projectId === project.id) && (project || !ee || a.status === 'REQUESTED'))
    .sort((a, b) => Number(b.status === 'REQUESTED') - Number(a.status === 'REQUESTED') || b.date.localeCompare(a.date));
  const selected = hospitals.find(p => p.id === projectId);
  const request = requests.find(a => a.id === reviewId);
  const reviewProject = hospitals.find(p => p.id === request?.projectId);
  const input = 'ui-input mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    try {
      state.requestAppointment({ projectId: selected.id, inspectionType: category, date, time,
        site: location.trim() || selected.name, remarks: scope.trim(), requestedBy: '', requestedByRole: 'CONTRACTOR', attendees: [], requiredDocuments: [] });
      setOpen(false); setScope(''); setLocation(''); setDate(''); setTime('');
      toast.success(uiText('Inspection request sent to EE.'));
    } catch (error) { toast.error(uiText((error as Error).message)); }
  }
  return <Card className="mb-4" data-testid="inspection-requests">
    {compact ? <button type="button" aria-expanded={expanded} aria-controls={requestsId} onClick={() => setExpanded(value => !value)} className="flex min-h-12 w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold text-navy-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-govblue-500">
      <span>{uiText('Inspection requests')}</span>
      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">{requests.length}</span>
      <ChevronDown size={18} aria-hidden="true" className={`ml-auto shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
    </button> : <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{uiText('Inspection requests')}{ee ? ` (${requests.filter(a => a.status === 'REQUESTED').length})` : ''}</CardTitle>
      {contractor && <Button disabled={!hospitals.length} onClick={() => setOpen(true)}>{uiText('Request site inspection')}</Button>}
    </div></CardHeader>}
    <div id={requestsId} hidden={compact && !expanded}>
    <CardContent className="space-y-3">
      {!requests.length && <p className="text-sm text-slate-500">{uiText('No inspection requests.')}</p>}
      {requests.map(a => <div key={a.id} data-request-id={a.id} className="rounded-lg border border-slate-200 p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{state.projects.find(p => p.id === a.projectId)?.name}</p><StatusBadge status={a.status} /></div>
        <p>{uiText(a.inspectionType.replace(/_/g, ' '))} · {formatDate(a.date)} · {a.time}</p>
        <p>{uiText('Requested By')}: {a.requestedBy}</p>
        <p>{uiText('Site location')}: {a.site}</p>
        {a.remarks && <p className="whitespace-pre-wrap">{uiText('Inspection scope')}: {a.remarks}</p>}
        {a.assignedBy && <p>{uiText('Assigned by')}: {a.assignedBy}</p>}
        {a.assignedInspector && <p>{uiText('Junior Engineer')}: {a.assignedInspector}</p>}
        {a.reviewReason && <p className="whitespace-pre-wrap text-amber-800">{uiText('Review comments / reason')}: {a.reviewReason}</p>}
        {ee && a.status === 'REQUESTED' && !a.linkedInspectionId && <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => setReviewId(a.id)}>{uiText('Review and assign JE')}</Button>
          <Button variant="outline" onClick={() => { setDeclineId(a.id); setReason(''); }}>{uiText('Decline request')}</Button>
        </div>}
      </div>)}
    </CardContent>
    </div>
    {request && reviewProject && <InspectionAllocation project={reviewProject} request={request} onClose={() => setReviewId(null)} />}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent title={uiText('Request site inspection')} size="lg">
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">{uiText('Hospital location')}<select required disabled={!!project} className={input} value={projectId} onChange={e => setProjectId(e.target.value)}>{hospitals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <p className="text-sm">{uiText('Executive Engineer')}: {state.users.find(u => u.id === selected?.executiveEngineerId)?.name ?? '—'}</p>
        <label className="block text-sm">{uiText('Inspection Type')}<select className={input} value={category} onChange={e => setCategory(e.target.value as InspectionCategory)}>{INSPECTION_CATEGORIES.map(c => <option key={c} value={c}>{uiText(c.replace(/_/g, ' '))}</option>)}</select></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">{uiText('Preferred date')}<input required type="date" className={input} value={date} onChange={e => setDate(e.target.value)} /></label>
          <label className="block text-sm">{uiText('Time')}<input required type="time" className={input} value={time} onChange={e => setTime(e.target.value)} /></label>
        </div>
        <label className="block text-sm">{uiText('Site location / building / floor')}<input className={input} placeholder={selected?.name} value={location} onChange={e => setLocation(e.target.value)} /></label>
        <label className="block text-sm">{uiText('Inspection scope')}<textarea required className={input} value={scope} onChange={e => setScope(e.target.value)} /></label>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>{uiText('Cancel')}</Button><Button type="submit">{uiText('Send request to EE')}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
    <Dialog open={!!declineId} onOpenChange={open => !open && setDeclineId(null)}><DialogContent title={uiText('Decline request')}>
      <form onSubmit={event => { event.preventDefault(); try { state.declineInspectionRequest(declineId!, reason); setDeclineId(null); toast.success(uiText('Review saved.')); } catch (error) { toast.error(uiText((error as Error).message)); } }} className="space-y-3">
        <label className="block text-sm">{uiText('Review comments / reason')}<textarea required className={input} value={reason} onChange={e => setReason(e.target.value)} /></label>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setDeclineId(null)}>{uiText('Cancel')}</Button><Button type="submit">{uiText('Decline request')}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
  </Card>;
}
