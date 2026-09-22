import { InspectionDetails } from '../../components/common/InspectionDetails';
import { uiText, useUiLanguage } from '../../i18n/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { Card, StatusBadge, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { KpiCard } from '../../components/common/KpiCard';
import { INSPECTION_CATEGORIES } from '../../lib/constants';
import { formatDate } from '../../lib/utils';
import { ShieldCheck, ShieldAlert, Clock, ClipboardCheck, MapPinned } from 'lucide-react';

export function QualityList() {
  useUiLanguage();
  const [detailId, setDetailId] = useState<string | null>(null);
  const { t } = useTranslation();
  const { projects, projectIds, scopeLabel, isStatewide } = useProjectScope();
  const allInspections = useStore((s) => s.inspections);
  const inspections = allInspections.filter((i) => projectIds.has(i.projectId));
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [resultFilter, setResultFilter] = useState('ALL');

  const filtered = inspections.filter((i) => (categoryFilter === 'ALL' || i.category === categoryFilter) && (resultFilter === 'ALL' || i.overallResult === resultFilter))
    .sort((a, b) => (a.scheduledDate < b.scheduledDate ? 1 : -1));

  const passCount = inspections.filter((i) => i.overallResult === 'PASS').length;
  const failCount = inspections.filter((i) => i.overallResult === 'FAIL').length;
  const scheduledCount = inspections.filter((i) => i.status === 'SCHEDULED').length;
  const avgScore = Math.round(inspections.filter((i) => i.status === 'COMPLETED').reduce((s, i) => s + i.score, 0) / (inspections.filter((i) => i.status === 'COMPLETED').length || 1));

  return (
    <div>
      <PageHeader title={uiText(t('pages.quality.title'))} description={uiText(t('pages.quality.desc'))} />

      {!isStatewide && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-navy-200 bg-navy-50 px-3 py-2 text-xs font-medium text-navy-700">
          <MapPinned size={14} />{uiText(" Showing inspections scoped to your jurisdiction: ")}{uiText(scopeLabel)}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label={uiText("Avg. Quality Score")} value={`${avgScore}%`} icon={ShieldCheck} tone="blue" />
        <KpiCard label={uiText("Passed Inspections")} value={passCount} icon={ClipboardCheck} tone="emerald" />
        <KpiCard label={uiText("Failed Inspections")} value={failCount} icon={ShieldAlert} tone="red" />
        <KpiCard label={uiText("Scheduled")} value={scheduledCount} icon={Clock} tone="amber" />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">{uiText("All Categories")}</SelectItem>{INSPECTION_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{uiText(c.replace(/_/g, ' '))}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={resultFilter} onValueChange={setResultFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{uiText("All Results")}</SelectItem>
            <SelectItem value="PASS">{uiText("PASS")}</SelectItem><SelectItem value="FAIL">{uiText("FAIL")}</SelectItem>
            <SelectItem value="CONDITIONAL">{uiText("CONDITIONAL")}</SelectItem><SelectItem value="NOT_INSPECTED">{uiText("NOT INSPECTED")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <THead><Tr><Th>{uiText("Project")}</Th><Th>{uiText("Category")}</Th><Th>{uiText("Scheduled")}</Th><Th>{uiText("Inspector")}</Th><Th>{uiText("Status")}</Th><Th>{uiText("Result")}</Th><Th>{uiText("Score")}</Th></Tr></THead>
          <TBody>
            {filtered.map((i) => (
              <Tr key={i.id} onClick={() => setDetailId(i.id)}>
                <Td className="max-w-[200px] truncate font-medium text-slate-800">{projects.find((p) => p.id === i.projectId)?.name}</Td>
                <Td>{uiText(i.category.replace(/_/g, ' '))}</Td>
                <Td>{uiText(formatDate(i.scheduledDate))}</Td>
                <Td>{uiText(i.inspector)}</Td>
                <Td><StatusBadge status={i.status} /></Td>
                <Td><StatusBadge status={i.overallResult} /></Td>
                <Td>{uiText(i.status === 'COMPLETED' ? `${i.score}%` : '—')}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>
      <InspectionDetails inspection={inspections.find(i => i.id === detailId)} onClose={() => setDetailId(null)} />
    </div>
  );
}
