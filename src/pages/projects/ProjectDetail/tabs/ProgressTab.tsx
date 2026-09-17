import { uiText, useUiLanguage } from '../../../../i18n/ui';
import { useState } from 'react';
import { Plus, Camera } from 'lucide-react';
import { toast } from 'sonner';
import type { Project } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardHeader, CardTitle, Button, Textarea, Input, Table, THead, TBody, Tr, Th, Td } from '../../../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Dialog, DialogContent, DialogFooter } from '../../../../components/ui/overlays';
import { formatDate } from '../../../../lib/utils';
import { simulateCapture } from '../../../../lib/geo';

const STAGE_OPTIONS = ['Foundation', 'Structure', 'Roofing', 'MEP', 'Finishing', 'Medical Infrastructure'];
const WEATHER = ['Clear', 'Cloudy', 'Rain', 'Heavy Rain', 'Extreme Heat'] as const;

export function ProgressTab({ project }: { project: Project }) {
  useUiLanguage();
  const reports = useStore((s) => s.progressReports).filter((r) => r.projectId === project.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const addProgressReport = useStore((s) => s.addProgressReport);
  const addPhoto = useStore((s) => s.addPhoto);
  const currentUser = useStore((s) => s.currentUser);

  const [reportOpen, setReportOpen] = useState(false);
  const [form, setForm] = useState({ stage: STAGE_OPTIONS[0], progressPct: project.physicalProgress, workersPresent: 30, weather: 'Clear' as typeof WEATHER[number], materialsReceived: '', materialsUsed: '', issues: '', photoCount: 2 });

  function submitReport() {
    const now = new Date();
    const photoIds: string[] = [];
    for (let i = 0; i < form.photoCount; i++) {
      const ph = addPhoto({
        projectId: project.id, stage: form.stage, type: 'PROGRESS', date: now.toISOString().slice(0, 10),
        location: `${project.taluka}, ${project.district}`, uploadedBy: currentUser?.name ?? 'Deputy Engineer',
        uploadedByRole: currentUser?.role ?? 'DEPUTY_ENGINEER',
        description: `${form.stage} — daily progress photo`, seed: Math.floor(Math.random() * 99999),
        ...simulateCapture(project),
      });
      photoIds.push(ph.id);
    }
    addProgressReport({
      projectId: project.id, date: now.toISOString().slice(0, 10), stage: form.stage, progressPct: form.progressPct,
      workersPresent: form.workersPresent, weather: form.weather, materialsReceived: form.materialsReceived || 'None',
      materialsUsed: form.materialsUsed || 'None', issues: form.issues || 'None reported', photoIds, videoCount: 0,
      submittedBy: currentUser?.name ?? 'Deputy Engineer', location: `${project.taluka}, ${project.district}`, timestamp: now.toISOString(),
    });
    toast.success(uiText('Daily progress report submitted with geotagged photos.'));
    setReportOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setReportOpen(true)}><Plus size={15} />{uiText(" Submit Daily Progress")}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>{uiText("Daily Progress Reports")}</CardTitle></CardHeader>
        <Table>
          <THead><Tr><Th>{uiText("Date")}</Th><Th>{uiText("Stage")}</Th><Th>{uiText("Progress")}</Th><Th>{uiText("Workers")}</Th><Th>{uiText("Weather")}</Th><Th>{uiText("Issues")}</Th><Th>{uiText("Submitted By")}</Th></Tr></THead>
          <TBody>
            {reports.map((r) => (
              <Tr key={r.id}>
                <Td>{uiText(formatDate(r.date))}</Td>
                <Td className="font-medium text-slate-800">{uiText(r.stage)}</Td>
                <Td>{r.progressPct}%</Td>
                <Td>{r.workersPresent}</Td>
                <Td>{uiText(r.weather)}</Td>
                <Td className="max-w-[180px] truncate">{uiText(r.issues)}</Td>
                <Td>{uiText(r.submittedBy)}</Td>
              </Tr>
            ))}
            {reports.length === 0 && <Tr><Td className="py-8 text-center text-slate-400"><span>{uiText("No progress reports submitted yet.")}</span></Td></Tr>}
          </TBody>
        </Table>
      </Card>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent title={uiText("Submit Daily Progress Report")} description={uiText(project.name)} size="lg">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <p className="mb-1 text-xs font-medium text-slate-600">{uiText("Site Photos (simulated capture with geotag + timestamp)")}</p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, photoCount: Math.min(6, form.photoCount + 1) })}><Camera size={13} />{uiText(" Capture Photo")}</Button>
                <span className="text-xs text-slate-500">{form.photoCount}{uiText(" photo(s) attached · ")}{uiText(project.taluka)}, {uiText(project.district)} · {uiText(new Date().toLocaleString('en-IN'))}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>{uiText("Cancel")}</Button>
            <Button onClick={submitReport}>{uiText("Submit Report")}</Button>
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
