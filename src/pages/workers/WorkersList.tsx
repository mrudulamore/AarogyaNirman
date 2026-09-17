import { uiMessage, uiText, useUiLanguage } from '../../i18n/ui';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { QrCode, Users } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip } from 'recharts';
import { useStore } from '../../store/useStore';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, Button, StatusBadge, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Avatar } from '../../components/ui/forms';

export function WorkersList() {
  useUiLanguage();
  const { t } = useTranslation();
  const workers = useStore((s) => s.workers);
  const projects = useStore((s) => s.projects);
  const attendance = useStore((s) => s.attendance);
  const markAttendance = useStore((s) => s.markAttendance);
  const [projectFilter, setProjectFilter] = useState('ALL');

  const filtered = projectFilter === 'ALL' ? workers : workers.filter((w) => w.projectId === projectFilter);
  const present = filtered.filter((w) => w.attendanceStatus === 'PRESENT').length;
  const skilled = filtered.filter((w) => w.skillLevel === 'Skilled').length;
  const unskilled = filtered.filter((w) => w.skillLevel === 'Unskilled').length;
  const trainingPending = filtered.filter((w) => w.safetyTrainingStatus !== 'COMPLETED').length;

  const trend = useMemo(() => {
    const days = [...Array(7)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      const count = attendance.filter((a) => a.date === key).length;
      return { day: d.toLocaleDateString('en-IN', { weekday: 'short' }), count };
    });
    return days;
  }, [attendance]);

  return (
    <div>
      <PageHeader title={uiText(t('pages.workers.title'))} description={uiText(t('pages.workers.desc', { count: workers.length }))} />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label={uiText("On Site")} value={present} icon={Users} />
        <MiniStat label={uiText("Skilled")} value={skilled} />
        <MiniStat label={uiText("Unskilled")} value={unskilled} />
        <MiniStat label={uiText("Safety Training Pending")} value={trainingPending} tone="amber" />
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle>{uiText("Daily Workforce Trend")}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 10 }} />
              <RTooltip />
              <Line type="monotone" dataKey="count" stroke="#265aa0" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="mb-3"><Select value={projectFilter} onValueChange={setProjectFilter}>
        <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="ALL">{uiText("All Projects")}</SelectItem>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
      </Select></div>

      <Card>
        <Table>
          <THead><Tr><Th>{uiText("Worker")}</Th><Th>{uiText("Role")}</Th><Th>{uiText("Project")}</Th><Th>{uiText("Skill")}</Th><Th>{uiText("Shift")}</Th><Th>{uiText("Attendance")}</Th><Th>{uiText("Safety Training")}</Th><Th /></Tr></THead>
          <TBody>
            {filtered.map((w) => (
              <Tr key={w.id}>
                <Td><div className="flex items-center gap-2"><Avatar name={w.name} size={26} /><span className="font-medium text-slate-800">{w.name}</span></div></Td>
                <Td>{uiText(w.role)}</Td>
                <Td className="max-w-[160px] truncate">{projects.find((p) => p.id === w.projectId)?.name}</Td>
                <Td>{uiText(w.skillLevel)}</Td>
                <Td>{uiText(w.shift)}</Td>
                <Td><StatusBadge status={w.attendanceStatus === 'PRESENT' ? 'APPROVED' : w.attendanceStatus === 'ABSENT' ? 'OPEN' : 'PENDING'} label={uiText(w.attendanceStatus.replace('_', ' '))} /></Td>
                <Td><StatusBadge status={w.safetyTrainingStatus} /></Td>
                <Td>{w.attendanceStatus !== 'PRESENT' && <Button size="sm" variant="outline" onClick={() => { markAttendance(w.id, w.projectId, 'QR'); toast.success(uiMessage("{{0}} checked in.", [w.name])); }}><QrCode size={12} />{uiText(" Check-in")}</Button>}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, tone = 'default' }: { label: string; value: number; icon?: any; tone?: 'default' | 'amber' }) {
  useUiLanguage();
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3.5">
      <p className="flex items-center gap-1 text-[10.5px] font-medium uppercase text-slate-400">{Icon && <Icon size={11} />} {uiText(label)}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === 'amber' ? 'text-amber-600' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}
