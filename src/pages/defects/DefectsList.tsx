import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { Card, SeverityBadge, StatusBadge, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { KpiCard } from '../../components/common/KpiCard';
import { formatDate } from '../../lib/utils';
import { AlertTriangle, AlertOctagon, CheckCircle2, Clock, MapPinned } from 'lucide-react';
import { DEFECT_STATUS_LABELS } from '../../lib/constants';

export function DefectsList() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { projects, projectIds, scopeLabel, isStatewide } = useProjectScope();
  const allDefects = useStore((s) => s.defects);
  const defects = allDefects.filter((d) => projectIds.has(d.projectId));
  const contractors = useStore((s) => s.contractors);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = defects.filter((d) => (severityFilter === 'ALL' || d.severity === severityFilter) && (statusFilter === 'ALL' || d.status === statusFilter))
    .sort((a, b) => (a.createdDate < b.createdDate ? 1 : -1));

  const open = defects.filter((d) => d.status !== 'CLOSED').length;
  const critical = defects.filter((d) => d.severity === 'CRITICAL' && d.status !== 'CLOSED').length;
  const overdue = defects.filter((d) => d.status !== 'CLOSED' && new Date(d.dueDate) < new Date()).length;
  const closed = defects.filter((d) => d.status === 'CLOSED').length;

  return (
    <div>
      <PageHeader title={t('pages.defects.title')} description={t('pages.defects.desc')} />

      {!isStatewide && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-navy-200 bg-navy-50 px-3 py-2 text-xs font-medium text-navy-700">
          <MapPinned size={14} /> Showing defects scoped to your jurisdiction: {scopeLabel}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Open Defects" value={open} icon={AlertTriangle} tone="amber" />
        <KpiCard label="Critical" value={critical} icon={AlertOctagon} tone="red" />
        <KpiCard label="Overdue" value={overdue} icon={Clock} tone="red" />
        <KpiCard label="Closed" value={closed} icon={CheckCircle2} tone="emerald" />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">All Severities</SelectItem><SelectItem value="CRITICAL">CRITICAL</SelectItem><SelectItem value="HIGH">HIGH</SelectItem><SelectItem value="MEDIUM">MEDIUM</SelectItem><SelectItem value="LOW">LOW</SelectItem></SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'FIXED', 'REINSPECTION', 'CLOSED'].map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <THead><Tr><Th>ID</Th><Th>Project</Th><Th>Location</Th><Th>Category</Th><Th>Severity</Th><Th>Contractor</Th><Th>Due Date</Th><Th>Status</Th></Tr></THead>
          <TBody>
            {filtered.map((d) => (
              <Tr key={d.id} onClick={() => navigate(`/projects/${d.projectId}?tab=defects`)}>
                <Td className="font-mono text-[11px] text-slate-500">{d.id}</Td>
                <Td className="max-w-[160px] truncate font-medium text-slate-800">{projects.find((p) => p.id === d.projectId)?.name}</Td>
                <Td className="max-w-[140px] truncate">{d.location}</Td>
                <Td>{d.category.replace(/_/g, ' ')}</Td>
                <Td><SeverityBadge severity={d.severity} /></Td>
                <Td className="max-w-[140px] truncate">{contractors.find((c) => c.id === d.contractorId)?.company}</Td>
                <Td className={new Date(d.dueDate) < new Date() && d.status !== 'CLOSED' ? 'font-medium text-red-600' : ''}>{formatDate(d.dueDate)}</Td>
                <Td><StatusBadge status={d.status} label={DEFECT_STATUS_LABELS[d.status]} /></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
