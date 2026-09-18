import { uiText, useUiLanguage } from '../../../../i18n/ui';
import { useState } from 'react';
import { toast } from 'sonner';
import type { Bill, BillAttachment, Project } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { useProjectScope } from '../../../../lib/scope';
import { todayDate } from '../../../../lib/fundDisbursal';
import { saveBillFiles } from '../../../../lib/billAttachments';
import { validateBillSubmission } from '../../../../lib/billSubmission';
import { formatCurrencyFull } from '../../../../lib/utils';
import { Button, Input, Textarea, NativeSelect } from '../../../../components/ui/primitives';
import { previousClaimedQuantity, validateBillMeasurements } from '../../../../lib/billMeasurements';
import { activeControls } from '../../../../lib/projectControls';
import { Dialog, DialogContent, DialogFooter } from '../../../../components/ui/overlays';

const INITIAL = { billNumber: '', invoiceDate: todayDate(), periodFrom: '', periodTo: '', workOrderReference: '', measurementBookId: '', workDescription: '', previousBillReference: '', grossAmount: '', gst: '0', deductions: '0', retention: '0', penalty: '0' };
const PROOF_FIELDS = [
  { category: 'SIGNED_BILL', label: 'Signed RA bill / invoice', required: true },
  { category: 'MEASUREMENT', label: 'Measurement book extract / measured-work statement', required: true },
  { category: 'SUPPORTING', label: 'Site photos, test reports or applicable material invoices', required: false },
] as const;

