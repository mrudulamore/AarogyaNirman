import { uiText, useUiLanguage } from '../../../../i18n/ui';
import type { Project } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardHeader, CardTitle, StatusBadge, Table, THead, TBody, Tr, Th, Td, EmptyState } from '../../../../components/ui/primitives';
import { formatCurrency, formatDate } from '../../../../lib/utils';
import { Gavel } from 'lucide-react';

export function TenderTab({ project }: { project: Project }) {
  useUiLanguage();
  const tender = useStore((s) => s.tenders).find((t) => t.id === project.tenderId);

  if (!tender) {
    return <Card><EmptyState icon={<Gavel size={32} />} title={uiText("No tender record linked to this project")} /></Card>;
  }

  const savings = tender.awardValue ? tender.estimatedCost - tender.awardValue : undefined;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>{uiText(tender.title)}</CardTitle></CardHeader>
        <div className="grid grid-cols-2 gap-4 p-5 text-xs sm:grid-cols-4">
          <F label={uiText("Tender ID")} value={tender.id} />
          <F label={uiText("Type")} value={tender.tenderType.replace(/_/g, ' ')} />
          <F label={uiText("Status")}><StatusBadge status={tender.status} label={uiText(tender.status.replace(/_/g, ' '))} /></F>
          <F label={uiText("Estimated Cost")} value={formatCurrency(tender.estimatedCost)} />
          <F label={uiText("Publish Date")} value={formatDate(tender.publishDate)} />
          <F label={uiText("Submission Deadline")} value={formatDate(tender.submissionDeadline)} />
          <F label={uiText("Technical Opening")} value={tender.technicalOpeningDate ? formatDate(tender.technicalOpeningDate) : 'Pending'} />
          <F label={uiText("Financial Opening")} value={tender.financialOpeningDate ? formatDate(tender.financialOpeningDate) : 'Pending'} />
          <F label={uiText("Awarded To")} value={tender.selectedBidder ?? '—'} />
          <F label={uiText("Award Value")} value={tender.awardValue ? formatCurrency(tender.awardValue) : '—'} />
          <F label={uiText("Savings vs. Estimate")} value={savings !== undefined ? formatCurrency(savings) : '—'} tone={savings !== undefined ? (savings >= 0 ? 'good' : 'bad') : undefined} />
          <F label={uiText("Work Order Date")} value={tender.workOrderDate ? formatDate(tender.workOrderDate) : '—'} />
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>{uiText("Bid Evaluation (")}{tender.bidders.length}{uiText(" bidders)")}</CardTitle></CardHeader>
        <Table>
          <THead><Tr><Th>{uiText("Bidder")}</Th><Th>{uiText("Technical Score")}</Th><Th>{uiText("Financial Bid")}</Th><Th>{uiText("Qualified")}</Th><Th>{uiText("Result")}</Th></Tr></THead>
          <TBody>
            {tender.bidders.map((b) => (
              <Tr key={b.name}>
                <Td className="font-medium text-slate-800">{b.name}</Td>
                <Td>{uiText(b.technicalScore ?? '—')}</Td>
                <Td>{uiText(b.financialBid ? formatCurrency(b.financialBid) : '—')}</Td>
                <Td>{b.qualified ? <StatusBadge status="APPROVED" label={uiText("Qualified")} /> : <StatusBadge status="REJECTED" label={uiText("Disqualified")} />}</Td>
                <Td>{b.name === tender.selectedBidder ? <StatusBadge status="APPROVED" label={uiText("Awarded")} /> : '—'}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

function F({ label, value, children, tone }: { label: string; value?: string; children?: React.ReactNode; tone?: 'good' | 'bad' }) {
  useUiLanguage();
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wide text-slate-400">{uiText(label)}</p>
      <div className={`mt-0.5 font-medium ${tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : 'text-slate-700'}`}>{children ?? value}</div>
    </div>
  );
}
