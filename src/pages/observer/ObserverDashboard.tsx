import { uiText, useUiLanguage } from '../../i18n/ui';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Plus, Radar } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { Card, CardHeader, CardTitle, Button, StatusBadge, Textarea, Table, THead, TBody, Tr, Th, Td, EmptyState } from '../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogFooter } from '../../components/ui/overlays';
import { KpiCard } from '../../components/common/KpiCard';
import { formatDate } from '../../lib/utils';
import { ClipboardCheck, AlertTriangle, Eye } from 'lucide-react';

export function ObserverDashboard() {
  useUiLanguage();
  const { t } = useTranslation();
  const currentUser = useStore((s) => s.currentUser);
  const projects = useStore((s) => s.projects);
  const observations = useStore((s) => s.observations);
  const inspections = useStore((s) => s.inspections);
  const defects = useStore((s) => s.defects);
  const approvals = useStore((s) => s.approvals);
  const addObservation = useStore((s) => s.addObservation);
  const updateObservationStatus = useStore((s) => s.updateObservationStatus);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ projectId: projects[0]?.id ?? '', category: 'Progress', note: '', recommendedAction: 'Continue monitoring' });

  const myObservations = observations.filter((o) => o.observer === currentUser?.name);
  const upcomingInspections = inspections.filter((i) => i.status === 'SCHEDULED').slice(0, 6);
  const openDefects = defects.filter((d) => d.status !== 'CLOSED').length;
  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING').length;

  return (
    <div>
      <PageHeader title={uiText(t('pages.observer.title'))} description={uiText(t('pages.observer.desc', { name: currentUser?.name }))} actions={<Button onClick={() => setOpen(true)}><Plus size={15} />{uiText(" Add Observation")}</Button>} />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label={uiText("Upcoming Inspections")} value={upcomingInspections.length} icon={ClipboardCheck} tone="blue" />
        <KpiCard label={uiText("Open Defects")} value={openDefects} icon={AlertTriangle} tone="red" />
        <KpiCard label={uiText("Pending Approvals")} value={pendingApprovals} icon={ClipboardCheck} tone="amber" />
        <KpiCard label={uiText("My Observations")} value={myObservations.length} icon={Eye} />
      </div>

      <Card>
        <CardHeader><CardTitle>{uiText("My Observations")}</CardTitle></CardHeader>
        {myObservations.length === 0 ? <EmptyState icon={<Radar size={32} />} title={uiText("No observations submitted yet")} /> : (
          <Table>
            <THead><Tr><Th>{uiText("Project")}</Th><Th>{uiText("Category")}</Th><Th>{uiText("Note")}</Th><Th>{uiText("Recommended Action")}</Th><Th>{uiText("Date")}</Th><Th>{uiText("Status")}</Th></Tr></THead>
            <TBody>
              {myObservations.map((o) => (
                <Tr key={o.id}>
                  <Td className="max-w-[180px] truncate">{projects.find((p) => p.id === o.projectId)?.name}</Td>
                  <Td>{uiText(o.category)}</Td>
                  <Td className="max-w-[220px] truncate">{uiText(o.note)}</Td>
                  <Td>{uiText(o.recommendedAction)}</Td>
                  <Td>{uiText(formatDate(o.date))}</Td>
                  <Td>
                    {o.status === 'OPEN' ? (
                      <Button size="sm" variant="outline" onClick={() => { updateObservationStatus(o.id, 'ACKNOWLEDGED'); toast.success(uiText('Marked acknowledged.')); }}>{uiText("Acknowledge")}</Button>
                    ) : <StatusBadge status={o.status} />}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={uiText("Add Observation")} size="lg">
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">{uiText("Project")}</p>
              <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">{uiText("Category")}</p>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['Quality', 'Safety', 'Progress', 'Documentation'].map((c) => <SelectItem key={c} value={c}>{uiText(c)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><p className="mb-1 text-xs font-medium text-slate-600">{uiText("Observation Note")}</p><Textarea rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">{uiText("Recommended Action")}</p>
              <Select value={form.recommendedAction} onValueChange={(v) => setForm({ ...form, recommendedAction: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['Continue monitoring', 'Flag to Executive Engineer', 'Schedule follow-up visit', 'No action required'].map((a) => <SelectItem key={a} value={a}>{uiText(a)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">{uiText("Simulated photo attachment")}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{uiText("Cancel")}</Button>
            <Button onClick={() => {
              if (!form.note.trim()) { toast.error(uiText('Observation note required.')); return; }
              addObservation({ projectId: form.projectId, observer: currentUser?.name ?? 'Observer', date: new Date().toISOString().slice(0, 10), category: form.category, note: form.note, recommendedAction: form.recommendedAction, status: 'OPEN', imageSeed: Math.floor(Math.random() * 99999) });
              toast.success(uiText('Observation recorded.')); setOpen(false); setForm({ ...form, note: '' });
            }}>{uiText("Submit Observation")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
