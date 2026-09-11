import { useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import type { Project, SafetyRecordType, DefectSeverity } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, Button, StatusBadge, SeverityBadge, Table, THead, TBody, Tr, Th, Td, Input, Textarea } from '../../../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Dialog, DialogContent, DialogFooter } from '../../../../components/ui/overlays';
import { formatDate } from '../../../../lib/utils';

const SAFETY_TYPES: SafetyRecordType[] = ['INSPECTION', 'ACCIDENT', 'NEAR_MISS', 'VIOLATION', 'TRAINING'];
const SEVERITIES: DefectSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export function SafetyTab({ project }: { project: Project }) {
  const records = useStore((s) => s.safetyRecords).filter((r) => r.projectId === project.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const addSafetyRecord = useStore((s) => s.addSafetyRecord);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'INSPECTION' as SafetyRecordType, description: '', severity: 'LOW' as DefectSeverity, ppeCompliance: 90 });

  const avgPpe = records.length ? Math.round(records.reduce((s, r) => s + r.ppeCompliance, 0) / records.length) : 0;
  const openIssues = records.filter((r) => r.status === 'OPEN').length;
  const criticalCount = records.filter((r) => r.severity === 'CRITICAL').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="PPE Compliance" value={`${avgPpe}%`} />
        <MiniStat label="Open Issues" value={openIssues} />
        <MiniStat label="Critical Records" value={criticalCount} tone="red" />
        <MiniStat label="Total Records" value={records.length} />
      </div>
      <div className="flex justify-end"><Button onClick={() => setOpen(true)}><Plus size={15} /> Log Safety Record</Button></div>

      <Card>
        <Table>
          <THead><Tr><Th>Type</Th><Th>Date</Th><Th>Description</Th><Th>Severity</Th><Th>PPE %</Th><Th>Status</Th></Tr></THead>
          <TBody>
            {records.map((r) => (
              <Tr key={r.id}>
                <Td className="font-medium text-slate-800">{r.type.replace('_', ' ')}</Td>
                <Td>{formatDate(r.date)}</Td>
                <Td className="max-w-[260px] truncate">{r.description}</Td>
                <Td><SeverityBadge severity={r.severity} /></Td>
                <Td>{r.ppeCompliance}%</Td>
                <Td><StatusBadge status={r.status} /></Td>
              </Tr>
            ))}
            {records.length === 0 && <Tr><Td className="py-8 text-center text-slate-400"><span>No safety records logged.</span></Td></Tr>}
          </TBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Log Safety Record" description={project.name}>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Type</p>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as SafetyRecordType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SAFETY_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Severity</p>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as DefectSeverity })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><p className="mb-1 text-xs font-medium text-slate-600">Description</p><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              addSafetyRecord({ projectId: project.id, type: form.type, date: new Date().toISOString().slice(0, 10), description: form.description || 'Safety record logged.', severity: form.severity, correctiveAction: '', status: 'OPEN', ppeCompliance: form.ppeCompliance });
              toast.success('Safety record logged.'); setOpen(false);
            }}>Log Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function RisksTab({ project }: { project: Project }) {
  const risks = useStore((s) => s.risks).filter((r) => r.projectId === project.id).sort((a, b) => b.score - a.score);
  const users = useStore((s) => s.users);
  const createRisk = useStore((s) => s.createRisk);
  const updateRiskStatus = useStore((s) => s.updateRiskStatus);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ risk: '', category: 'Financial', probability: 3, impact: 3, mitigation: '', dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) });

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setOpen(true)}><Plus size={15} /> Add Risk</Button></div>
      <Card>
        <Table>
          <THead><Tr><Th>Risk</Th><Th>Category</Th><Th>Score</Th><Th>Level</Th><Th>Owner</Th><Th>Due</Th><Th>Status</Th><Th /></Tr></THead>
          <TBody>
            {risks.map((r) => (
              <Tr key={r.id}>
                <Td className="max-w-[200px] truncate font-medium text-slate-800">{r.risk}</Td>
                <Td>{r.category}</Td>
                <Td>{r.score}</Td>
                <Td><StatusBadge status={r.level} /></Td>
                <Td>{r.owner}</Td>
                <Td>{formatDate(r.dueDate)}</Td>
                <Td><StatusBadge status={r.status} /></Td>
                <Td>{r.status === 'OPEN' && <Button size="sm" variant="outline" onClick={() => { updateRiskStatus(r.id, 'MITIGATED'); toast.success('Risk marked as mitigated.'); }}>Mitigate</Button>}</Td>
              </Tr>
            ))}
            {risks.length === 0 && <Tr><Td className="py-8 text-center text-slate-400"><span>No risks recorded.</span></Td></Tr>}
          </TBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Add Risk Register Entry" description={project.name}>
          <div className="space-y-3">
            <div><p className="mb-1 text-xs font-medium text-slate-600">Risk Description</p><Input value={form.risk} onChange={(e) => setForm({ ...form, risk: e.target.value })} placeholder="e.g. Monsoon delay to structural works" /></div>
            <div><p className="mb-1 text-xs font-medium text-slate-600">Category</p><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="mb-1 text-xs font-medium text-slate-600">Probability (1-5)</p><Input type="number" min={1} max={5} value={form.probability} onChange={(e) => setForm({ ...form, probability: +e.target.value })} /></div>
              <div><p className="mb-1 text-xs font-medium text-slate-600">Impact (1-5)</p><Input type="number" min={1} max={5} value={form.impact} onChange={(e) => setForm({ ...form, impact: +e.target.value })} /></div>
            </div>
            <div><p className="mb-1 text-xs font-medium text-slate-600">Mitigation Plan</p><Input value={form.mitigation} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!form.risk.trim()) { toast.error('Risk description required.'); return; }
              createRisk({ projectId: project.id, risk: form.risk, category: form.category, probability: form.probability, impact: form.impact, owner: users.find((u) => u.id === project.executiveEngineerId)?.name ?? 'Executive Engineer', mitigation: form.mitigation || 'To be planned.', dueDate: form.dueDate, status: 'OPEN' });
              toast.success('Risk added to register.'); setOpen(false);
            }}>Add Risk</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniStat({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'red' }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3.5">
      <p className="text-[10.5px] font-medium uppercase text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === 'red' ? 'text-red-600' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}
