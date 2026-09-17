import { uiMessage, uiText, useUiLanguage } from '../../i18n/ui';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSignature, Clock, Gavel, TrendingDown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { Card, StatusBadge, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent } from '../../components/ui/overlays';
import { KpiCard } from '../../components/common/KpiCard';
import { TENDER_STAGES } from '../../lib/constants';
import { formatCurrency, formatDate } from '../../lib/utils';

export function TendersList() {
  useUiLanguage();
  const navigate = useNavigate();
  const { projectIds, scopeLabel, isStatewide } = useProjectScope();
  const allTenders = useStore((s) => s.tenders);
  const projects = useStore((s) => s.projects);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [detailId, setDetailId] = useState<string | null>(null);

  const tenders = useMemo(() => allTenders.filter((t) => projectIds.has(t.projectId)), [allTenders, projectIds]);
  const filtered = statusFilter === 'ALL' ? tenders : tenders.filter((t) => t.status === statusFilter);
  const active = tenders.find((t) => t.id === detailId);
  const activeProject = active ? projects.find((p) => p.id === active.projectId) : undefined;

  const preAward = tenders.filter((t) => t.status !== 'WORK_ORDER_ISSUED' && t.status !== 'CANCELLED').length;
  const awarded = tenders.filter((t) => t.status === 'WORK_ORDER_ISSUED');
  const totalSavings = awarded.reduce((sum, t) => sum + (t.awardValue ? t.estimatedCost - t.awardValue : 0), 0);
  const avgBidders = tenders.length ? Math.round((tenders.reduce((s, t) => s + t.bidders.length, 0) / tenders.length) * 10) / 10 : 0;

  return (
    <div>
      <PageHeader title={uiText("Tenders")} description={uiMessage("{{0}} of {{1}} tenders shown", [filtered.length, tenders.length])} />

      {!isStatewide && (
        <div className="mb-4 rounded-md border border-navy-200 bg-navy-50 px-3 py-2 text-xs font-medium text-navy-700">{uiText("Showing tenders within your jurisdiction: ")}{uiText(scopeLabel)}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label={uiText("Pre-Award (in process)")} value={preAward} icon={Clock} tone="amber" />
        <KpiCard label={uiText("Awarded / Work Order Issued")} value={awarded.length} icon={Gavel} tone="emerald" />
        <KpiCard label={uiText("Avg. Bidders per Tender")} value={avgBidders} icon={FileSignature} />
        <KpiCard label={uiText("Total Savings vs. Estimate")} value={formatCurrency(totalSavings)} icon={TrendingDown} tone="blue" />
      </div>

      <div className="mb-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{uiText("All Stages")}</SelectItem>
            {TENDER_STAGES.map((s) => <SelectItem key={s} value={s}>{uiText(s.replace(/_/g, ' '))}</SelectItem>)}
            <SelectItem value="CANCELLED">{uiText("CANCELLED")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <THead><Tr><Th>{uiText("Tender")}</Th><Th>{uiText("Project")}</Th><Th>{uiText("Estimated Cost")}</Th><Th>{uiText("Bidders")}</Th><Th>{uiText("Submission Deadline")}</Th><Th>{uiText("Awarded To")}</Th><Th>{uiText("Savings")}</Th><Th>{uiText("Status")}</Th></Tr></THead>
          <TBody>
            {filtered.map((t) => {
              const p = projects.find((pr) => pr.id === t.projectId);
              const savings = t.awardValue ? t.estimatedCost - t.awardValue : undefined;
              return (
                <Tr key={t.id} onClick={() => setDetailId(t.id)}>
                  <Td className="font-medium text-slate-800">{t.id}</Td>
                  <Td className="max-w-[200px] truncate">{p?.name}</Td>
                  <Td>{uiText(formatCurrency(t.estimatedCost))}</Td>
                  <Td>{t.bidders.length}</Td>
                  <Td>{uiText(formatDate(t.submissionDeadline))}</Td>
                  <Td className="max-w-[160px] truncate">{uiText(t.selectedBidder ?? '—')}</Td>
                  <Td className={savings !== undefined ? (savings >= 0 ? 'text-emerald-600' : 'text-red-600') : ''}>
                    {uiText(savings !== undefined ? formatCurrency(savings) : '—')}
                  </Td>
                  <Td><StatusBadge status={t.status} label={uiText(t.status.replace(/_/g, ' '))} /></Td>
                </Tr>
              );
            })}
            {filtered.length === 0 && <Tr><Td className="py-8 text-center text-slate-400"><span>{uiText("No tenders match this filter.")}</span></Td></Tr>}
          </TBody>
        </Table>
      </Card>

      <Dialog open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)}>
        {active && (
          <DialogContent title={uiText(active.title)} description={uiText(activeProject?.name)} size="lg">
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <Field label={uiText("Tender ID")} value={active.id} />
              <Field label={uiText("Type")} value={active.tenderType.replace(/_/g, ' ')} />
              <Field label={uiText("Estimated Cost")} value={formatCurrency(active.estimatedCost)} />
              <Field label={uiText("Publish Date")} value={formatDate(active.publishDate)} />
              <Field label={uiText("Pre-Bid Meeting")} value={active.preBidDate ? formatDate(active.preBidDate) : '—'} />
              <Field label={uiText("Submission Deadline")} value={formatDate(active.submissionDeadline)} />
              <Field label={uiText("Technical Opening")} value={active.technicalOpeningDate ? formatDate(active.technicalOpeningDate) : 'Pending'} />
              <Field label={uiText("Financial Opening")} value={active.financialOpeningDate ? formatDate(active.financialOpeningDate) : 'Pending'} />
              <Field label={uiText("Award Value")} value={active.awardValue ? formatCurrency(active.awardValue) : '—'} />
              <Field label={uiText("LOA Date")} value={active.loaDate ? formatDate(active.loaDate) : '—'} />
              <Field label={uiText("Agreement Date")} value={active.agreementDate ? formatDate(active.agreementDate) : '—'} />
              <Field label={uiText("Work Order Date")} value={active.workOrderDate ? formatDate(active.workOrderDate) : '—'} />
            </div>

            <p className="mb-2 mt-4 text-xs font-semibold text-slate-600">{uiText("Bidders (")}{active.bidders.length})</p>
            <Table>
              <THead><Tr><Th>{uiText("Bidder")}</Th><Th>{uiText("Technical Score")}</Th><Th>{uiText("Financial Bid")}</Th><Th>{uiText("Qualified")}</Th><Th>{uiText("Selected")}</Th></Tr></THead>
              <TBody>
                {active.bidders.map((b) => (
                  <Tr key={b.name}>
                    <Td className="font-medium text-slate-800">{b.name}</Td>
                    <Td>{uiText(b.technicalScore ?? '—')}</Td>
                    <Td>{uiText(b.financialBid ? formatCurrency(b.financialBid) : '—')}</Td>
                    <Td>{b.qualified ? <StatusBadge status="APPROVED" label={uiText("Qualified")} /> : <StatusBadge status="REJECTED" label={uiText("Disqualified")} />}</Td>
                    <Td>{b.name === active.selectedBidder ? <StatusBadge status="APPROVED" label={uiText("Awarded")} /> : '—'}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>

            {activeProject && (
              <button
                onClick={() => navigate(`/projects/${activeProject.id}?tab=tender`)}
                className="mt-4 text-xs font-medium text-navy-700 underline"
              >{uiText("View this tender on the Project 360 page →")}</button>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  useUiLanguage();
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wide text-slate-400">{uiText(label)}</p>
      <p className="mt-0.5 font-medium text-slate-700">{uiText(value)}</p>
    </div>
  );
}
