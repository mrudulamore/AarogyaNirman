import { uiText, useUiLanguage } from '../../i18n/ui';
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
  useUiLanguage();
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
      <PageHeader title={uiText(t('pages.defects.title'))} description={uiText(t('pages.defects.desc'))} />

      {!isStatewide && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-navy-200 bg-navy-50 px-3 py-2 text-xs font-medium text-navy-700">
          <MapPinned size={14} />{uiText(" Showing defects scoped to your jurisdiction: ")}{uiText(scopeLabel)}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label={uiText("Open Defects")} value={open} icon={AlertTriangle} tone="amber" />
        <KpiCard label={uiText("Critical")} value={critical} icon={AlertOctagon} tone="red" />
        <KpiCard label={uiText("Overdue")} value={overdue} icon={Clock} tone="red" />
        <KpiCard label={uiText("Closed")} value={closed} icon={CheckCircle2} tone="emerald" />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">{uiText("All Severities")}</SelectItem><SelectItem value="CRITICAL">{uiText("CRITICAL")}</SelectItem><SelectItem value="HIGH">{uiText("HIGH")}</SelectItem><SelectItem value="MEDIUM">{uiText("MEDIUM")}</SelectItem><SelectItem value="LOW">{uiText("LOW")}</SelectItem></SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{uiText("All Statuses")}</SelectItem>
            {['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'FIXED', 'REINSPECTION', 'CLOSED'].map((s) => <SelectItem key={s} value={s}>{uiText(s.replace('_', ' '))}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <THead><Tr><Th>{uiText("ID")}</Th><Th>{uiText("Project")}</Th><Th>{uiText("Location")}</Th><Th>{uiText("Category")}</Th><Th>{uiText("Severity")}</Th><Th>{uiText("Contractor")}</Th><Th>{uiText("Due Date")}</Th><Th>{uiText("Status")}</Th></Tr></THead>
          <TBody>
            {filtered.map((d) => (
              <Tr key={d.id} onClick={() => navigate(`/projects/${d.projectId}?tab=defects`)}>
                <Td className="font-mono text-[11px] text-slate-500">{d.id}</Td>
                <Td className="max-w-[160px] truncate font-medium text-slate-800">{projects.find((p) => p.id === d.projectId)?.name}</Td>
                <Td className="max-w-[140px] truncate">{uiText(d.location)}</Td>
                <Td>{uiText(d.category.replace(/_/g, ' '))}</Td>
                <Td><SeverityBadge severity={d.severity} /></Td>
                <Td className="max-w-[140px] truncate">{contractors.find((c) => c.id === d.contractorId)?.company}</Td>
                <Td className={new Date(d.dueDate) < new Date() && d.status !== 'CLOSED' ? 'font-medium text-red-600' : ''}>{uiText(formatDate(d.dueDate))}</Td>
                <Td><StatusBadge status={d.status} label={uiText(DEFECT_STATUS_LABELS[d.status])} /></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
