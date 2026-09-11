import type { Project } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardHeader, CardTitle, StatusBadge, Table, THead, TBody, Tr, Th, Td, EmptyState } from '../../../../components/ui/primitives';
import { formatCurrency, formatDate } from '../../../../lib/utils';
import { Gavel } from 'lucide-react';

export function TenderTab({ project }: { project: Project }) {
  const tender = useStore((s) => s.tenders).find((t) => t.id === project.tenderId);

  if (!tender) {
    return <Card><EmptyState icon={<Gavel size={32} />} title="No tender record linked to this project" /></Card>;
  }

  const savings = tender.awardValue ? tender.estimatedCost - tender.awardValue : undefined;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>{tender.title}</CardTitle></CardHeader>
        <div className="grid grid-cols-2 gap-4 p-5 text-xs sm:grid-cols-4">
          <F label="Tender ID" value={tender.id} />
          <F label="Type" value={tender.tenderType.replace(/_/g, ' ')} />
          <F label="Status"><StatusBadge status={tender.status} label={tender.status.replace(/_/g, ' ')} /></F>
          <F label="Estimated Cost" value={formatCurrency(tender.estimatedCost)} />
          <F label="Publish Date" value={formatDate(tender.publishDate)} />
          <F label="Submission Deadline" value={formatDate(tender.submissionDeadline)} />
          <F label="Technical Opening" value={tender.technicalOpeningDate ? formatDate(tender.technicalOpeningDate) : 'Pending'} />
          <F label="Financial Opening" value={tender.financialOpeningDate ? formatDate(tender.financialOpeningDate) : 'Pending'} />
          <F label="Awarded To" value={tender.selectedBidder ?? '—'} />
          <F label="Award Value" value={tender.awardValue ? formatCurrency(tender.awardValue) : '—'} />
          <F label="Savings vs. Estimate" value={savings !== undefined ? formatCurrency(savings) : '—'} tone={savings !== undefined ? (savings >= 0 ? 'good' : 'bad') : undefined} />
          <F label="Work Order Date" value={tender.workOrderDate ? formatDate(tender.workOrderDate) : '—'} />
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>Bid Evaluation ({tender.bidders.length} bidders)</CardTitle></CardHeader>
        <Table>
          <THead><Tr><Th>Bidder</Th><Th>Technical Score</Th><Th>Financial Bid</Th><Th>Qualified</Th><Th>Result</Th></Tr></THead>
          <TBody>
            {tender.bidders.map((b) => (
              <Tr key={b.name}>
                <Td className="font-medium text-slate-800">{b.name}</Td>
                <Td>{b.technicalScore ?? '—'}</Td>
                <Td>{b.financialBid ? formatCurrency(b.financialBid) : '—'}</Td>
                <Td>{b.qualified ? <StatusBadge status="APPROVED" label="Qualified" /> : <StatusBadge status="REJECTED" label="Disqualified" />}</Td>
                <Td>{b.name === tender.selectedBidder ? <StatusBadge status="APPROVED" label="Awarded" /> : '—'}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

function F({ label, value, children, tone }: { label: string; value?: string; children?: React.ReactNode; tone?: 'good' | 'bad' }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wide text-slate-400">{label}</p>
      <div className={`mt-0.5 font-medium ${tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : 'text-slate-700'}`}>{children ?? value}</div>
    </div>
  );
}
