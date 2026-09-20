import { useState } from 'react';
import { toast } from 'sonner';
import { UserPlus, ShieldCheck } from 'lucide-react';
import type { Role, User } from '../../types';
import { useStore } from '../../store/useStore';
import { ROLE_LABELS } from '../../lib/constants';
import { Button, Input, Label, NativeSelect } from '../../components/ui/primitives';
import { Dialog, DialogContent, DialogFooter } from '../../components/ui/overlays';
import { uiText } from '../../i18n/ui';

export function AddUserButton() {
  const state = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', department: '', division: '', district: '', role: 'DEPUTY_ENGINEER' as Role, contractorId: '', assignedProjectIds: [] as string[] });
  if (state.currentUser?.role !== 'SUPERADMIN') return null;
  function save(e: React.FormEvent) {
    e.preventDefault();
    try { state.addStaffUser({ ...form, assignedProjectIds: ['DEPUTY_ENGINEER','EXECUTIVE_ENGINEER','PROJECT_MANAGER'].includes(form.role) ? form.assignedProjectIds : [], designation: ROLE_LABELS[form.role], contractorId: form.role === 'CONTRACTOR' ? form.contractorId : undefined }); setOpen(false); setForm({ name: '', email: '', phone: '', department: '', division: '', district: '', role: 'DEPUTY_ENGINEER', contractorId: '', assignedProjectIds: [] }); toast.success(uiText('User added. Identity review is pending.')); }
    catch(e) { toast.error(uiText((e as Error).message)); }
  }
  return <><Button onClick={() => setOpen(true)}><UserPlus size={17}/>{uiText('Add person')}</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent title={uiText('Add person')} description={uiText('Create an account, assign project access, and request identity review.')}>
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">{(['name','email','phone','department'] as const).map(key => <label key={key} className="text-xs font-medium capitalize">{uiText(key)}<Input required type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}/></label>)}</div>
      <Label>{uiText('Role')}<NativeSelect value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Role })}>{Object.entries(ROLE_LABELS).filter(([r]) => r !== 'WORKFORCE').map(([r,label]) => <option key={r} value={r}>{uiText(label)}</option>)}</NativeSelect></Label>
      {form.role === 'REGIONAL_DIRECTOR' && <Label>{uiText('Division')}<NativeSelect required value={form.division} onChange={e => setForm({ ...form, division: e.target.value })}><option value="">{uiText('Select division')}</option>{[...new Set(state.projects.map(p => p.division))].map(d => <option key={d}>{d}</option>)}</NativeSelect></Label>}
      {form.role === 'CIVIL_SURGEON' && <Label>{uiText('District')}<NativeSelect required value={form.district} onChange={e => setForm({ ...form, district: e.target.value })}><option value="">{uiText('Select district')}</option>{[...new Set(state.projects.map(p => p.district))].map(d => <option key={d}>{d}</option>)}</NativeSelect></Label>}
      {form.role === 'CONTRACTOR' && <Label>{uiText('Contractor firm')}<NativeSelect required value={form.contractorId} onChange={e => setForm({ ...form, contractorId: e.target.value })}><option value="">{uiText('Select contractor')}</option>{state.contractors.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}</NativeSelect></Label>}
      {['DEPUTY_ENGINEER','EXECUTIVE_ENGINEER','PROJECT_MANAGER'].includes(form.role) && <fieldset><legend className="mb-2 text-xs font-semibold">{uiText('Assigned projects')}</legend><div className="max-h-40 space-y-2 overflow-auto rounded-xl border p-3">{state.projects.map(p => <label key={p.id} className="flex gap-2 text-xs"><input type="checkbox" checked={form.assignedProjectIds.includes(p.id)} onChange={e => setForm({ ...form, assignedProjectIds: e.target.checked ? [...form.assignedProjectIds,p.id] : form.assignedProjectIds.filter(id => id !== p.id) })}/>{p.name}</label>)}</div></fieldset>}
      <p className="text-xs text-slate-500">{uiText('Demo accounts and reviews are saved on this device. Sign in using the email address. Identity starts as pending; manual review is not provider-backed eKYC. Workforce accounts are managed in the Workforce module.')}</p>
      <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>{uiText('Cancel')}</Button><Button type="submit">{uiText('Create account')}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog></>;
}

export function IdentityReview({ user }: { user: User }) {
  const currentUser = useStore(s => s.currentUser);
  const review = useStore(s => s.reviewStaffIdentity);
  const [open,setOpen] = useState(false); const [reference,setReference] = useState(''); const [checked,setChecked] = useState(false);
  const status = user.identityReview?.status ?? 'PENDING';
  function submit(result: 'VERIFIED'|'REJECTED') { try { review(user.id,result,reference);setOpen(false);setReference('');setChecked(false);toast.success(uiText('Identity review recorded.')); } catch(e) { toast.error(uiText((e as Error).message)); } }
  return <div className="space-y-1"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-800' : status === 'REJECTED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}><ShieldCheck size={13}/>{uiText(status === 'VERIFIED' ? 'Verified · manual review' : status === 'REJECTED' ? 'Review rejected' : 'Verification pending')}</span>
    {currentUser?.role === 'SUPERADMIN' && currentUser.id !== user.id && <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>{uiText('Review identity')}</Button>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent title={uiText('Manual identity review')} description={user.name}>
      <p className="mb-4 text-sm text-slate-600">{uiText('Record a completed document check. This does not perform Aadhaar, biometric, or provider-backed eKYC. Do not enter identity document numbers here.')}</p>
      {user.identityReview?.reviewedAt && <p className="mb-3 text-xs text-slate-500">{uiText('Previous review')}: {user.identityReview.reviewedAt} · {user.identityReview.reference}</p>}
      <Label>{uiText('Internal review reference')}<Input value={reference} onChange={e => setReference(e.target.value)} maxLength={120}/></Label>
      <label className="mt-4 flex gap-2 text-sm"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}/>{uiText('I have checked the identity documents and matched them to this person.')}</label>
      <DialogFooter><Button variant="outline" disabled={reference.trim().length < 5} onClick={() => submit('REJECTED')}>{uiText('Reject')}</Button><Button disabled={!checked || reference.trim().length < 5} onClick={() => submit('VERIFIED')}>{uiText('Mark manually verified')}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}
