import { useState } from 'react';
import { toast } from 'sonner';
import { useStore } from '../../store/useStore';
import { uiText } from '../../i18n/ui';
import { Button, Label, NativeSelect } from '../ui/primitives';
import { Dialog, DialogContent, DialogFooter } from '../ui/overlays';
import type { User } from '../../types';

export function KycApplication({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const current = useStore(s => s.currentUser);
  const user = useStore(s => s.users.find(u => u.id === current?.id));
  const submit = useStore(s => s.submitKycApplication);
  const [documentType,setDocumentType] = useState<NonNullable<User['kycApplication']>['documentType']>('EMPLOYEE_ID');
  const [confirmed,setConfirmed] = useState(false);
  const locked = !!user?.kycApplication && user.identityReview?.status !== 'REJECTED';
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent title={uiText('KYC application')}>
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{uiText('Submit your profile for manual identity review. Present the selected document to your administrator; do not enter identity document numbers here.')}</p>
      <div className="rounded-xl bg-blue-50 p-4 text-sm"><p className="font-semibold">{user?.name}</p><p>{user?.email}</p><p>{user?.phone}</p></div>
      {user?.kycApplication && <p role="status" className="text-sm">{uiText('Application status')}: {uiText(user.identityReview?.status ?? 'PENDING')}{user.identityReview?.reference && <> · {user.identityReview.reference}</>}</p>}
      {!user && <p>{uiText('KYC applications are available for registered staff accounts.')}</p>}
      {user && !locked && <><Label>{uiText('Document type')}<NativeSelect value={documentType} onChange={e=>setDocumentType(e.target.value as typeof documentType)}><option value="EMPLOYEE_ID">{uiText('Employee ID')}</option><option value="CONTRACTOR_REGISTRATION">{uiText('Contractor registration')}</option><option value="GOVERNMENT_ID">{uiText('Government identity document')}</option></NativeSelect></Label>
      <label className="flex gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{uiText('I confirm my profile is accurate and will present the document for manual verification.')}</label></>}
      <p className="text-xs text-slate-500">{uiText('Applications and reviews are stored on this device. This is manual KYC, not automated eKYC.')}</p>
    </div>
    <DialogFooter><Button variant="outline" onClick={()=>onOpenChange(false)}>{uiText('Close')}</Button>{user && !locked && <Button disabled={!confirmed} onClick={()=>{try {submit(documentType,confirmed);setConfirmed(false);toast.success(uiText('KYC application submitted'));}catch(e){toast.error(uiText((e as Error).message));}}}>{uiText('Submit application')}</Button>}</DialogFooter>
  </DialogContent></Dialog>;
}
