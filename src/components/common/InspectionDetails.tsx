import { useState } from 'react';
import { toast } from 'sonner';
import { useStore } from '../../store/useStore';
import { canReviewInspection } from '../../lib/inspectionAccess';
import type { Inspection } from '../../types';
import { Dialog, DialogContent, DialogFooter } from '../ui/overlays';
import { Button, StatusBadge } from '../ui/primitives';
import { uiText } from '../../i18n/ui';
import { formatDate } from '../../lib/utils';
import { ROLE_LABELS } from '../../lib/constants';

export function InspectionDetails({ inspection, onClose }: { inspection?: Inspection; onClose: () => void }) {
  const state = useStore();
  const [reason, setReason] = useState('');
  function review(decision: 'APPROVE' | 'RAISE_DEFECT' | 'REVERIFY') {
    try { state.reviewInspection(inspection!.id, decision, reason); setReason(''); toast.success(uiText('Review saved.')); onClose(); }
    catch (error) { toast.error(uiText((error as Error).message)); }
  }
  return <Dialog open={!!inspection} onOpenChange={open => !open && onClose()}>{inspection && <DialogContent title={uiText('Inspection details')} description={`${inspection.id} · ${uiText(inspection.category.replace(/_/g, ' '))}`} size="lg">
    <div className="space-y-4 text-sm">
      {!!inspection.photos?.length && <section><h3 className="font-semibold">{uiText('Site photos')}</h3><div className="grid grid-cols-2 gap-2">{inspection.photos.map(photo => <img key={photo.mediaKey} src={photo.dataUrl} alt={uiText('Inspection site evidence')} className="w-full rounded" />)}</div></section>}
      {!!inspection.reviewHistory?.length && <section><h3 className="font-semibold">{uiText('Review history')}</h3>{inspection.reviewHistory.map((entry, index) => <details key={index} className="rounded border p-3"><summary>{uiText(entry.decision.replace('_', ' '))} · {entry.reviewer} · {formatDate(entry.date)}</summary><p className="whitespace-pre-wrap">{entry.comments}</p><p>{entry.findings}</p>{entry.items.map(item => <p key={item.id}>{item.requirement}: {item.measurement} · {item.result} · {item.remarks}</p>)}<div className="grid grid-cols-2 gap-2">{entry.photos.map(photo => <img key={photo.mediaKey} src={photo.dataUrl} alt={uiText('Previous submission evidence')} />)}</div></details>)}</section>}
      {inspection.status === 'PENDING_REVIEW' && canReviewInspection(state.currentUser) && <section className="space-y-3 rounded border p-3"><label className="block">{uiText('Review comments / reason')}<textarea className="ui-input w-full" value={reason} onChange={e => setReason(e.target.value)} /></label><p className="text-xs text-slate-500">{uiText('Approval requires passing findings and traceable quality evidence in Contract controls. Reverify returns this inspection to JE for fresh evidence.')}</p><div className="flex flex-wrap gap-2"><Button disabled={inspection.overallResult !== 'PASS'} onClick={() => review('APPROVE')}>{uiText('Approve')}</Button><Button variant="outline" onClick={() => review('RAISE_DEFECT')}>{uiText('Raise defect')}</Button><Button variant="outline" onClick={() => review('REVERIFY')}>{uiText('Reverify')}</Button></div></section>}
      <div className="flex flex-wrap gap-2"><StatusBadge status={inspection.status}/><StatusBadge status={inspection.overallResult}/></div>
      <dl className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">{[['Inspector',inspection.inspector],['Scheduled',formatDate(inspection.scheduledDate)],['Completed',inspection.completedDate ? formatDate(inspection.completedDate) : 'Not completed'],['Score',inspection.status === 'COMPLETED' ? `${inspection.score}%` : 'Not available']].map(([label,value]) => <div key={label}><dt className="text-xs text-slate-500">{uiText(label)}</dt><dd className="mt-1 break-words font-medium">{uiText(value)}</dd></div>)}</dl>
      <dl className="grid gap-3 sm:grid-cols-2">{[['Assigned role', inspection.assignedRole ? ROLE_LABELS[inspection.assignedRole] : ''], ['Time', inspection.scheduledTime], ['Site location', inspection.location], ['Inspection scope', inspection.scope], ['Required documents', inspection.requiredDocuments], ['Inspection instructions', inspection.instructions]].map(([label, value]) => value && <div key={label}><dt className="text-xs text-slate-500">{uiText(label)}</dt><dd className="whitespace-pre-wrap break-words">{value}</dd></div>)}</dl>
      {!!inspection.assignmentHistory?.length && <section><h3 className="mb-2 font-semibold">{uiText('Assignment history')}</h3><ul className="space-y-2">{inspection.assignmentHistory.map((entry, index) => <li key={`${entry.date}-${index}`} className="rounded border p-3"><p>{entry.assignedToName} · {uiText(ROLE_LABELS[entry.role])}</p><p className="text-xs text-slate-500">{entry.assignedBy} · {formatDate(entry.date)}</p><p className="whitespace-pre-wrap break-words">{entry.reason}</p></li>)}</ul></section>}
      <section><h3 className="mb-2 font-semibold">{uiText('Inspector Comments')}</h3><p className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 p-4">{inspection.comments || uiText('No comments recorded yet.')}</p></section>
      <section><h3 className="mb-2 font-semibold">{uiText('Inspection checklist')}</h3>{!inspection.items.length && <p className="text-slate-500">{uiText('No checklist results recorded yet.')}</p>}<div className="space-y-3">{inspection.items.map(item => <div key={item.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><p className="font-medium">{uiText(item.requirement)}</p><StatusBadge status={item.result}/></div>{[['Measurement',item.measurement],['Standard',item.standard],['Evidence',item.evidence],['Remarks',item.remarks]].map(([label,value]) => value && <p key={label} className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600"><strong>{uiText(label)}: </strong>{uiText(value)}</p>)}</div>)}</div></section>
    </div><DialogFooter><Button variant="outline" onClick={onClose}>{uiText('Close')}</Button></DialogFooter>
  </DialogContent>}</Dialog>;
}
