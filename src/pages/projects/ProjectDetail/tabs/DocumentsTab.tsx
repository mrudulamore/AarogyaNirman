import { useState } from 'react';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle2, Download, Search } from 'lucide-react';
import type { Project, DocumentType, ProjectDocument } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, Button, StatusBadge, Table, THead, TBody, Tr, Th, Td, Input, EmptyState } from '../../../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Dialog, DialogContent, DialogFooter } from '../../../../components/ui/overlays';
import { formatDate } from '../../../../lib/utils';
import { downloadDocumentRecord } from '../../../../lib/pdf';
import { documentLifecyclePhase } from '../../../../lib/constants';

const DOC_TYPES: DocumentType[] = ['DPR', 'Administrative Sanction', 'Technical Sanction', 'Tender', 'Work Order', 'Agreement', 'BOQ', 'Drawings', 'Inspection Report', 'Test Report', 'Bills', 'Approvals', 'Completion Certificate', 'Handover Documents'];

export function DocumentsTab({ project }: { project: Project }) {
  const documents = useStore((s) => s.documents).filter((d) => d.projectId === project.id);
  const currentUser = useStore((s) => s.currentUser);
  const uploadDocument = useStore((s) => s.uploadDocument);
  const setDocumentStatus = useStore((s) => s.setDocumentStatus);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ name: '', type: DOC_TYPES[0] as DocumentType });

  const filtered = documents.filter((d) => (typeFilter === 'ALL' || d.type === typeFilter) && d.name.toLowerCase().includes(q.toLowerCase()));
  const readOnly = currentUser?.role === 'MINISTER' || currentUser?.role === 'VIGILANCE_AUDIT';

  function downloadRecord(d: ProjectDocument) {
    downloadDocumentRecord({
      heading: d.name,
      filename: `${d.id}_${d.name.replace(/[^a-z0-9]+/gi, '_')}.pdf`,
      fields: [
        { label: 'Document ID', value: d.id },
        { label: 'Type', value: d.type },
        { label: 'Lifecycle Phase', value: documentLifecyclePhase(d.type) },
        { label: 'Project', value: project.name },
        { label: 'Uploaded By', value: d.uploadedBy },
        { label: 'Upload Date', value: formatDate(d.uploadDate) },
        { label: 'Version', value: `v${d.version}` },
        { label: 'Approval Status', value: d.approvalStatus },
        { label: 'File Size', value: `${(d.sizeKb / 1024).toFixed(2)} MB` },
      ],
    });
    toast.success('Document downloaded.');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5">
            <Search size={13} className="text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…" className="w-40 text-xs outline-none" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">All Types</SelectItem>{DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {!readOnly && <Button onClick={() => setUploadOpen(true)}><Upload size={15} /> Upload Document</Button>}
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon={<FileText size={32} />} title="No documents found" />
        ) : (
          <Table>
            <THead><Tr><Th>Document</Th><Th>Type</Th><Th>Version</Th><Th>Uploaded By</Th><Th>Date</Th><Th>Size</Th><Th>Status</Th><Th /></Tr></THead>
            <TBody>
              {filtered.map((d) => (
                <Tr key={d.id}>
                  <Td className="flex max-w-[220px] items-center gap-1.5 truncate font-medium text-slate-800"><FileText size={13} className="shrink-0 text-slate-400" />{d.name}</Td>
                  <Td>{d.type}</Td>
                  <Td>v{d.version}</Td>
                  <Td>{d.uploadedBy}</Td>
                  <Td>{formatDate(d.uploadDate)}</Td>
                  <Td>{(d.sizeKb / 1024).toFixed(1)} MB</Td>
                  <Td><StatusBadge status={d.approvalStatus} /></Td>
                  <Td className="space-x-1.5 whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => downloadRecord(d)} title="Download document (PDF)"><Download size={12} /></Button>
                    {!readOnly && d.approvalStatus === 'PENDING' && <Button size="sm" variant="outline" onClick={() => { setDocumentStatus(d.id, 'APPROVED'); toast.success('Document approved.'); }}><CheckCircle2 size={12} /> Approve</Button>}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent title="Upload Document" description={project.name}>
          <div className="space-y-3">
            <div><p className="mb-1 text-xs font-medium text-slate-600">Document Name</p><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Document Type</p>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as DocumentType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">Simulated file upload</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!form.name.trim()) { toast.error('Document name required.'); return; }
              uploadDocument({ projectId: project.id, name: form.name, type: form.type, uploadedBy: currentUser?.name ?? 'Deputy Engineer', sizeKb: Math.floor(200 + Math.random() * 5000) });
              toast.success('Document uploaded.'); setUploadOpen(false);
            }}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
