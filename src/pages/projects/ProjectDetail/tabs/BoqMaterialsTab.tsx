import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, PackageCheck, FlaskConical } from 'lucide-react';
import type { Project } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardHeader, CardTitle, Button, StatusBadge, ProgressBar, Table, THead, TBody, Tr, Th, Td, Input } from '../../../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Dialog, DialogContent, DialogFooter } from '../../../../components/ui/overlays';
import { formatCurrencyFull, formatDate } from '../../../../lib/utils';

export function BoqTab({ project }: { project: Project }) {
  const boqItems = useStore((s) => s.boqItems).filter((b) => b.projectId === project.id);
  const grouped = Array.from(new Set(boqItems.map((b) => b.category)));

  return (
    <div className="space-y-4">
      {grouped.map((cat) => (
        <Card key={cat}>
          <CardHeader><CardTitle>{cat}</CardTitle></CardHeader>
          <Table>
            <THead><Tr><Th>Item</Th><Th>Unit</Th><Th>Planned Qty</Th><Th>Completed Qty</Th><Th>Rate</Th></Tr></THead>
            <TBody>
              {boqItems.filter((b) => b.category === cat).map((b) => (
                <Tr key={b.id}>
                  <Td className="font-medium text-slate-800">{b.item}</Td>
                  <Td>{b.unit}</Td>
                  <Td>{b.plannedQty.toLocaleString('en-IN')}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span>{b.completedQty.toLocaleString('en-IN')}</span>
                      <ProgressBar value={(b.completedQty / b.plannedQty) * 100} className="h-1.5 w-16" />
                    </div>
                  </Td>
                  <Td>{formatCurrencyFull(b.rate)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      ))}
      {boqItems.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No BOQ items recorded.</p>}
    </div>
  );
}

export function MaterialsTab({ project }: { project: Project }) {
  const materials = useStore((s) => s.materials).filter((m) => m.projectId === project.id);
  const tests = useStore((s) => s.materialTests).filter((t) => t.projectId === project.id);
  const addMaterial = useStore((s) => s.addMaterial);
  const receiveMaterial = useStore((s) => s.receiveMaterial);
  const recordMaterialTest = useStore((s) => s.recordMaterialTest);

  const [addOpen, setAddOpen] = useState(false);
  const [receiveId, setReceiveId] = useState<string | null>(null);
  const [receiveQty, setReceiveQty] = useState(100);
  const [testOpen, setTestOpen] = useState(false);
  const [form, setForm] = useState({ name: '', supplier: '', orderedQty: 500, unit: 'bags' });
  const [testForm, setTestForm] = useState({ material: '', result: 'PASS' as const });

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setTestOpen(true)}><FlaskConical size={15} /> Record Material Test</Button>
        <Button onClick={() => setAddOpen(true)}><Plus size={15} /> Add Material</Button>
      </div>

      <Card>
        <Table>
          <THead><Tr><Th>Material</Th><Th>Supplier</Th><Th>Ordered</Th><Th>Received</Th><Th>Used</Th><Th>Remaining</Th><Th>Quality</Th><Th /></Tr></THead>
          <TBody>
            {materials.map((m) => (
              <Tr key={m.id}>
                <Td className="font-medium text-slate-800">{m.name}</Td>
                <Td className="max-w-[140px] truncate">{m.supplier}</Td>
                <Td>{m.orderedQty} {m.unit}</Td>
                <Td>{m.receivedQty} {m.unit}</Td>
                <Td>{m.usedQty} {m.unit}</Td>
                <Td>{m.remainingQty} {m.unit}</Td>
                <Td><StatusBadge status={m.qualityStatus} /></Td>
                <Td><Button size="sm" variant="outline" onClick={() => setReceiveId(m.id)}><PackageCheck size={12} /> Receive</Button></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>

      <Card>
        <CardHeader><CardTitle>Material Quality Tests</CardTitle></CardHeader>
        <Table>
          <THead><Tr><Th>Sample ID</Th><Th>Material</Th><Th>Test</Th><Th>Date</Th><Th>Standard</Th><Th>Inspector</Th><Th>Result</Th></Tr></THead>
          <TBody>
            {tests.map((t) => (
              <Tr key={t.id}>
                <Td className="font-mono text-[11px]">{t.sampleId}</Td>
                <Td>{t.material}</Td>
                <Td>{t.test}</Td>
                <Td>{formatDate(t.date)}</Td>
                <Td>{t.standard}</Td>
                <Td>{t.inspector}</Td>
                <Td><StatusBadge status={t.result} /></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent title="Add Material" description={project.name}>
          <div className="space-y-3">
            <div><p className="mb-1 text-xs font-medium text-slate-600">Material Name</p><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><p className="mb-1 text-xs font-medium text-slate-600">Supplier</p><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="mb-1 text-xs font-medium text-slate-600">Ordered Qty</p><Input type="number" value={form.orderedQty} onChange={(e) => setForm({ ...form, orderedQty: +e.target.value })} /></div>
              <div><p className="mb-1 text-xs font-medium text-slate-600">Unit</p><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!form.name.trim()) { toast.error('Material name required.'); return; }
              addMaterial({ projectId: project.id, name: form.name, supplier: form.supplier || 'Approved Vendor', orderedQty: form.orderedQty, receivedQty: 0, usedQty: 0, remainingQty: 0, unit: form.unit, deliveryDate: new Date().toISOString().slice(0, 10), qualityStatus: 'UNDER_TESTING' });
              toast.success('Material added to inventory.'); setAddOpen(false);
            }}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receiveId} onOpenChange={(v) => !v && setReceiveId(null)}>
        <DialogContent title="Receive Material Delivery">
          <div><p className="mb-1 text-xs font-medium text-slate-600">Quantity Received</p><Input type="number" value={receiveQty} onChange={(e) => setReceiveQty(+e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveId(null)}>Cancel</Button>
            <Button onClick={() => { if (receiveId) receiveMaterial(receiveId, receiveQty); toast.success('Delivery recorded.'); setReceiveId(null); }}>Confirm Receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent title="Record Material Test" description={project.name}>
          <div className="space-y-3">
            <div><p className="mb-1 text-xs font-medium text-slate-600">Material</p><Input value={testForm.material} onChange={(e) => setTestForm({ ...testForm, material: e.target.value })} placeholder="e.g. TMT Steel Bars Fe500" /></div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Result</p>
              <Select value={testForm.result} onValueChange={(v) => setTestForm({ ...testForm, result: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="PASS">PASS</SelectItem><SelectItem value="FAIL">FAIL</SelectItem><SelectItem value="PENDING">PENDING</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              recordMaterialTest({ projectId: project.id, sampleId: `SMP-${Math.floor(1000 + Math.random() * 8999)}`, material: testForm.material || 'Cement', supplier: 'Approved Vendor', date: new Date().toISOString().slice(0, 10), test: 'Quality Verification Test', result: testForm.result, standard: 'IS 12269', inspector: 'Deputy Engineer', reportRef: `RPT-${Math.floor(10000 + Math.random() * 89999)}` });
              toast.success('Material test recorded.'); setTestOpen(false);
            }}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
