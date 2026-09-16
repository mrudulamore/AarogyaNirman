import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Search, FileText, CheckCircle2, Download, History } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { Card, CardHeader, CardTitle, Button, StatusBadge, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent } from '../../components/ui/overlays';
import { formatDate } from '../../lib/utils';
import { DOCUMENT_LIFECYCLE_PHASES, documentLifecyclePhase } from '../../lib/constants';
import { downloadDocumentRecord } from '../../lib/pdf';
import type { DocumentType, ProjectDocument } from '../../types';

const DOC_TYPES: DocumentType[] = ['DPR', 'Administrative Sanction', 'Technical Sanction', 'Tender', 'Work Order', 'Agreement', 'BOQ', 'Drawings', 'Inspection Report', 'Test Report', 'Bills', 'Approvals', 'Completion Certificate', 'Handover Documents'];
const PHASE_FILTERS = ['ALL', ...DOCUMENT_LIFECYCLE_PHASES.map((p) => p.phase)];

export function DocumentsRepo() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { projects, projectIds } = useProjectScope();
  const allDocuments = useStore((s) => s.documents);
  const documents = allDocuments.filter((d) => projectIds.has(d.projectId));
  const setDocumentStatus = useStore((s) => s.setDocumentStatus);
  const [phaseFilter, setPhaseFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [q, setQ] = useState('');
  const [historyId, setHistoryId] = useState<string | null>(null);

  const filtered = documents.filter((d) =>
    (phaseFilter === 'ALL' || documentLifecyclePhase(d.type) === phaseFilter) &&
    (typeFilter === 'ALL' || d.type === typeFilter) &&
    (statusFilter === 'ALL' || d.approvalStatus === statusFilter) &&
    d.name.toLowerCase().includes(q.toLowerCase()),
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ProjectDocument[]>();
    for (const phase of DOCUMENT_LIFECYCLE_PHASES) map.set(phase.phase, []);
    filtered.forEach((d) => {
      const phase = documentLifecyclePhase(d.type);
      map.set(phase, [...(map.get(phase) ?? []), d]);
    });
    return Array.from(map.entries())
      .filter(([, docs]) => docs.length > 0)
      .map(([phase, docs]) => [phase, docs.sort((a, b) => (a.uploadDate < b.uploadDate ? 1 : -1))] as const);
  }, [filtered]);

  function downloadRecord(d: ProjectDocument) {
    downloadDocumentRecord({
      heading: d.name,
      filename: `${d.id}_${d.name.replace(/[^a-z0-9]+/gi, '_')}.pdf`,
      fields: [
        { label: 'Document ID', value: d.id },
        { label: 'Type', value: d.type },
        { label: 'Lifecycle Phase', value: documentLifecyclePhase(d.type) },
        { label: 'Project', value: projects.find((p) => p.id === d.projectId)?.name ?? '—' },
        { label: 'Uploaded By', value: d.uploadedBy },
        { label: 'Upload Date', value: formatDate(d.uploadDate) },
        { label: 'Version', value: `v${d.version}` },
        { label: 'Approval Status', value: d.approvalStatus },
        { label: 'File Size', value: `${(d.sizeKb / 1024).toFixed(2)} MB` },
      ],
    });
  }

  return (
    <div>
      <PageHeader title={t('pages.documents.title')} description={t('pages.documents.desc', { count: documents.length })} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5">
          <Search size={13} className="text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…" className="w-48 text-xs outline-none" />
        </div>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>{PHASE_FILTERS.map((p) => <SelectItem key={p} value={p}>{p === 'ALL' ? 'All Lifecycle Phases' : p}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">All Types</SelectItem>{DOC_TYPES.map((tp) => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">All Statuses</SelectItem><SelectItem value="APPROVED">Approved</SelectItem><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="REJECTED">Rejected</SelectItem></SelectContent>
        </Select>
      </div>

      {grouped.length === 0 && <p className="py-16 text-center text-sm text-slate-400">No documents match the selected filters.</p>}

      <div className="space-y-4">
        {grouped.map(([phase, docs]) => (
          <Card key={phase}>
            <CardHeader><CardTitle>{phase} <span className="ml-2 font-normal text-slate-400">{docs.length} document{docs.length === 1 ? '' : 's'}</span></CardTitle></CardHeader>
            <Table>
              <THead><Tr><Th>Document</Th><Th>Project</Th><Th>Type</Th><Th>Version</Th><Th>Uploaded By</Th><Th>Date</Th><Th>Status</Th><Th /></Tr></THead>
              <TBody>
                {docs.map((d) => (
                  <Tr key={d.id}>
                    <Td onClick={() => navigate(`/projects/${d.projectId}?tab=documents`)} className="flex max-w-[200px] cursor-pointer items-center gap-1.5 truncate font-medium text-slate-800"><FileText size={13} className="shrink-0 text-slate-400" />{d.name}</Td>
                    <Td className="max-w-[160px] truncate">{projects.find((p) => p.id === d.projectId)?.name}</Td>
                    <Td>{d.type}</Td>
                    <Td>
                      <button onClick={() => setHistoryId(d.id)} className="inline-flex items-center gap-1 text-navy-700 hover:underline">
                        v{d.version} {d.version > 1 && <History size={11} />}
                      </button>
                    </Td>
                    <Td>{d.uploadedBy}</Td>
                    <Td>{formatDate(d.uploadDate)}</Td>
                    <Td><StatusBadge status={d.approvalStatus} /></Td>
                    <Td className="space-x-1.5 whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => downloadRecord(d)}><Download size={12} /></Button>
                      {d.approvalStatus === 'PENDING' && <Button size="sm" variant="outline" onClick={() => { setDocumentStatus(d.id, 'APPROVED'); toast.success('Document approved.'); }}><CheckCircle2 size={12} /></Button>}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>
        ))}
      </div>

      <Dialog open={!!historyId} onOpenChange={(v) => !v && setHistoryId(null)}>
        {(() => {
          const d = documents.find((x) => x.id === historyId);
          if (!d) return null;
          return (
            <DialogContent title="Version History" description={d.name}>
              <div className="space-y-2 text-xs">
                {Array.from({ length: d.version }, (_, i) => d.version - i).map((v) => (
                  <div key={v} className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                    <span className="font-medium text-slate-700">Version {v}{v === d.version ? ' (current)' : ''}</span>
                    <span className="text-slate-400">{v === d.version ? formatDate(d.uploadDate) : 'Superseded — approved documents are never silently overwritten'}</span>
                  </div>
                ))}
              </div>
            </DialogContent>
          );
        })()}
      </Dialog>
    </div>
  );
}
