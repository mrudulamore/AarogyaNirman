import { toast } from 'sonner';
import { CheckCircle2, HardHat } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { todayDate } from '../../lib/fundDisbursal';
import { Button, Card, CardContent } from '../../components/ui/primitives';
import { uiText, useUiLanguage } from '../../i18n/ui';

export function WorkforceHome() {
  useUiLanguage();
  const s = useStore();
  const worker = s.workers.find(w => w.id === s.currentUser?.workerId);
  if (!worker) return <p>{uiText('No worker account assigned. Contact your site supervisor.')}</p>;
  const site = s.projects.find(p => p.id === worker.projectId);
  const history = s.attendance.filter(a => a.workerId === worker.id).sort((a,b) => b.date.localeCompare(a.date));
  const today = history.find(a => a.date === todayDate());
  return <div className="mx-auto max-w-lg space-y-4">
    <div><p className="text-xs font-semibold text-blue-600">{uiText('Workforce')}</p><h1 className="mt-1 text-xl font-semibold text-slate-800">{worker.name}</h1><p className="text-sm text-slate-500">{uiText(worker.role)} / {uiText(worker.shift)} {uiText('shift')}</p></div>
    <Card><CardContent className="space-y-4 p-5"><HardHat size={26} className="text-blue-600" /><div><p className="text-xs text-slate-500">{uiText('Assigned site')}</p><p className="font-medium text-slate-800">{site?.name ?? uiText('Not assigned')}</p></div><p className="text-sm">{todayDate()}</p>
      {today ? <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={18} />{uiText('Attendance marked')} / {today.checkIn}</p> : <Button className="w-full" size="lg" disabled={!site} onClick={() => { try { s.markAttendance(worker.id, worker.projectId, 'MANUAL'); toast.success(uiText('Attendance marked')); } catch(e) { toast.error(uiText((e as Error).message)); } }}>{uiText('Mark my attendance')}</Button>}
      <p className="text-xs text-slate-500">{uiText('Self check-in is recorded on this device. Contact your supervisor for corrections.')}</p>
    </CardContent></Card>
    <Card><CardContent className="p-4"><h2 className="mb-3 text-sm font-semibold">{uiText('My recent attendance')}</h2>{!history.length && <p className="text-sm text-slate-500">{uiText('No attendance recorded yet.')}</p>}{history.slice(0, 14).map(a => <div key={a.id} className="flex justify-between border-b border-slate-100 py-3 text-sm"><span>{a.date}</span><span>{a.checkIn ?? '-'} / {uiText(a.shift)}</span></div>)}</CardContent></Card>
    <p className="px-1 text-xs text-slate-500">{uiText('Safety training')}: {uiText(worker.safetyTrainingStatus)}</p>
  </div>;
}
