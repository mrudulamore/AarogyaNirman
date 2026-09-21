import { computeProjectScope } from '../../../../lib/scope';
import { drawingWarning } from '../../../../lib/pendingWork';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore } from '../../../../store/useStore';
import { CERTIFICATES, PROCUREMENT, CONTROL_FIELDS, KIND_LABELS, activeControls, workOrderGaps, handoverGaps, actualTransactions, validControl, type ControlKind } from '../../../../lib/projectControls';
import { saveBillFiles } from '../../../../lib/billAttachments';
import { todayDate } from '../../../../lib/fundDisbursal';
import type { Project } from '../../../../types';
import { uiText, useUiLanguage } from '../../../../i18n/ui';
import { Button, Card, CardContent, Input, Textarea, NativeSelect, StatusBadge } from '../../../../components/ui/primitives';
import { BillEvidence } from './BillEvidence';
import { formatCurrency, formatDate } from '../../../../lib/utils';

const LABELS: Record<string, string> = { responsibleUserId: 'Responsible officer', responsibleRole: 'Responsible officer role', drawingId: 'Approved drawing revision', drawingNumber: 'Drawing number', authority: 'Approving authority', issueDate: 'Issue date', expiryDate: 'Expiry date', applicability: 'Applicability', reason: 'Reason / conditions', portalReference: 'Portal / source reference', version: 'Version', amount: 'Amount', contractClause: 'Contract clause', boqItemId: 'BOQ item', quantityDelta: 'Additional quantity', rate: 'Approved rate', scheduleDays: 'Schedule impact (days)', hindranceReference: 'Hindrance reference', commencementDate: 'Liability commencement', liabilityMonths: 'Contract liability months', liabilityEndDate: 'Contract liability end date', inspectionId: 'Inspection', defectId: 'Linked defect', testPlanReference: 'Approved test plan', sampleReference: 'Sample reference', laboratory: 'Laboratory / testing agency', standardVersion: 'Standard and version', drawingVersion: 'Drawing and revision', result: 'Result', transactionDate: 'Transaction date', accountingHead: 'Accounting head', billId: 'Approved bill', originalTransactionId: 'Original transaction', contractId: 'Verified contract', month: 'Reporting month', progress: 'Reported progress (%)', workSummary: 'Work completed this month', workforce: 'Monthly workforce summary', issues: 'Issues and delays', nextMonthPlan: 'Next month plan', documentType: 'Document Type' };

