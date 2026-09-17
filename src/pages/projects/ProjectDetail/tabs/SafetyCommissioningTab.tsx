import { uiMessage, uiText, useUiLanguage } from '../../../../i18n/ui';
import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, ShieldCheck, HardHat } from 'lucide-react';
import type { Project, SafetyRecordType, DefectSeverity } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardHeader, CardTitle, Button, StatusBadge, SeverityBadge, Table, THead, TBody, Tr, Th, Td, Input, Textarea } from '../../../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Dialog, DialogContent, DialogFooter } from '../../../../components/ui/overlays';
import { KpiCard } from '../../../../components/common/KpiCard';
import { formatDate, cn } from '../../../../lib/utils';

const SAFETY_TYPES: SafetyRecordType[] = ['INSPECTION', 'ACCIDENT', 'NEAR_MISS', 'VIOLATION', 'TRAINING'];
const SEVERITIES: DefectSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/** Part 16: Safety and Commissioning combined into one tab, two clear sections, answering
 * "Is the site/system safe and ready?" */
export function SafetyCommissioningTab({ project }: { project: Project }) {
  useUiLanguage();
  const currentUser = useStore((s) => s.currentUser);
  const records = useStore((s) => s.safetyRecords).filter((r) => r.projectId === project.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const addSafetyRecord = useStore((s) => s.addSafetyRecord);
  const items = useStore((s) => s.commissioning).filter((c) => c.projectId === project.id);
  const updateCommissioningItem = useStore((s) => s.updateCommissioningItem);
  const readOnly = currentUser?.role === 'MINISTER' || currentUser?.role === 'VIGILANCE_AUDIT' || currentUser?.role === 'MEDICAL_OFFICER';

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'INSPECTION' as SafetyRecordType, description: '', severity: 'LOW' as DefectSeverity, ppeCompliance: 90 });

  const avgPpe = records.length ? Math.round(records.reduce((s, r) => s + r.ppeCompliance, 0) / records.length) : 0;
  const openIssues = records.filter((r) => r.status === 'OPEN').length;
  const criticalCount = records.filter((r) => r.severity === 'CRITICAL' && r.status === 'OPEN').length;
  const readyCount = items.filter((i) => i.status === 'READY').length;
  const pendingCount = items.filter((i) => i.status === 'PENDING').length;
  const failedCount = items.filter((i) => i.status === 'NOT_READY').length;
  const readinessPct = items.length ? Math.round((readyCount / items.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <KpiCard label={uiText("Safety Inspections")} value={records.filter((r) => r.type === 'INSPECTION').length} icon={ShieldCheck} />
        <KpiCard label={uiText("Open Safety Issues")} value={openIssues} icon={ShieldCheck} tone="amber" />
        <KpiCard label={uiText("Critical Safety Issues")} value={criticalCount} icon={ShieldCheck} tone={criticalCount > 0 ? 'red' : 'default'} />
        <KpiCard label={uiText("PPE Compliance")} value={`${avgPpe}%`} icon={HardHat} />
        <KpiCard label={uiText("Commissioning Systems")} value={items.length} icon={HardHat} />
        <KpiCard label={uiText("Passed")} value={readyCount} icon={HardHat} tone="emerald" />
        <KpiCard label={uiText("Pending")} value={pendingCount} icon={HardHat} tone="amber" />
        <KpiCard label={uiText("Handover Readiness")} value={`${readinessPct}%`} icon={HardHat} tone={readinessPct === 100 ? 'emerald' : 'default'} />
      </div>

      {/* ---------------- SAFETY ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{uiText("Safety")}</CardTitle>
          {!readOnly && <Button size="sm" onClick={() => setOpen(true)}><Plus size={13} />{uiText(" Log Safety Record")}</Button>}
        </CardHeader>
        <Table>
          <THead><Tr><Th>{uiText("Type")}</Th><Th>{uiText("Date")}</Th><Th>{uiText("Description")}</Th><Th>{uiText("Severity")}</Th><Th>{uiText("PPE %")}</Th><Th>{uiText("Status")}</Th></Tr></THead>
          <TBody>
            {records.map((r) => (
              <Tr key={r.id}>
                <Td className="font-medium text-slate-800">{uiText(r.type.replace('_', ' '))}</Td>
                <Td>{uiText(formatDate(r.date))}</Td>
                <Td className="max-w-[260px] truncate">{r.description}</Td>
                <Td><SeverityBadge severity={r.severity} /></Td>
                <Td>{r.ppeCompliance}%</Td>
                <Td><StatusBadge status={r.status} /></Td>
              </Tr>
            ))}
            {records.length === 0 && <Tr><Td className="py-8 text-center text-slate-400"><span>{uiText("No safety records logged.")}</span></Td></Tr>}
          </TBody>
        </Table>
      </Card>

      {/* ---------------- COMMISSIONING ---------------- */}
      <Card>
        <CardHeader><CardTitle>{uiText("Commissioning Readiness — ")}{readyCount}/{items.length}{uiText(" Ready")}{uiText(failedCount > 0 ? ` · ${failedCount} not ready` : '')}</CardTitle></CardHeader>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">{uiText(item.item)}</p>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-1 text-[10.5px] text-slate-400">{item.remarks}</p>
              {!readOnly && (
                <div className="mt-2 flex gap-1.5">
                  {(['READY', 'PENDING', 'NOT_READY'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => { try {  updateCommissioningItem(item.id, st, st === 'READY' ? 'Verified and ready.' : st === 'PENDING' ? 'Under final verification.' : 'Not ready.'); if (st === 'READY') toast.success(uiMessage("{{0}} marked ready.", [item.item]));  } catch (error) { toast.error(uiText((error as Error).message)); } }}
                      className={cn('rounded px-2 py-0.5 text-[10px] font-medium', item.status === st ? 'bg-navy-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}
                    >
                      {uiText(st.replace('_', ' '))}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={uiText("Log Safety Record")} description={uiText(project.name)}>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">{uiText("Type")}</p>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as SafetyRecordType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SAFETY_TYPES.map((t) => <SelectItem key={t} value={t}>{uiText(t.replace('_', ' '))}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">{uiText("Severity")}</p>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as DefectSeverity })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{uiText(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><p className="mb-1 text-xs font-medium text-slate-600">{uiText("Description")}</p><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><p className="mb-1 text-xs font-medium text-slate-600">{uiText("PPE Compliance %")}</p><Input type="number" min={0} max={100} value={form.ppeCompliance} onChange={(e) => setForm({ ...form, ppeCompliance: +e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{uiText("Cancel")}</Button>
            <Button onClick={() => {
              addSafetyRecord({ projectId: project.id, type: form.type, date: new Date().toISOString().slice(0, 10), description: form.description || 'Safety record logged.', severity: form.severity, correctiveAction: '', status: 'OPEN', ppeCompliance: form.ppeCompliance });
              toast.success(uiText('Safety record logged.')); setOpen(false);
            }}>{uiText("Log Record")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
