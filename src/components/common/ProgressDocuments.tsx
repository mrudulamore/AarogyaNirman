import { toast } from 'sonner';
import type { BillAttachment } from '../../types';
import { readBillFile } from '../../lib/billAttachments';
import { uiText } from '../../i18n/ui';

export function ProgressDocuments({ files, onChange, disabled }: { files: File[]; onChange: (files: File[]) => void; disabled?: boolean }) {
  return <div className="space-y-2">
    <label className="block text-xs font-medium text-slate-600">
      {uiText('Supporting documents (required)')}
      <input type="file" multiple accept="application/pdf,image/jpeg,image/png" disabled={disabled}
        className="mt-2 block w-full text-xs" onChange={event => {
          onChange([...files, ...Array.from(event.target.files ?? [])]); event.target.value = '';
        }} />
    </label>
    <p className="text-xs text-slate-500">{uiText('PDF, JPEG or PNG. Up to 5 files, 5 MB each.')}</p>
    {files.map((file, index) => <div key={index} className="flex items-center justify-between gap-2 text-xs">
      <span className="min-w-0 break-all">{file.name}</span>
      <button type="button" disabled={disabled} onClick={() => onChange(files.filter((_, i) => i !== index))} className="p-2 text-red-600">{uiText('Remove')}</button>
    </div>)}
  </div>;
}

export function ProgressDocumentLinks({ attachments }: { attachments?: BillAttachment[] }) {
  async function download(attachment: BillAttachment) {
    try {
      const blob = await readBillFile(attachment.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = attachment.name;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) { toast.error(uiText((error as Error).message)); }
  }
  return <div className="space-y-1">{attachments?.length ? attachments.map(file =>
    <button key={file.id} onClick={() => void download(file)} className="block break-all text-xs text-navy-700 underline">{file.name}</button>
  ) : <span className="text-xs text-slate-400">{uiText('No documents attached')}</span>}</div>;
}
