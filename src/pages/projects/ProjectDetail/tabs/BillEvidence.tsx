import type { BillAttachment } from '../../../../types';
import { ProgressDocumentLinks } from '../../../../components/common/ProgressDocuments';
import { uiText } from '../../../../i18n/ui';
export function BillEvidence({ attachments = [] }: { attachments?: BillAttachment[] }) {
 return <section className="mt-4 space-y-2"><h3 className="text-xs font-semibold text-slate-600">{uiText(attachments.some(file => file.sample) ? 'Sample documents' : 'Submitted proof')}</h3><ProgressDocumentLinks attachments={attachments} /></section>;
}
