import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, FileCheck2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip } from 'recharts';
import type { Project } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardContent, CardHeader, CardTitle, Button, StatusBadge, Table, THead, TBody, Tr, Th, Td, Input } from '../../../../components/ui/primitives';
import { Dialog, DialogContent, DialogFooter } from '../../../../components/ui/overlays';
import { formatCurrency, formatCurrencyFull, formatDate } from '../../../../lib/utils';

export function BillsTab({ project }: { project: Project }) {
  const bills = useStore((s) => s.bills).filter((b) => b.projectId === project.id).sort((a, b) => (a.submittedDate < b.submittedDate ? 1 : -1));
  const measurements = useStore((s) => s.measurements).filter((m) => m.projectId === project.id);
  const currentUser = useStore((s) => s.currentUser);
  const submitBill = useStore((s) => s.submitBill);
  const verifyBillSite = useStore((s) => s.verifyBillSite);
  const verifyBillQuality = useStore((s) => s.verifyBillQuality);
  const approveBill = useStore((s) => s.approveBill);
  const rejectBill = useStore((s) => s.rejectBill);
  const markBillPaid = useStore((s) => s.markBillPaid);
  const verifyMeasurement = useStore((s) => s.verifyMeasurement);

  const [submitOpen, setSubmitOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState({ periodFrom: '', periodTo: '', grossAmount: 2000000 });

  const active = bills.find((b) => b.id === detailId);
  const activeMeasurements = measurements.filter((m) => m.billId === detailId);

  function submit() {
    const gross = form.grossAmount;
    const deductions = Math.round(gross * 0.02);
    const gst = Math.round(gross * 0.18);
    const retention = Math.round(gross * 0.05);
    submitBill({
      billNumber: `RA/${project.district.slice(0, 3).toUpperCase()}/${100 + bills.length + 1}`,
      contractorId: project.contractorId, projectId: project.id, periodFrom: form.periodFrom || new Date().toISOString().slice(0, 10),
      periodTo: form.periodTo || new Date().toISOString().slice(0, 10), grossAmount: gross, deductions, gst, retention, penalty: 0,
      netPayable: gross - deductions + gst - retention,
    });
    toast.success('RA Bill submitted for verification and approval.');
    setSubmitOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setSubmitOpen(true)}><Plus size={15} /> Submit RA Bill</Button></div>

      <Card>
        <Table>
          <THead><Tr><Th>Bill No.</Th><Th>Period</Th><Th>Gross</Th><Th>Net Payable</Th><Th>Status</Th><Th /></Tr></THead>
          <TBody>
            {bills.map((b) => (
              <Tr key={b.id} onClick={() => setDetailId(b.id)}>
                <Td className="font-medium text-slate-800">{b.billNumber}</Td>
                <Td>{formatDate(b.periodFrom)} — {formatDate(b.periodTo)}</Td>
                <Td>{formatCurrency(b.grossAmount)}</Td>
                <Td className="font-semibold">{formatCurrency(b.netPayable)}</Td>
                <Td><StatusBadge status={b.status} /></Td>
                <Td className="space-x-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  {b.status === 'SUBMITTED' && <Button size="sm" variant="outline" onClick={() => { verifyBillSite(b.id); toast.success('Site-verified.'); }}>Site Verify</Button>}
                  {b.status === 'SITE_VERIFIED' && <Button size="sm" variant="outline" onClick={() => { verifyBillQuality(b.id); toast.success('Quality-verified.'); }}>Quality Verify</Button>}
                  {b.status === 'QUALITY_VERIFIED' && <Button size="sm" onClick={() => { approveBill(b.id); toast.success('Bill approved.'); }}>Approve</Button>}
                  {b.status === 'APPROVED' && <Button size="sm" variant="success" onClick={() => { markBillPaid(b.id); toast.success('Payment released. Financial progress updated.'); }}>Mark Paid</Button>}
                  {['SUBMITTED', 'SITE_VERIFIED', 'QUALITY_VERIFIED'].includes(b.status) && <Button size="sm" variant="destructive" onClick={() => { rejectBill(b.id, 'Discrepancy in measurement'); toast.error('Bill rejected.'); }}>Reject</Button>}
                </Td>
              </Tr>
            ))}
            {bills.length === 0 && <Tr><Td className="py-8 text-center text-slate-400"><span>No bills submitted yet.</span></Td></Tr>}
          </TBody>
        </Table>
      </Card>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent title="Submit RA Bill" description={project.name}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="mb-1 text-xs font-medium text-slate-600">Period From</p><Input type="date" value={form.periodFrom} onChange={(e) => setForm({ ...form, periodFrom: e.target.value })} /></div>
              <div><p className="mb-1 text-xs font-medium text-slate-600">Period To</p><Input type="date" value={form.periodTo} onChange={(e) => setForm({ ...form, periodTo: e.target.value })} /></div>
            </div>
            <div><p className="mb-1 text-xs font-medium text-slate-600">Gross Amount (₹)</p><Input type="number" value={form.grossAmount} onChange={(e) => setForm({ ...form, grossAmount: +e.target.value })} /></div>
            <p className="text-[11px] text-slate-400">Deductions (2%), GST (18%) and retention (5%) will be computed automatically.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Submit Bill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)}>
        {active && (
          <DialogContent title={active.billNumber} description={project.name} size="lg">
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <Row label="Gross Amount" value={formatCurrencyFull(active.grossAmount)} />
              <Row label="Deductions" value={formatCurrencyFull(active.deductions)} />
              <Row label="GST" value={formatCurrencyFull(active.gst)} />
              <Row label="Retention" value={formatCurrencyFull(active.retention)} />
              <Row label="Penalty" value={formatCurrencyFull(active.penalty)} />
              <Row label="Net Payable" value={formatCurrencyFull(active.netPayable)} />
              <Row label="Site Verified By" value={active.siteVerifiedBy ?? '—'} />
              <Row label="Quality Verified By" value={active.qualityVerifiedBy ?? '—'} />
            </div>
            <p className="mt-4 mb-2 text-xs font-semibold text-slate-600">Measurement Book Extract</p>
            <Table>
              <THead><Tr><Th>Work Item</Th><Th>Unit</Th><Th>Previous</Th><Th>Current</Th><Th>Total</Th><Th>Rate</Th><Th>Amount</Th><Th /></Tr></THead>
              <TBody>
                {activeMeasurements.map((m) => (
                  <Tr key={m.id}>
                    <Td>{m.workItem}</Td><Td>{m.unit}</Td><Td>{m.previousQty}</Td><Td>{m.currentQty}</Td><Td>{m.totalQty}</Td>
                    <Td>{formatCurrencyFull(m.rate)}</Td><Td>{formatCurrencyFull(m.amount)}</Td>
                    <Td>{m.verified ? <StatusBadge status="APPROVED" label="Verified" /> : <Button size="sm" variant="outline" onClick={() => verifyMeasurement(m.id, currentUser?.name ?? 'Engineer')}><FileCheck2 size={12} /> Verify</Button>}</Td>
                  </Tr>
                ))}
                {activeMeasurements.length === 0 && <Tr><Td className="py-4 text-center text-slate-400"><span>No linked measurement entries.</span></Td></Tr>}
              </TBody>
            </Table>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

export function ExpensesTab({ project }: { project: Project }) {
  const bills = useStore((s) => s.bills).filter((b) => b.projectId === project.id);
  const pending = bills.filter((b) => !['PAID', 'REJECTED'].includes(b.status)).length;
  const approved = bills.filter((b) => b.status === 'APPROVED' || b.status === 'PAID').length;
  const rejected = bills.filter((b) => b.status === 'REJECTED').length;
  const remaining = project.sanctionedBudget - project.amountSpent;

  const chartData = [
    { name: 'Sanctioned', value: project.sanctionedBudget },
    { name: 'Released', value: project.amountReleased },
    { name: 'Spent', value: project.amountSpent },
    { name: 'Remaining', value: remaining },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="Pending Bills" value={pending} />
        <StatBox label="Approved / Paid" value={approved} />
        <StatBox label="Rejected" value={rejected} />
        <StatBox label="Budget Utilization" value={`${Math.round((project.amountSpent / project.sanctionedBudget) * 100)}%`} />
      </div>

      <Card>
        <CardHeader><CardTitle>Budget vs Actual</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(v)} />
              <RTooltip formatter={(v: any) => formatCurrencyFull(v)} />
              <Bar dataKey="value" fill="#265aa0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {project.amountSpent > project.sanctionedBudget * 0.9 && (
        <div className="rounded-md bg-amber-50 px-4 py-2.5 text-xs text-amber-700">Budget utilization has crossed 90% — monitor remaining scope closely.</div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10.5px] uppercase text-slate-400">{label}</p><p className="mt-0.5 font-medium text-slate-700">{value}</p></div>;
}
function StatBox({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-3.5"><p className="text-[10.5px] font-medium uppercase text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-slate-800">{value}</p></div>;
}
