import { uiText, useUiLanguage } from '../../i18n/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { Card, Button, ProgressBar, Table, THead, TBody, Tr, Th, Td, Input } from '../../components/ui/primitives';
import { Dialog, DialogContent, DialogFooter } from '../../components/ui/overlays';
import { formatCurrency, formatDate } from '../../lib/utils';

export function ContractorsList() {
  useUiLanguage();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const contractors = useStore((s) => s.contractors);
  const projects = useStore((s) => s.projects);
  const addContractor = useStore((s) => s.addContractor);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ company: '', contactPerson: '', phone: '', email: '' });

  const active = contractors.find((c) => c.id === detailId);

  return (
    <div>
      <PageHeader title={uiText(t('pages.contractors.title'))} description={uiText(t('pages.contractors.desc', { count: contractors.length }))} actions={<Button onClick={() => setAddOpen(true)}><Plus size={15} />{uiText(" Add Contractor")}</Button>} />

      <Card>
        <Table>
          <THead><Tr><Th>{uiText("Company")}</Th><Th>{uiText("Reg. ID")}</Th><Th>{uiText("Assigned Projects")}</Th><Th>{uiText("Contract Amount")}</Th><Th>{uiText("Performance")}</Th><Th>{uiText("Open Defects")}</Th></Tr></THead>
          <TBody>
            {contractors.map((c) => (
              <Tr key={c.id} onClick={() => setDetailId(c.id)}>
                <Td className="font-medium text-slate-800">{uiText(c.company)}</Td>
                <Td className="font-mono text-[11px]">{uiText(c.regId)}</Td>
                <Td>{c.assignedProjectIds.length}</Td>
                <Td>{uiText(formatCurrency(c.contractAmount))}</Td>
                <Td><div className="flex items-center gap-2"><ProgressBar value={c.performanceScore} className="h-1.5 w-16" /><span className="text-xs">{c.performanceScore}%</span></div></Td>
                <Td>{c.openDefects}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>

      <Dialog open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)}>
        {active && (
          <DialogContent title={uiText(active.company)} description={uiText(active.regId)} size="lg">
            <button onClick={() => navigate(`/contractors/${active.id}`)} className="mb-3 text-xs font-medium text-navy-700 underline">{uiText("View full 360° profile →")}</button>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 text-xs">
                <Row label={uiText("Contact Person")} value={active.contactPerson} />
                <Row label={uiText("Phone")} value={active.phone} />
                <Row label={uiText("Email")} value={active.email} />
                <Row label={uiText("Contract Amount")} value={formatCurrency(active.contractAmount)} />
                <Row label={uiText("Period")} value={`${formatDate(active.startDate)} — ${formatDate(active.endDate)}`} />
                <Row label={uiText("Open Defects")} value={String(active.openDefects)} />
                <Row label={uiText("Delays Recorded")} value={String(active.delaysCount)} />
              </div>
              <div className="space-y-3">
                {[{ l: 'Schedule Adherence', v: active.scheduleAdherence }, { l: 'Quality Score', v: active.qualityScoreAvg }, { l: 'Safety Score', v: active.safetyScore }, { l: 'Bill Processing', v: active.billProcessingScore }].map((m) => (
                  <div key={m.l}><div className="mb-1 flex justify-between text-[11px] text-slate-500"><span>{uiText(m.l)}</span><span className="font-medium">{m.v}%</span></div><ProgressBar value={m.v} /></div>
                ))}
              </div>
            </div>
            <p className="mb-2 mt-4 text-xs font-semibold text-slate-600">{uiText("Assigned Projects")}</p>
            <div className="flex flex-wrap gap-1.5">
              {active.assignedProjectIds.map((pid) => {
                const p = projects.find((x) => x.id === pid);
                return p && <button key={pid} onClick={() => navigate(`/projects/${pid}`)} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100">{p.name}</button>;
              })}
            </div>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent title={uiText("Add Contractor")} description={uiText("Register a new empanelled contracting agency")}>
          <div className="space-y-3">
            <div><p className="mb-1 text-xs font-medium text-slate-600">{uiText("Company Name")}</p><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <div><p className="mb-1 text-xs font-medium text-slate-600">{uiText("Contact Person")}</p><Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="mb-1 text-xs font-medium text-slate-600">{uiText("Phone")}</p><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><p className="mb-1 text-xs font-medium text-slate-600">{uiText("Email")}</p><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{uiText("Cancel")}</Button>
            <Button onClick={() => {
              if (!form.company.trim()) { toast.error(uiText('Company name required.')); return; }
              addContractor({ company: form.company, regId: `MH/PWD/CONT/2026/${Math.floor(1000 + Math.random() * 8999)}`, classification: 'Class 2', status: 'ACTIVE', contactPerson: form.contactPerson, phone: form.phone, email: form.email, assignedProjectIds: [], contractAmount: 0, startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), performanceScore: 70, scheduleAdherence: 70, qualityScoreAvg: 70, safetyScore: 70, billProcessingScore: 70, openDefects: 0, delaysCount: 0 });
              toast.success(uiText('Contractor registered.')); setAddOpen(false);
            }}>{uiText("Add Contractor")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  useUiLanguage();
  return <div className="flex justify-between border-b border-slate-50 pb-1.5"><span className="text-slate-400">{uiText(label)}</span><span className="font-medium text-slate-700">{uiText(value)}</span></div>;
}
