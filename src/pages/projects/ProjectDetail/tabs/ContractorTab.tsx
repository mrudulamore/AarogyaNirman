import { useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import type { Project } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardContent, CardHeader, CardTitle, Button, ProgressBar } from '../../../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Dialog, DialogContent, DialogFooter } from '../../../../components/ui/overlays';
import { formatCurrency, formatDate } from '../../../../lib/utils';

export function ContractorTab({ project }: { project: Project }) {
  const contractors = useStore((s) => s.contractors);
  const assignContractorToProject = useStore((s) => s.assignContractorToProject);
  const contractor = contractors.find((c) => c.id === project.contractorId);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [selected, setSelected] = useState(contractor?.id ?? '');

  if (!contractor) return <p className="text-sm text-slate-400">No contractor assigned.</p>;

  const metrics = [
    { label: 'Schedule Adherence', value: contractor.scheduleAdherence },
    { label: 'Quality Score', value: contractor.qualityScoreAvg },
    { label: 'Safety Score', value: contractor.safetyScore },
    { label: 'Bill Processing', value: contractor.billProcessingScore },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button variant="outline" onClick={() => setReassignOpen(true)}><RefreshCw size={14} /> Reassign Contractor</Button></div>
      <Card>
        <CardHeader><CardTitle>{contractor.company}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 text-xs">
            <Row label="Registration ID" value={contractor.regId} />
            <Row label="Contact Person" value={contractor.contactPerson} />
            <Row label="Phone" value={contractor.phone} />
            <Row label="Email" value={contractor.email} />
            <Row label="Contract Amount" value={formatCurrency(contractor.contractAmount)} />
            <Row label="Contract Period" value={`${formatDate(contractor.startDate)} — ${formatDate(contractor.endDate)}`} />
            <Row label="Open Defects" value={String(contractor.openDefects)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-600">Performance Scorecard — {contractor.performanceScore}%</p>
            <div className="space-y-3">
              {metrics.map((m) => (
                <div key={m.label}>
                  <div className="mb-1 flex justify-between text-[11px] text-slate-500"><span>{m.label}</span><span className="font-medium text-slate-700">{m.value}%</span></div>
                  <ProgressBar value={m.value} />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent title="Reassign Contractor" description={project.name}>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{contractors.map((c) => <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(false)}>Cancel</Button>
            <Button onClick={() => { assignContractorToProject(selected, project.id); toast.success('Contractor reassigned.'); setReassignOpen(false); }}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between border-b border-slate-50 pb-1.5"><span className="text-slate-400">{label}</span><span className="font-medium text-slate-700">{value}</span></div>;
}
