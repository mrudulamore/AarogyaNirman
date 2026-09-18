import { saveSiteDraft, siteDrafts, removeSiteDraft, type SiteDraft } from '../../../../lib/siteDrafts';
import { activeControls } from '../../../../lib/projectControls';
import { drawingWarning } from '../../../../lib/pendingWork';
import { todayDate } from '../../../../lib/fundDisbursal';
import { downloadPdfReport } from '../../../../lib/pdf';
import { ProgressDocuments, ProgressDocumentLinks } from '../../../../components/common/ProgressDocuments';
import { saveBillFiles } from '../../../../lib/billAttachments';
import { uiText, useUiLanguage } from '../../../../i18n/ui';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Project } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardHeader, CardTitle, Button, Textarea, Input, Table, THead, TBody, Tr, Th, Td } from '../../../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Dialog, DialogContent, DialogFooter } from '../../../../components/ui/overlays';
import { formatDate } from '../../../../lib/utils';


const STAGE_OPTIONS = ['Foundation', 'Structure', 'Roofing', 'MEP', 'Finishing', 'Medical Infrastructure'];
const WEATHER = ['Clear', 'Cloudy', 'Rain', 'Heavy Rain', 'Extreme Heat'] as const;

export function ProgressTab({ project }: { project: Project }) {
  useUiLanguage();
  const reports = useStore((s) => s.progressReports).filter((r) => r.projectId === project.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const addProgressReport = useStore((s) => s.addProgressReport);

  const currentUser = useStore((s) => s.currentUser);

  const state = useStore();
  const canSubmit = ['CONTRACTOR', 'DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'PROJECT_MANAGER'].includes(currentUser?.role ?? '');
  const drawings = activeControls(state, project.id).filter(r => (r.kind === 'DOCUMENT' && r.fields.documentType === 'Drawing') || (r.kind === 'PROCUREMENT' && r.category === 'Approved drawings / estimate'));
  const [drafts, setDrafts] = useState<SiteDraft[]>([]);
  const [entryId, setEntryId] = useState<string>(() => crypto.randomUUID());
  const [error, setError] = useState('');
  const [step, setStep] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [form, setForm] = useState({ date: todayDate(), workCompleted: '', delayReason: '', measurementsNotes: '', drawingId: '', stage: STAGE_OPTIONS[0], progressPct: project.reportedProgress, workersPresent: 0, weather: 'Clear' as typeof WEATHER[number], materialsReceived: '', materialsUsed: '', issues: '' });

  useEffect(() => {
    let active = true;
    siteDrafts(currentUser!.id, project.id).then(d => { if (active) setDrafts(d); }).catch(e => { if (active) setError(e.message); });
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { active = false; window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, [currentUser?.id, project.id]);
  async function persistDraft() {
    if (files.length > 5 || files.some(f => f.size > 5 * 1024 * 1024)) throw new Error('Attach up to 5 files, 5 MB each.');
    await saveSiteDraft({ id: entryId, ownerId: currentUser!.id, projectId: project.id, savedAt: new Date().toISOString(), files,
      report: { ...form, clientSubmissionId: entryId, projectId: project.id, photoIds: [], videoCount: 0, submittedBy: currentUser!.name, location: project.name, timestamp: new Date().toISOString() } });
    setDrafts(await siteDrafts(currentUser!.id, project.id));
  }
  async function saveDraft() {
    setSaving(true); setError('');
    try { await persistDraft(); toast.success(uiText('Draft saved on this device.')); }
    catch(e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  async function submitReport() {
    if (saving) return;
    setSaving(true); setError('');
    const submitter = useStore.getState().currentUser;
    try {
      setStep('Saving draft...'); await persistDraft();
      if (!form.workCompleted.trim()) throw new Error('Describe the work completed.');
      if (!form.date || form.date > todayDate() || !Number.isInteger(form.workersPresent) || form.workersPresent < 0) throw new Error('Enter a valid diary date and workforce count.');
      if (!files.length || files.length > 5) throw new Error('Attach 1 to 5 supporting documents.');
      const account = submitter;
      if (useStore.getState().currentUser !== account) throw new Error('Your account changed. Reopen the progress form.');
      setStep('Saving supporting documents...');
      const attachments = await saveBillFiles(files.map(file => ({ file, category: 'SUPPORTING' })));
      if (useStore.getState().currentUser !== account) throw new Error('Your account changed. Reopen the progress form.');
      const now = new Date().toISOString();
      setStep('Submitting local report...');
      await addProgressReport({
        ...form, clientSubmissionId: entryId,
        projectId: project.id, date: form.date, stage: form.stage, progressPct: form.progressPct,
        workersPresent: form.workersPresent, weather: form.weather, materialsReceived: form.materialsReceived || 'None',
        materialsUsed: form.materialsUsed || 'None', issues: form.issues || 'None reported', photoIds: [], videoCount: 0,
        submittedBy: currentUser?.name ?? '', location: `${project.taluka}, ${project.district}`, timestamp: now, attachments,
      });
      await removeSiteDraft(entryId); setDrafts(await siteDrafts(currentUser!.id, project.id)); setEntryId(crypto.randomUUID());
      toast.success(uiText('Progress submitted.')); setFiles([]); setReportOpen(false);
    } catch (error) { setError((error as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <p className="rounded bg-blue-50 p-3 text-sm" role="status">{uiText(online ? 'Online' : 'Offline')} / {uiText('Drafts and evidence stay on this device. Server upload is not configured.')}</p>
      {error && !reportOpen && <p role="alert" className="text-sm text-red-700">{uiText(error)}</p>}
      {canSubmit && drafts.length > 0 && <details><summary className="min-h-11 cursor-pointer">{uiText('Saved drafts')} ({drafts.length})</summary>{drafts.map(d => <button className="block min-h-11 text-sm text-navy-700" key={d.id} onClick={() => { setEntryId(d.id); setForm({ ...form, ...d.report, date: d.report.date, workCompleted: d.report.workCompleted ?? '', delayReason: d.report.delayReason ?? '', measurementsNotes: d.report.measurementsNotes ?? '', drawingId: d.report.drawingId ?? '' }); setFiles(d.files); setReportOpen(true); setError(''); }}>{d.report.date} / {d.report.stage} / {d.files.length} {uiText('files')} / {uiText('Resume')}</button>)}</details>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => void downloadPdfReport({ title: uiText('Daily site diary'), subtitle: project.name, scopeLine: project.id, generatedBy: currentUser?.name ?? '', filename: project.id + '-diary', sections: [{ heading: uiText('Daily Progress Reports'), columns: ['Date', 'Work completed', 'Workers', 'Weather', 'Measurement notes', 'Delay reason'].map(uiText), rows: reports.map(r => [r.date, r.workCompleted ?? r.issues, r.workersPresent, uiText(r.weather), r.measurementsNotes ?? '', r.delayReason ?? '']) }] })}>{uiText('Export PDF')}</Button>
        <Button disabled={!canSubmit} onClick={() => { setEntryId(crypto.randomUUID()); setFiles([]); setError(''); setReportOpen(true); }}><Plus size={15} />{uiText(" Submit Daily Progress")}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>{uiText("Daily Progress Reports")}</CardTitle></CardHeader>
        <Table>
          <THead><Tr><Th>{uiText("Date")}</Th><Th>{uiText("Stage")}</Th><Th>{uiText("Progress")}</Th><Th>{uiText("Workers")}</Th><Th>{uiText("Weather")}</Th><Th>{uiText("Issues")}</Th><Th>{uiText("Submitted By")}</Th><Th>{uiText("Documents")}</Th></Tr></THead>
          <TBody>
            {reports.map((r) => (
              <Tr key={r.id}>
                <Td>{uiText(formatDate(r.date))}</Td>
                <Td className="font-medium text-slate-800">{uiText(r.stage)}</Td>
                <Td>{r.progressPct}%</Td>
                <Td>{r.workersPresent}</Td>
                <Td>{uiText(r.weather)}</Td>
                <Td><details><summary className="min-h-11 cursor-pointer">{uiText('Diary details')}</summary><p>{r.workCompleted}</p><p>{uiText('Materials Received')}: {r.materialsReceived}</p><p>{uiText('Materials Used')}: {r.materialsUsed}</p><p>{uiText('Measurement notes')}: {r.measurementsNotes}</p><p>{uiText('Delay reason')}: {r.delayReason}</p><p>{r.issues}</p><p className="text-amber-700">{uiText(drawingWarning(state, project.id, r.drawingId))}</p></details></Td>
                <Td>{uiText(r.submittedBy)}</Td><Td><ProgressDocumentLinks attachments={r.attachments} /></Td>
              </Tr>
            ))}
            {reports.length === 0 && <Tr><Td className="py-8 text-center text-slate-400"><span>{uiText("No progress reports submitted yet.")}</span></Td></Tr>}
          </TBody>
        </Table>
      </Card>

      <Dialog open={reportOpen} onOpenChange={open => !saving && setReportOpen(open)}>
        <DialogContent title={uiText("Submit Daily Progress Report")} description={uiText(project.name)} size="lg">
          <fieldset disabled={saving} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FField label={uiText('Diary date')}><Input type="date" max={todayDate()} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></FField>
            <FField label={uiText('Approved drawing revision')}><select className="min-h-11 w-full rounded border" value={form.drawingId} onChange={e => setForm({ ...form, drawingId: e.target.value })}><option value="">{uiText('Not referenced')}</option>{form.drawingId && !drawings.some(d => d.id === form.drawingId) && <option value={form.drawingId}>{uiText('Outdated revision')}</option>}{drawings.map(d => <option key={d.id} value={d.id}>{d.reference} / {d.fields.version}</option>)}</select></FField>
            {(['workCompleted', 'measurementsNotes', 'delayReason'] as const).map((key, i) => <FField key={key} label={uiText(['Work completed', 'Measurement notes (unverified)', 'Delay reason'][i])}><Textarea value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></FField>)}
            <FField label={uiText("Construction Stage")}>
              <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STAGE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{uiText(s)}</SelectItem>)}</SelectContent>
              </Select>
            </FField>
            <FField label={uiText("Overall Progress %")}><Input type="number" min={0} max={100} value={form.progressPct} onChange={(e) => setForm({ ...form, progressPct: +e.target.value })} /></FField>
            <FField label={uiText("Workers Present")}><Input type="number" value={form.workersPresent} onChange={(e) => setForm({ ...form, workersPresent: +e.target.value })} /></FField>
            <FField label={uiText("Weather")}>
              <Select value={form.weather} onValueChange={(v) => setForm({ ...form, weather: v as typeof WEATHER[number] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WEATHER.map((w) => <SelectItem key={w} value={w}>{uiText(w)}</SelectItem>)}</SelectContent>
              </Select>
            </FField>
            <FField label={uiText("Materials Received")}><Input value={form.materialsReceived} onChange={(e) => setForm({ ...form, materialsReceived: e.target.value })} placeholder={uiText("e.g. Cement 200 bags")} /></FField>
            <FField label={uiText("Materials Used")}><Input value={form.materialsUsed} onChange={(e) => setForm({ ...form, materialsUsed: e.target.value })} placeholder={uiText("e.g. Steel 4MT")} /></FField>
            <div className="sm:col-span-2"><FField label={uiText("Issues / Remarks")}><Textarea value={form.issues} onChange={(e) => setForm({ ...form, issues: e.target.value })} rows={2} /></FField></div>
            <div className="sm:col-span-2">
              <ProgressDocuments files={files} onChange={setFiles} disabled={saving} />
            </div>
          </fieldset>
          {drawingWarning(state, project.id, form.drawingId) && <p className="text-sm text-amber-700">{uiText(drawingWarning(state, project.id, form.drawingId))}</p>}
          {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{uiText(error)}</p>}
          {saving && <p role="status">{uiText(step || 'Saving draft...')}</p>}
          <DialogFooter>
            <Button disabled={saving} variant="outline" onClick={() => void saveDraft()}>{uiText('Save draft')}</Button>
            <Button disabled={saving} variant="outline" onClick={() => setReportOpen(false)}>{uiText("Cancel")}</Button>
            <Button disabled={saving || !files.length} onClick={submitReport}>{uiText(saving ? "Saving..." : "Submit Report")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FField({ label, children }: { label: string; children: React.ReactNode }) {
  useUiLanguage();
  return <div><p className="mb-1 text-xs font-medium text-slate-600">{uiText(label)}</p>{children}</div>;
}
