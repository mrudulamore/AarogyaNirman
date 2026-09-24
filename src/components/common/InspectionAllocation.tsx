import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Inspection, InspectionAppointment, InspectionCategory, Project, Role } from '../../types';
import { useStore } from '../../store/useStore';
import { computeProjectScope } from '../../lib/projectScope';
import { inspectionAccounts, inspectionAssignmentRoles } from '../../lib/inspectionAccess';
import { INSPECTION_CATEGORIES, ROLE_LABELS } from '../../lib/constants';
import { activeControls } from '../../lib/projectControls';
import { uiText } from '../../i18n/ui';
import { Dialog, DialogContent, DialogFooter } from '../ui/overlays';
import { Button } from '../ui/primitives';

export function InspectionAllocation({ project, inspection, request, onClose }: { project: Project; inspection?: Inspection; request?: InspectionAppointment; onClose: () => void }) {
  const state = useStore();
  const navigate = useNavigate();
  const hospitals = computeProjectScope(state.currentUser, state.projects, state.contractors).projects;
  const [projectId, setProjectId] = useState(project.id);
  const selectedProject = state.projects.find(p => p.id === projectId) ?? project;
  const roles = inspectionAssignmentRoles(state.currentUser);
  const [role, setRole] = useState<Role>(roles.includes(inspection?.assignedRole as Role) ? inspection!.assignedRole! : roles[0]);
  const [assigneeId, setAssigneeId] = useState(inspection?.assignedToId ?? project.siteEngineerId);
  const [category, setCategory] = useState<InspectionCategory>(request?.inspectionType ?? 'STRUCTURAL');
  const [date, setDate] = useState(request?.date ?? '');
  const [time, setTime] = useState(request?.time ?? '');
  const [scope, setScope] = useState(request?.remarks ?? '');
  const [documents, setDocuments] = useState(request?.requiredDocuments.join(', ') ?? '');
  const [instructions, setInstructions] = useState('');
  const [drawingId, setDrawingId] = useState('');
  const [reason, setReason] = useState('');
  const assignees = inspectionAccounts(state.users, state.projects, state.contractors).filter(user => user.role === role && computeProjectScope(user, state.projects, state.contractors).projectIds.has(projectId));
  const drawings = activeControls(state, projectId).filter(r => (r.kind === 'DOCUMENT' && r.fields.documentType === 'Drawing') || (r.kind === 'PROCUREMENT' && r.category === 'Approved drawings / estimate'));
  const inputClass = 'ui-input min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm';
  function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      if (inspection) state.assignInspection(inspection.id, assigneeId, reason);
      else state.scheduleInspection({ projectId, sourceRequestId: request?.id, category, scheduledDate: date, scheduledTime: time, assignedToId: assigneeId, assignedRole: role, inspector: '', location: request?.site || selectedProject.name, scope: scope.trim(), requiredDocuments: documents.trim(), instructions: instructions.trim(), drawingId: drawingId || undefined, comments: '' });
      toast.success(uiText(inspection ? 'Inspection reassigned.' : 'Inspection allocated.'));
      onClose();
      if (!inspection && projectId !== project.id) navigate(`/projects/${projectId}?tab=inspections`);
    } catch (error) { toast.error(uiText((error as Error).message)); }
  }
  return <Dialog open onOpenChange={open => !open && onClose()}><DialogContent title={uiText(inspection ? 'Reassign inspection' : 'Add inspection')} description={selectedProject.name} size="lg">
    <form onSubmit={submit} className="space-y-4">
      {request && <p className="text-sm">{uiText('Requested By')}: {request.requestedBy}</p>}
      {!inspection && <label className="block text-sm">{uiText('Hospital location')}<select required disabled={!!request} className={inputClass} value={projectId} onChange={e => {
        const hospital = hospitals.find(p => p.id === e.target.value);
        if (!hospital) return;
        setProjectId(hospital.id);
        setRole('DEPUTY_ENGINEER');
        setAssigneeId(hospital.siteEngineerId);
        setDrawingId('');
      }}>{hospitals.map(hospital => <option key={hospital.id} value={hospital.id}>{hospital.name}</option>)}</select></label>}
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
        <label className="block text-sm">{uiText('Inspection scope')}<textarea required className={inputClass} value={scope} onChange={e => setScope(e.target.value)} /></label>
        <label className="block text-sm">{uiText('Approved drawing revision')}<select className={inputClass} value={drawingId} onChange={e => setDrawingId(e.target.value)}><option value="">{uiText('Not referenced')}</option>{drawings.map(d => <option key={d.id} value={d.id}>{d.reference} / {d.fields.version}</option>)}</select></label>
        <label className="block text-sm">{uiText('Required documents')}<textarea className={inputClass} value={documents} onChange={e => setDocuments(e.target.value)} /></label>
        <label className="block text-sm">{uiText('Inspection instructions')}<textarea className={inputClass} value={instructions} onChange={e => setInstructions(e.target.value)} /></label>
      </>}
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>{uiText('Cancel')}</Button><Button type="submit" disabled={!assignees.length}>{uiText(inspection ? 'Reassign' : 'Allocate inspection')}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
