import { useState } from 'react';
import { toast } from 'sonner';
import type { SitePhoto } from '../../types';
import { useStore } from '../../store/useStore';
import { ROLE_LABELS } from '../../lib/constants';
import { Button, Textarea, StatusBadge } from '../ui/primitives';
import { uiText } from '../../i18n/ui';

export function PhotoReview({ photo }: { photo: SitePhoto }) {
  const user = useStore(s => s.currentUser);
  const review = useStore(s => s.reviewPhoto);
  const [note, setNote] = useState('');
  const canReview = user && ['PROJECT_MANAGER','EXECUTIVE_ENGINEER'].includes(user.role) && photo.uploadedById !== user.id && (photo.uploadedById || photo.uploadedBy !== user.name);
  function submit(status: 'APPROVED'|'REJECTED') { try { review(photo.id,status,note);setNote('');toast.success(uiText('Photo review recorded.')); } catch(e) { toast.error(uiText((e as Error).message)); } }
  return <section className="mt-4 space-y-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
    <h3 className="text-sm font-semibold">{uiText('Photo approval')}</h3>
    <StatusBadge status={photo.review?.status ?? 'PENDING'} label={uiText(photo.review?.status === 'APPROVED' ? 'Approved by reviewer' : photo.review?.status === 'REJECTED' ? 'Rejected by reviewer' : 'Awaiting review')}/>
    <p className="text-xs text-slate-600">{uiText('GPS location and photo approval are separate checks. Project managers and supervising executive engineers review site evidence.')}</p>
    {(photo.reviewHistory ?? (photo.review ? [photo.review] : [])).map((r,i) => <div key={i} className="rounded-xl bg-white p-3 text-xs"><p className="font-semibold">{r.reviewerName} · {uiText(ROLE_LABELS[r.reviewerRole])}</p><p>{uiText(r.status)} · {new Date(r.reviewedAt).toLocaleString()}</p><p className="mt-1">{r.note}</p></div>)}
    {!photo.dataUrl && <p className="text-xs text-amber-800">{uiText('Illustrative demo photo. Not eligible for evidence approval.')}</p>}
    {canReview && photo.dataUrl && <><label className="block text-xs font-medium">{uiText('Review comments')}<Textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={1000}/></label><div className="flex gap-2"><Button disabled={note.trim().length<5} onClick={()=>submit('APPROVED')}>{uiText('Approve photo')}</Button><Button variant="outline" disabled={note.trim().length<5} onClick={()=>submit('REJECTED')}>{uiText('Reject photo')}</Button></div></>}
  </section>;
}