export function ContractControlsTab({ project, monthly = false }: { project: Project; monthly?: boolean }) {
  useUiLanguage();
  const s = useStore();
  const [params] = useSearchParams();
  const [renewalDate] = useState(() => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const requestedKind = params.get('kind') as ControlKind;
  const initialKind: ControlKind = Object.hasOwn(KIND_LABELS, requestedKind ?? '') ? requestedKind : 'CERTIFICATE';
  const [kind, setKind] = useState<ControlKind>(monthly ? 'MONTHLY' : initialKind);
  const [category, setCategory] = useState(CERTIFICATES[0]);
  const [reference, setReference] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({ responsibleRole: 'EXECUTIVE_ENGINEER', applicability: 'APPLICABLE', month: todayDate().slice(0, 7), progress: String(project.reportedProgress), transactionDate: todayDate(), result: 'PASS', version: '1', scheduleDays: '0' });
  const [supersedesId, setSupersedesId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [fileKey, setFileKey] = useState(0);
  const records = s.controlRecords.filter(r => r.projectId === project.id && (monthly ? r.kind === 'MONTHLY' : r.kind !== 'MONTHLY'));
  const current = activeControls(s, project.id);
  const tx = actualTransactions(s, project.id);
  const gaps = workOrderGaps(s, project.id);
  const readiness = handoverGaps(s, project.id);
  const user = s.currentUser;
  const finance = ['SUPERADMIN', 'COMMISSIONER', 'EXECUTIVE_ENGINEER'].includes(user?.role ?? '');
  const editable = !!user && !['MINISTER', 'VIGILANCE_AUDIT', 'IT_ADMIN'].includes(user.role) && (!monthly || ['CONTRACTOR', 'SUPERADMIN'].includes(user.role));
  const options = (key: string): { id: string; label: string }[] | undefined => {
    if (key === 'documentType') return ['Drawing', 'Report', 'Contract', 'Other'].map(id => ({ id, label: id }));
    if (key === 'responsibleUserId') return s.users.filter(u => u.role === fields.responsibleRole && computeProjectScope(u, s.projects, s.contractors).projectIds.has(project.id)).map(u => ({ id: u.id, label: u.name }));
    if (key === 'responsibleRole') return ['EXECUTIVE_ENGINEER', 'PROJECT_MANAGER', 'CIVIL_SURGEON', 'COMMISSIONER', 'CONTRACTOR'].map(id => ({ id, label: id }));
    if (key === 'drawingId') return current.filter(r => r.kind === 'DOCUMENT' && r.fields.documentType === 'Drawing' || r.kind === 'PROCUREMENT' && r.category === 'Approved drawings / estimate').map(r => ({ id: r.id, label: r.reference + ' / ' + r.fields.version }));
    if (key === 'applicability') return ['APPLICABLE', 'NOT_APPLICABLE'].map(id => ({ id, label: id }));
    if (key === 'result') return ['PASS', 'FAIL'].map(id => ({ id, label: id }));
    if (key === 'boqItemId') return s.boqItems.filter(b => b.projectId === project.id).map(b => ({ id: b.id, label: `${b.item} (${b.unit})` }));
    if (key === 'billId') return s.bills.filter(b => b.projectId === project.id && ['APPROVED', 'PAID'].includes(b.status)).map(b => ({ id: b.id, label: b.billNumber }));
    if (key === 'inspectionId') return s.inspections.filter(i => i.projectId === project.id).map(i => ({ id: i.id, label: `${i.id} · ${uiText(i.category)}` }));
    if (key === 'defectId') return s.defects.filter(d => d.projectId === project.id && [fields.inspectionId, s.inspections.find(i => i.id === fields.inspectionId)?.parentInspectionId].includes(d.sourceInspectionId)).map(d => ({ id: d.id, label: `${d.id} · ${d.location}` }));
    if (key === 'contractId') return current.filter(r => r.kind === 'CONTRACT').map(r => ({ id: r.id, label: r.reference }));
    if (key === 'originalTransactionId') return tx.map(r => ({ id: r.id, label: `${r.reference} · ${formatCurrency(Number(r.fields.amount))}` }));
    return undefined;
  };
  function field(key: string, value: string) {
    setFields(f => ({ ...f, [key]: value, ...(key === 'boqItemId' ? { rate: String(s.boqItems.find(b => b.id === value)?.rate ?? '') } : {}) }));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (!files.length || files.length > 6) throw new Error('Attach up to six distinct evidence files.');
      const attachments = await saveBillFiles(files.map(file => ({ file, category: 'SUPPORTING' })));
      await s.submitControl({ projectId: project.id, kind, category: ['CERTIFICATE', 'PROCUREMENT'].includes(kind) ? category : kind, reference, fields, attachments, supersedesId: supersedesId || undefined });
      setReference(''); setFiles([]); setFileKey(k => k + 1); toast.success(uiText('Submitted for verification.'));
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function review(id: string, approve: boolean) {
    setBusy(true); setError('');
    try { await s.reviewControl(id, approve, notes[id] ?? ''); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <div className="space-y-4">
    {!monthly && <>
      <Card><CardContent className="space-y-3 p-4"><h3 className="font-semibold">{uiText('Approval readiness')}</h3>
        <p className="text-sm">{uiText('Work-order prerequisites remaining')}: {gaps.length}</p><div className="flex flex-wrap gap-1">{gaps.map(g => <span key={g} className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">{uiText(g)}</span>)}</div>
        <p className="text-sm">{uiText('Handover requirements remaining')}: {readiness.length}</p><div className="flex flex-wrap gap-1">{readiness.map(g => <span key={g} className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{uiText(g)}</span>)}</div>
        {finance && <Button disabled={!!gaps.length} onClick={() => { try { s.issueWorkOrder(project.id); } catch (e) { setError((e as Error).message); } }}>{uiText('Issue Work Order')}</Button>}
      </CardContent></Card>
      <div className="grid grid-cols-2 gap-3"><Card><CardContent className="p-4"><p className="text-xs">{uiText('Verified receipts')}</p><b>{formatCurrency(tx.filter(r => r.kind === 'RECEIPT').reduce((n, r) => n + Number(r.fields.amount), 0))}</b></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs">{uiText('Verified payments')}</p><b>{formatCurrency(tx.filter(r => r.kind === 'PAYMENT').reduce((n, r) => n + Number(r.fields.amount), 0))}</b></CardContent></Card></div>
      <p className="text-xs text-slate-500">{uiText('Verified ledger totals exclude legacy demo balances. Evidence is stored on this device.')}</p>
    </>}
    {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{uiText(error)}</p>}
    {editable && <Card><CardContent className="p-4"><form onSubmit={submit} className="space-y-3"><fieldset disabled={busy} className="space-y-3">
      <h3 className="font-semibold">{uiText(monthly ? 'Add Monthly Report' : 'Submit supporting record')}</h3>
      {!monthly && <label className="block text-xs">{uiText('Record type')}<NativeSelect value={kind} onChange={e => { const next = e.target.value as ControlKind; setKind(next); setCategory(next === 'PROCUREMENT' ? PROCUREMENT[0] : CERTIFICATES[0]); setSupersedesId(''); }}>{(Object.keys(KIND_LABELS) as ControlKind[]).filter(k => k !== 'MONTHLY' && (finance || !['PAYMENT', 'RECEIPT', 'REVERSAL', 'RELEASE'].includes(k))).map(k => <option key={k} value={k}>{uiText(KIND_LABELS[k])}</option>)}</NativeSelect></label>}
      {['CERTIFICATE', 'PROCUREMENT'].includes(kind) && <label className="block text-xs">{uiText('Category')}<NativeSelect value={category} onChange={e => setCategory(e.target.value)}>{(kind === 'CERTIFICATE' ? CERTIFICATES : PROCUREMENT).map(c => <option key={c} value={c}>{uiText(c)}</option>)}</NativeSelect></label>}
      <label className="block text-xs">{uiText('Document / transaction reference')} *<Input required value={reference} onChange={e => setReference(e.target.value)} /></label>
      <div className="grid gap-3 sm:grid-cols-2">{CONTROL_FIELDS[kind].map(key => { const choices = options(key); return <label key={key} className="block text-xs">{uiText(LABELS[key])}{choices ? <NativeSelect value={fields[key] ?? ''} onChange={e => field(key, e.target.value)}><option value="">{uiText('Select')}</option>{choices.map(o => <option key={o.id} value={o.id}>{uiText(o.label)}</option>)}</NativeSelect> : <Input type={key.endsWith('Date') ? 'date' : key === 'month' ? 'month' : ['amount', 'progress', 'quantityDelta', 'rate', 'scheduleDays', 'liabilityMonths'].includes(key) ? 'number' : 'text'} step="any" value={fields[key] ?? ''} onChange={e => field(key, e.target.value)} />}</label>; })}</div>
      {['CERTIFICATE', 'PROCUREMENT', 'CONTRACT', 'DOCUMENT', 'MONTHLY', 'QUALITY'].includes(kind) && <label className="block text-xs">{uiText('Supersedes verified version (optional)')}<NativeSelect value={supersedesId} onChange={e => setSupersedesId(e.target.value)}><option value="">{uiText('None')}</option>{current.filter(r => r.kind === kind && (!['CERTIFICATE', 'PROCUREMENT'].includes(kind) || r.category === category)).map(r => <option key={r.id} value={r.id}>{r.reference}</option>)}</NativeSelect></label>}
      <label className="block text-xs">{uiText('Supporting proof')} *<Input key={fileKey} type="file" accept="application/pdf,image/jpeg,image/png" multiple required onChange={e => setFiles(Array.from(e.target.files ?? []))} /></label>
      <p className="text-xs text-slate-500">{uiText('PDF, JPEG or PNG; up to 5 MB each, 6 files total. Attachments are saved on this device.')}</p>
      <Button type="submit">{uiText(busy ? 'Saving proof...' : 'Submit for verification')}</Button>
    </fieldset></form></CardContent></Card>}
    {!records.length && <p className="p-4 text-sm text-slate-500">{uiText('No records submitted yet.')}</p>}
    {[...records].reverse().map(r => {
      const reviewer = !!user && (user.role === 'SUPERADMIN' || (['RECEIPT', 'PAYMENT', 'REVERSAL', 'RELEASE', 'VARIATION', 'EXTENSION', 'CONTRACT'].includes(r.kind) ? user.role === 'COMMISSIONER' : ['COMMISSIONER', 'EXECUTIVE_ENGINEER', 'CIVIL_SURGEON'].includes(user.role)));
      const isCurrent = current.some(v => v.id === r.id);
      const drawingAlert = drawingWarning(s, project.id, r.fields.drawingId);
      const expiring = isCurrent && r.fields.expiryDate && r.fields.expiryDate <= renewalDate;
      return <Card key={r.id}><CardContent className="space-y-3 p-4"><div className="flex flex-wrap justify-between gap-2"><h4 className="font-semibold">{uiText(KIND_LABELS[r.kind])} · {r.reference}</h4><StatusBadge status={r.status} /></div><p className="text-xs text-slate-500">{uiText(r.category)} · {formatDate(r.submittedAt)} · {s.users.find(u => u.id === r.submittedBy)?.name ?? r.submittedBy}</p>
        {isCurrent && r.kind === 'DOCUMENT' && r.fields.documentType === 'Drawing' && <p className="text-sm font-semibold text-emerald-700">{uiText('Current approved drawing')} ? {r.fields.drawingNumber} ? {r.fields.version}</p>}
        {drawingAlert && <p role="alert" className="text-sm text-amber-700">{uiText(drawingAlert)}</p>}
        {expiring && <p role="status" className="rounded bg-amber-50 p-2 text-xs text-amber-800">{uiText(validControl(r) ? 'Renewal due within 30 days' : 'Expired certificate — not ready')}</p>}
        {r.status === 'VERIFIED' && !isCurrent && <p className="text-xs text-slate-500">{uiText('Superseded — retained for audit')}</p>}
        <details><summary className="cursor-pointer text-sm text-navy-700">{uiText('View details and evidence')}</summary><dl className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(r.fields).filter(([,v]) => v).map(([k,v]) => <div key={k}><dt className="text-xs text-slate-400">{uiText(LABELS[k] ?? k)}</dt><dd className="break-words text-sm">{v}</dd></div>)}</dl><BillEvidence attachments={r.attachments} /></details>
        {r.decision && <p className="text-xs">{r.decision} · {s.users.find(u => u.id === r.reviewedBy)?.name ?? r.reviewedBy} · {formatDate(r.reviewedAt)}</p>}
        {reviewer && r.status === 'PENDING' && r.submittedBy !== user!.id && <div className="space-y-2"><Textarea aria-label={uiText('Decision notes')} placeholder={uiText('Decision notes')} value={notes[r.id] ?? ''} onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))} /><div className="flex gap-2"><Button disabled={busy || !notes[r.id]?.trim()} onClick={() => void review(r.id, true)}>{uiText('Verify')}</Button><Button variant="outline" disabled={busy || !notes[r.id]?.trim()} onClick={() => void review(r.id, false)}>{uiText('Reject')}</Button></div></div>}
      </CardContent></Card>;
    })}
  </div>;
}