export function RABillSubmission({ project, onClose }: { project: Project; onClose: () => void }) {
  useUiLanguage();
  const [form, setForm] = useState(INITIAL);
  const [declaration, setDeclaration] = useState(false);
  const [files, setFiles] = useState<Partial<Record<BillAttachment['category'], File[]>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lines, setLines] = useState<NonNullable<Bill['measurementLines']>>([]);
  const boq = useStore(s => s.boqItems).filter(b => b.projectId === project.id);
  const state = useStore();
  const variations = activeControls(state, project.id).filter(r => r.kind === 'VARIATION');
  function updateLines(next: NonNullable<Bill['measurementLines']>) {
    setLines(next);
    setForm(f => ({ ...f, grossAmount: next.reduce((n, l) => n + (boq.find(b => b.id === l.boqItemId)?.rate ?? 0) * l.quantity, 0).toFixed(2) }));
  }
  const user = useStore((state) => state.currentUser);
  const bills = useStore((state) => state.bills);
  const submitBill = useStore((state) => state.submitBill);
  const { projectIds } = useProjectScope();
  const set = (key: keyof typeof form, value: string) => setForm((previous) => ({ ...previous, [key]: value }));
  const numbers = { grossAmount: Number(form.grossAmount), gst: Number(form.gst), deductions: Number(form.deductions), retention: Number(form.retention), penalty: Number(form.penalty) };
  const netPayable = Math.round((numbers.grossAmount + numbers.gst - numbers.deductions - numbers.retention - numbers.penalty) * 100) / 100;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const uploads = PROOF_FIELDS.flatMap(({ category }) => (files[category] ?? []).map((file) => ({ file, category })));
      const bill = { ...form, ...numbers, measurementLines: lines, netPayable, projectId: project.id, contractorId: project.contractorId, declarationAccepted: declaration,
        attachments: uploads.map(({ file, category }, index) => ({ id: `pending-${index}`, name: file.name, mimeType: file.type, size: file.size, category })) };
      validateBillSubmission(bill, user, project, projectIds, bills);
      validateBillMeasurements(state, bill);
      const attachments = await saveBillFiles(uploads);
      await submitBill({ ...bill, attachments });
      toast.success(uiText('RA bill and supporting proof submitted for engineer verification.'));
      onClose();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Bill submission failed. Please try again.'); }
    finally { setBusy(false); }
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent title={uiText("Submit RA Bill")} description={uiText(project.name)} size="lg">
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
          <p className="rounded-md bg-navy-50 p-3 text-xs text-navy-700">{uiText("Submit the current period claim with signed billing documents and measurement proof. Your engineer will verify quantities, quality and admissible amounts before approval.")}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {([
              ['billNumber', 'RA bill / invoice number', 'text'], ['invoiceDate', 'Bill date', 'date'],
              ['periodFrom', 'Work period from', 'date'], ['periodTo', 'Work period to', 'date'],
              ['workOrderReference', 'Agreement / work-order reference', 'text'], ['measurementBookId', 'MB / e-MB reference and pages', 'text'],
            ] as const).map(([key, label, type]) => <label key={key} className="space-y-1 text-xs font-medium text-slate-600">{uiText(label)} *<Input required type={type} max={type === 'date' ? todayDate() : undefined} value={form[key]} onChange={(event) => set(key, event.target.value)} /></label>)}
          </div>
          <label className="block space-y-1 text-xs font-medium text-slate-600">{uiText("Previous RA bill / measurement reference (if applicable)")}<Input value={form.previousBillReference} onChange={(event) => set('previousBillReference', event.target.value)} /></label>
          <label className="block space-y-1 text-xs font-medium text-slate-600">{uiText("Work executed and BOQ item references *")}<Textarea required rows={3} value={form.workDescription} onChange={(event) => set('workDescription', event.target.value)} /></label>
          <section className="space-y-3 rounded border p-3"><h3 className="font-semibold">{uiText('Measured BOQ lines')}</h3>
            {lines.map((line, index) => {
              const item = boq.find(b => b.id === line.boqItemId);
              const previous = item ? previousClaimedQuantity(state, project.id, item.id) : 0;
              const authorized = (item?.plannedQty ?? 0) + variations.filter(v => v.fields.boqItemId === line.boqItemId).reduce((n, v) => n + Number(v.fields.quantityDelta), 0);
              const excess = !!item && previous + line.quantity > authorized + 0.000001;
              const duplicate = !!line.measurementReference.trim() && state.measurements.some(m => m.projectId === project.id && m.boqItemId === line.boqItemId && m.measurementReference?.trim().toLowerCase() === line.measurementReference.trim().toLowerCase() && m.location?.trim().toLowerCase() === line.location.trim().toLowerCase() && (!m.billId || state.bills.some(b => b.id === m.billId && b.status !== 'REJECTED')));
              const change = (patch: Partial<typeof line>) => updateLines(lines.map((l, i) => i === index ? { ...l, ...patch } : l));
              return <div key={index} className="space-y-2 rounded bg-slate-50 p-3">
                <label className="block text-xs">{uiText('BOQ item')}<NativeSelect required value={line.boqItemId} onChange={e => change({ boqItemId: e.target.value })}><option value="">{uiText('Select')}</option>{boq.map(b => <option key={b.id} value={b.id}>{b.item} ({b.unit})</option>)}</NativeSelect></label>
                <div className="grid grid-cols-2 gap-2"><label className="text-xs">{uiText('Current quantity')}<Input type="number" min="0.000001" step="any" required value={line.quantity} onChange={e => change({ quantity: Number(e.target.value) })} /></label><label className="text-xs">{uiText('Work location')}<Input required value={line.location} onChange={e => change({ location: e.target.value })} /></label></div>
                <label className="block text-xs">{uiText('Measurement reference / pages')}<Input required value={line.measurementReference} onChange={e => change({ measurementReference: e.target.value })} /></label>
                <p className="text-xs">{uiText('Previous quantity')}: {previous} · {uiText('Cumulative quantity')}: {previous + line.quantity} · {uiText('Approved rate')}: {item?.rate ?? 0}</p>
                {(excess || duplicate) && <p role="alert" className="rounded bg-red-50 p-2 text-xs text-red-700">{uiText(excess ? 'Cumulative quantity exceeds the authorized BOQ quantity.' : 'This measurement reference and location have already been claimed.')}</p>}
                <p className="text-xs">{uiText('Authorized quantity')}: {authorized}</p>
                <label className="block text-xs">{uiText('Approved variation')}<NativeSelect value={line.variationId ?? ''} onChange={e => change({ variationId: e.target.value || undefined })}><option value="">{uiText('None')}</option>{variations.filter(v => v.fields.boqItemId === line.boqItemId).map(v => <option key={v.id} value={v.id}>{v.reference}</option>)}</NativeSelect></label>
                <Button type="button" variant="ghost" onClick={() => updateLines(lines.filter((_, i) => i !== index))}>{uiText('Remove line')}</Button>
              </div>;
            })}
            <Button type="button" variant="outline" onClick={() => updateLines([...lines, { boqItemId: '', quantity: 0, location: '', measurementReference: '' }])}>{uiText('Add measurement line')}</Button>
          </section>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {([['grossAmount', 'Current work value before tax'], ['gst', 'GST amount'], ['deductions', 'Other deductions / advance recovery'], ['retention', 'Retention / security deduction'], ['penalty', 'Other recoveries / penalty']] as const).map(([key, label]) => <label key={key} className="space-y-1 text-xs font-medium text-slate-600">{uiText(label)}{uiText(" (INR) *")}<Input required type="number" min="0" step="0.01" value={form[key]} onChange={(event) => set(key, event.target.value)} /></label>)}
          </div>
          <p className="text-xs text-slate-500">{uiText("Enter amounts from the signed bill and applicable contract. Do not repeat amounts already claimed in an earlier RA bill. These amounts remain subject to verification.")}</p>
          <p className="rounded-md bg-slate-50 p-3 text-sm font-semibold text-navy-800">{uiText("Net claim: ")}{uiText(Number.isFinite(netPayable) ? formatCurrencyFull(netPayable) : 'Enter valid amounts')}</p>
          <div className="space-y-3 rounded-lg border border-slate-200 p-3">
            <h3 className="text-sm font-semibold text-slate-800">{uiText("Supporting proof")}</h3>
            <p className="text-xs text-slate-500">{uiText("PDF, JPEG or PNG; up to 5 MB each, 6 files total. Attachments are saved on this device.")}</p>
            {PROOF_FIELDS.map(({ category, label, required }) => <label key={category} className="block space-y-1 text-xs font-medium text-slate-600">{uiText(label)}{uiText(required ? ' *' : ' (optional)')}
              <span className="relative block rounded-md border border-slate-200 p-2 focus-within:ring-2 focus-within:ring-navy-500">
                <span className="inline-block rounded bg-navy-50 px-2 py-1 text-navy-700">{uiText('Choose files')}</span>
                {!files[category]?.length && <span className="ml-2 text-slate-500">{uiText('No files selected')}</span>}
                <input aria-label={uiText(label)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" type="file" required={required} multiple={category === 'SUPPORTING'} accept="application/pdf,image/jpeg,image/png" onChange={(event) => setFiles((previous) => ({ ...previous, [category]: Array.from(event.target.files ?? []) }))} />
              </span>
              {!!files[category]?.length && <span className="block break-words text-[11px] text-slate-500">{files[category]!.map((file) => file.name).join(', ')}</span>}
            </label>)}
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" required checked={declaration} onChange={(event) => setDeclaration(event.target.checked)} className="mt-0.5" />{uiText("I confirm that the claimed work was executed, the attached documents support this claim, and this claim does not duplicate previously billed work.")}</label>
        </fieldset>
        {error && <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-xs text-red-700">{uiText(error)}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>{uiText("Cancel")}</Button><Button type="submit" disabled={busy}>{uiText(busy ? 'Saving proof...' : 'Submit for verification')}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
