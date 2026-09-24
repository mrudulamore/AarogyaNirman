import { useState } from 'react';
import { toast } from 'sonner';
import type { Inspection, InspectionCategory, Project, Role } from '../../types';
import { useStore } from '../../store/useStore';
import { computeProjectScope } from '../../lib/projectScope';
import { inspectionAccounts, inspectionAssignmentRoles } from '../../lib/inspectionAccess';
import { INSPECTION_CATEGORIES, ROLE_LABELS } from '../../lib/constants';
import { activeControls } from '../../lib/projectControls';
import { uiText } from '../../i18n/ui';
import { Dialog, DialogContent, DialogFooter } from '../ui/overlays';
import { Button } from '../ui/primitives';

export function InspectionAllocation({ project, inspection, onClose }: { project: Project; inspection?: Inspection; onClose: () => void }) {
  const state = useStore();
  const roles = inspectionAssignmentRoles(state.currentUser);
  const [role, setRole] = useState<Role>(roles.includes(inspection?.assignedRole as Role) ? inspection!.assignedRole! : roles[0]);
  const [assigneeId, setAssigneeId] = useState(inspection?.assignedToId ?? '');
  const [category, setCategory] = useState<InspectionCategory>('STRUCTURAL');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [scope, setScope] = useState('');
  const [documents, setDocuments] = useState('');
  const [instructions, setInstructions] = useState('');
  const [drawingId, setDrawingId] = useState('');
  const [reason, setReason] = useState('');
  const assignees = inspectionAccounts(state.users, state.projects, state.contractors).filter(user => user.role === role && computeProjectScope(user, state.projects, state.contractors).projectIds.has(project.id));
  const drawings = activeControls(state, project.id).filter(r => (r.kind === 'DOCUMENT' && r.fields.documentType === 'Drawing') || (r.kind === 'PROCUREMENT' && r.category === 'Approved drawings / estimate'));
  const inputClass = 'ui-input min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm';
  function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      if (inspection) state.assignInspection(inspection.id, assigneeId, reason);
      else state.scheduleInspection({ projectId: project.id, category, scheduledDate: date, scheduledTime: time, assignedToId: assigneeId, assignedRole: role, inspector: '', location: location.trim(), scope: scope.trim(), requiredDocuments: documents.trim(), instructions: instructions.trim(), drawingId: drawingId || undefined, comments: '' });
      toast.success(uiText(inspection ? 'Inspection reassigned.' : 'Inspection allocated.'));
      onClose();
    } catch (error) { toast.error(uiText((error as Error).message)); }
  }
  return <Dialog open onOpenChange={open => !open && onClose()}><DialogContent title={uiText(inspection ? 'Reassign inspection' : 'Add inspection')} description={project.name} size="lg">
    <form onSubmit={submit} className="space-y-4">
      {!inspection && <label className="block text-sm">{uiText('Inspection Type')}<select className={inputClass} value={category} onChange={e => setCategory(e.target.value as InspectionCategory)}>{INSPECTION_CATEGORIES.map(c => <option key={c} value={c}>{uiText(c.replace(/_/g, ' '))}</option>)}</select></label>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">{uiText('Assign to role')}<select required className={inputClass} value={role} onChange={e => { setRole(e.target.value as Role); setAssigneeId(''); }}>{roles.map(r => <option key={r} value={r}>{uiText(ROLE_LABELS[r])}</option>)}</select></label>
        <label className="block text-sm">{uiText('Assign to person')}<select required className={inputClass} value={assigneeId} onChange={e => setAssigneeId(e.target.value)}><option value="">{uiText('Select assignee')}</option>{assignees.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
      </div>
      {!assignees.length && <p role="status" className="text-sm text-amber-700">{uiText('No eligible users in this role are assigned to this project.')}</p>}
      {inspection ? <label className="block text-sm">{uiText('Reason for reassignment')}<textarea required className={inputClass} value={reason} onChange={e => setReason(e.target.value)} /></label> : <>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">{uiText('Scheduled Date')}<input type="date" required className={inputClass} value={date} onChange={e => setDate(e.target.value)} /></label>
          <label className="block text-sm">{uiText('Time')}<input type="time" required className={inputClass} value={time} onChange={e => setTime(e.target.value)} /></label>
        </div>
        <label className="block text-sm">{uiText('Site location / building / floor')}<input required className={inputClass} value={location} onChange={e => setLocation(e.target.value)} /></label>
        <label className="block text-sm">{uiText('Inspection scope')}<textarea required className={inputClass} value={scope} onChange={e => setScope(e.target.value)} /></label>
        <label className="block text-sm">{uiText('Approved drawing revision')}<select className={inputClass} value={drawingId} onChange={e => setDrawingId(e.target.value)}><option value="">{uiText('Not referenced')}</option>{drawings.map(d => <option key={d.id} value={d.id}>{d.reference} / {d.fields.version}</option>)}</select></label>
        <label className="block text-sm">{uiText('Required documents')}<textarea className={inputClass} value={documents} onChange={e => setDocuments(e.target.value)} /></label>
        <label className="block text-sm">{uiText('Inspection instructions')}<textarea className={inputClass} value={instructions} onChange={e => setInstructions(e.target.value)} /></label>
      </>}
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>{uiText('Cancel')}</Button><Button type="submit" disabled={!assignees.length}>{uiText(inspection ? 'Reassign' : 'Allocate inspection')}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
