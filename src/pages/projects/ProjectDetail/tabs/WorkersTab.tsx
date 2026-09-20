import { uiMessage, uiText, useUiLanguage } from '../../../../i18n/ui';
import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, QrCode, Users, ShieldCheck } from 'lucide-react';
import type { Project, WorkerRole } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, Button, StatusBadge, Table, THead, TBody, Tr, Th, Td, Input } from '../../../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Dialog, DialogContent, DialogFooter } from '../../../../components/ui/overlays';
import { Avatar } from '../../../../components/ui/forms';

const ROLES: WorkerRole[] = ['Mason', 'Electrician', 'Plumber', 'Carpenter', 'Steel Worker', 'Equipment Operator', 'General Worker', 'Safety Worker'];

export function WorkersTab({ project }: { project: Project }) {
  useUiLanguage();
  const workers = useStore((s) => s.workers).filter((w) => w.projectId === project.id);
  const addWorker = useStore((s) => s.addWorker);
  const markAttendance = useStore((s) => s.markAttendance);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'Mason' as WorkerRole, skillLevel: 'Skilled' as const, shift: 'Day' as const });

  const present = workers.filter((w) => w.attendanceStatus === 'PRESENT').length;
  const skilled = workers.filter((w) => w.skillLevel === 'Skilled').length;
  const trainingPending = workers.filter((w) => w.safetyTrainingStatus !== 'COMPLETED').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label={uiText("On Site")} value={present} icon={Users} />
        <StatBox label={uiText("Absent")} value={workers.length - present} icon={Users} tone="red" />
        <StatBox label={uiText("Skilled")} value={skilled} icon={ShieldCheck} tone="blue" />
        <StatBox label={uiText("Safety Training Pending")} value={trainingPending} icon={ShieldCheck} tone="amber" />
      </div>

      <div className="flex justify-end"><Button onClick={() => setAddOpen(true)}><Plus size={15} />{uiText(" Add Worker")}</Button></div>

      <Card>
        <Table>
          <THead><Tr><Th>{uiText("Worker")}</Th><Th>{uiText("Role")}</Th><Th>{uiText("Skill")}</Th><Th>{uiText("Shift")}</Th><Th>{uiText("Attendance")}</Th><Th>{uiText("Safety Training")}</Th><Th /></Tr></THead>
          <TBody>
            {workers.map((w) => (
              <Tr key={w.id}>
                <Td><div className="flex items-center gap-2"><Avatar name={w.name} size={26} /><span className="font-medium text-slate-800">{w.name}</span></div></Td>
                <Td>{uiText(w.role)}</Td>
                <Td>{uiText(w.skillLevel)}</Td>
                <Td>{uiText(w.shift)}</Td>
                <Td><StatusBadge status={w.attendanceStatus === 'PRESENT' ? 'APPROVED' : w.attendanceStatus === 'ABSENT' ? 'OPEN' : 'PENDING'} label={uiText(w.attendanceStatus.replace('_', ' '))} /></Td>
                <Td><StatusBadge status={w.safetyTrainingStatus} /></Td>
                <Td>
                  {w.attendanceStatus !== 'PRESENT' && (
                    <Button size="sm" variant="outline" onClick={() => { try {  markAttendance(w.id, project.id, 'QR'); toast.success(uiMessage("Attendance marked for {{0}} via QR check-in.", [w.name]));  } catch (error) { toast.error(uiText((error as Error).message)); } }}>
                      <QrCode size={12} />{uiText(" Check-in")}</Button>
                  )}
                </Td>
              </Tr>
            ))}
            {workers.length === 0 && <Tr><Td className="py-8 text-center text-slate-400"><span>{uiText("No workers assigned to this project.")}</span></Td></Tr>}
          </TBody>
        </Table>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent title={uiText("Add Worker")} description={uiText(project.name)}>
          <div className="space-y-3">
            <div><p className="mb-1 text-xs font-medium text-slate-600">{uiText("Name")}</p><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">{uiText("Role")}</p>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as WorkerRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{uiText(r)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{uiText("Cancel")}</Button>
            <Button onClick={() => {
              if (!form.name.trim()) { toast.error(uiText('Worker name required.')); return; }
              addWorker({ name: form.name, role: form.role, contractorId: project.contractorId, projectId: project.id, skillLevel: form.skillLevel, shift: form.shift, attendanceStatus: 'PRESENT', safetyTrainingStatus: 'PENDING', phone: `9${Math.floor(100000000 + Math.random() * 899999999)}`, joinDate: new Date().toISOString().slice(0, 10) });
              toast.success(uiText('Worker added.')); setAddOpen(false); setForm({ ...form, name: '' });
            }}>{uiText("Add Worker")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBox({ label, value, icon: Icon, tone = 'default' }: { label: string; value: number; icon: any; tone?: 'default' | 'red' | 'blue' | 'amber' }) {
  useUiLanguage();
  const tones: Record<string, string> = { default: 'text-slate-600', red: 'text-red-600', blue: 'text-blue-600', amber: 'text-amber-600' };
  return (
    <div className="ui-card rounded-lg border border-slate-200 bg-white p-3.5">
      <p className="flex items-center gap-1 text-[10.5px] font-medium uppercase text-slate-400"><Icon size={11} /> {uiText(label)}</p>
      <p className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</p>
    </div>
  );
}
