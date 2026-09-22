import type { Inspection } from '../../types';
import { Dialog, DialogContent, DialogFooter } from '../ui/overlays';
import { Button, StatusBadge } from '../ui/primitives';
import { uiText } from '../../i18n/ui';
import { formatDate } from '../../lib/utils';

export function InspectionDetails({ inspection, onClose }: { inspection?: Inspection; onClose: () => void }) {
  return <Dialog open={!!inspection} onOpenChange={open => !open && onClose()}>{inspection && <DialogContent title={uiText('Inspection details')} description={`${inspection.id} · ${uiText(inspection.category.replace(/_/g, ' '))}`} size="lg">
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap gap-2"><StatusBadge status={inspection.status}/><StatusBadge status={inspection.overallResult}/></div>
      <dl className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">{[['Inspector',inspection.inspector],['Scheduled',formatDate(inspection.scheduledDate)],['Completed',inspection.completedDate ? formatDate(inspection.completedDate) : 'Not completed'],['Score',inspection.status === 'COMPLETED' ? `${inspection.score}%` : 'Not available']].map(([label,value]) => <div key={label}><dt className="text-xs text-slate-500">{uiText(label)}</dt><dd className="mt-1 break-words font-medium">{uiText(value)}</dd></div>)}</dl>
      <section><h3 className="mb-2 font-semibold">{uiText('Inspector Comments')}</h3><p className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 p-4">{inspection.comments || uiText('No comments recorded yet.')}</p></section>
      <section><h3 className="mb-2 font-semibold">{uiText('Inspection checklist')}</h3>{!inspection.items.length && <p className="text-slate-500">{uiText('No checklist results recorded yet.')}</p>}<div className="space-y-3">{inspection.items.map(item => <div key={item.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><p className="font-medium">{uiText(item.requirement)}</p><StatusBadge status={item.result}/></div>{[['Measurement',item.measurement],['Standard',item.standard],['Evidence',item.evidence],['Remarks',item.remarks]].map(([label,value]) => value && <p key={label} className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600"><strong>{uiText(label)}: </strong>{uiText(value)}</p>)}</div>)}</div></section>
    </div><DialogFooter><Button variant="outline" onClick={onClose}>{uiText('Close')}</Button></DialogFooter>
  </DialogContent>}</Dialog>;
}
