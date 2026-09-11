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
        <StatBox label="On Site" value={present} icon={Users} />
        <StatBox label="Absent" value={workers.length - present} icon={Users} tone="red" />
        <StatBox label="Skilled" value={skilled} icon={ShieldCheck} tone="blue" />
        <StatBox label="Safety Training Pending" value={trainingPending} icon={ShieldCheck} tone="amber" />
      </div>

      <div className="flex justify-end"><Button onClick={() => setAddOpen(true)}><Plus size={15} /> Add Worker</Button></div>

      <Card>
        <Table>
          <THead><Tr><Th>Worker</Th><Th>Role</Th><Th>Skill</Th><Th>Shift</Th><Th>Attendance</Th><Th>Safety Training</Th><Th /></Tr></THead>
          <TBody>
            {workers.map((w) => (
              <Tr key={w.id}>
                <Td><div className="flex items-center gap-2"><Avatar name={w.name} size={26} /><span className="font-medium text-slate-800">{w.name}</span></div></Td>
                <Td>{w.role}</Td>
                <Td>{w.skillLevel}</Td>
                <Td>{w.shift}</Td>
                <Td><StatusBadge status={w.attendanceStatus === 'PRESENT' ? 'APPROVED' : w.attendanceStatus === 'ABSENT' ? 'OPEN' : 'PENDING'} label={w.attendanceStatus.replace('_', ' ')} /></Td>
                <Td><StatusBadge status={w.safetyTrainingStatus} /></Td>
                <Td>
                  {w.attendanceStatus !== 'PRESENT' && (
                    <Button size="sm" variant="outline" onClick={() => { markAttendance(w.id, project.id, 'QR'); toast.success(`Attendance marked for ${w.name} via QR check-in.`); }}>
                      <QrCode size={12} /> Check-in
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
            {workers.length === 0 && <Tr><Td className="py-8 text-center text-slate-400"><span>No workers assigned to this project.</span></Td></Tr>}
          </TBody>
        </Table>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent title="Add Worker" description={project.name}>
          <div className="space-y-3">
            <div><p className="mb-1 text-xs font-medium text-slate-600">Name</p><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Role</p>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as WorkerRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!form.name.trim()) { toast.error('Worker name required.'); return; }
              addWorker({ name: form.name, role: form.role, contractorId: project.contractorId, projectId: project.id, skillLevel: form.skillLevel, shift: form.shift, attendanceStatus: 'PRESENT', safetyTrainingStatus: 'PENDING', phone: `9${Math.floor(100000000 + Math.random() * 899999999)}`, joinDate: new Date().toISOString().slice(0, 10) });
              toast.success('Worker added.'); setAddOpen(false); setForm({ ...form, name: '' });
            }}>Add Worker</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBox({ label, value, icon: Icon, tone = 'default' }: { label: string; value: number; icon: any; tone?: 'default' | 'red' | 'blue' | 'amber' }) {
  const tones: Record<string, string> = { default: 'text-slate-600', red: 'text-red-600', blue: 'text-blue-600', amber: 'text-amber-600' };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3.5">
      <p className="flex items-center gap-1 text-[10.5px] font-medium uppercase text-slate-400"><Icon size={11} /> {label}</p>
      <p className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</p>
    </div>
  );
}
