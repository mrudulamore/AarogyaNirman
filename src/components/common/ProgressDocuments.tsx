import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { Dialog, DialogContent } from '../ui/overlays';
import type { BillAttachment } from '../../types';
import { readBillFile } from '../../lib/billAttachments';
import { uiText } from '../../i18n/ui';

export function ProgressDocuments({ files, onChange, disabled }: { files: File[]; onChange: (files: File[]) => void; disabled?: boolean }) {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  useEffect(() => { if (preview && !files.includes(preview.file)) setPreview(null); }, [files, preview]);
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
      <button type="button" className="flex min-h-10 min-w-0 flex-1 items-center gap-2 break-all text-left text-navy-700 hover:underline" onClick={() => setPreview({ file, url: URL.createObjectURL(file) })}><Eye size={14} className="shrink-0" />{file.name}<span className="ml-auto shrink-0">{uiText('Preview')}</span></button>
      <button type="button" disabled={disabled} onClick={() => onChange(files.filter((_, i) => i !== index))} className="p-2 text-red-600">{uiText('Remove')}</button>
    </div>)}
    <Dialog open={!!preview} onOpenChange={open => !open && setPreview(null)}>
      {preview && <DialogContent title={preview.file.name} size="lg">
        {['image/jpeg', 'image/png'].includes(preview.file.type)
          ? <img src={preview.url} alt={preview.file.name} className="max-h-[65vh] w-full rounded object-contain" />
          : preview.file.type === 'application/pdf'
            ? <object data={preview.url} type="application/pdf" aria-label={preview.file.name} className="h-[60vh] w-full"><p>{uiText('PDF preview is unavailable in this browser. Use the file link below.')}</p></object>
            : <p>{uiText('Preview unavailable for this file type.')}</p>}
        <a href={preview.url} download={preview.file.name} className="mt-3 inline-flex min-h-10 items-center gap-2 text-navy-700"><Download size={14} />{uiText('Download file')}</a>
      </DialogContent>}
    </Dialog>
  </div>;
}

export function ProgressDocumentLinks({ attachments }: { attachments?: BillAttachment[] }) {
  const [preview, setPreview] = useState<{ attachment: BillAttachment; url: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const requestId = useRef(0);
  useEffect(() => () => { requestId.current += 1; }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  async function view(attachment: BillAttachment) {
    const request = ++requestId.current;
    setLoading(attachment.id);
    try {
      const blob = await readBillFile(attachment.id);
      if (request !== requestId.current) return;
      setPreview({ attachment, url: URL.createObjectURL(blob) });
    } catch (error) {
      if (request === requestId.current) toast.error(uiText((error as Error).message));
    } finally {
      if (request === requestId.current) setLoading(null);
    }
  }
  async function download(attachment: BillAttachment) {
    try {
      const blob = await readBillFile(attachment.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = attachment.name;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) { toast.error(uiText((error as Error).message)); }
  }
  return <div className="space-y-2" onClick={event => event.stopPropagation()}>
    {attachments?.length ? attachments.map(file => <div key={file.id} className="text-xs">
      <button type="button" onClick={() => void view(file)} disabled={loading === file.id} className="block break-all text-left text-navy-700 underline">{file.name}</button>
      <div className="mt-1 flex flex-wrap gap-2">
        <button type="button" onClick={() => void view(file)} disabled={loading === file.id} aria-label={`${uiText('Preview')} ${file.name}`} className="inline-flex min-h-10 items-center gap-1 rounded border border-slate-200 px-2 text-navy-700 hover:bg-slate-50"><Eye size={14} />{uiText(loading === file.id ? 'Loading...' : 'Preview')}</button>
        <button type="button" onClick={() => void download(file)} aria-label={`${uiText('Download file')} ${file.name}`} className="inline-flex min-h-10 items-center gap-1 rounded border border-slate-200 px-2 text-navy-700 hover:bg-slate-50"><Download size={14} />{uiText('Download file')}</button>
      </div>
    </div>) : <span className="text-xs text-slate-400">{uiText('No documents attached')}</span>}
    <Dialog open={!!preview} onOpenChange={open => { if (!open) { requestId.current += 1; setLoading(null); setPreview(null); } }}>
      {preview && <DialogContent title={preview.attachment.name} size="lg">
        {['image/jpeg', 'image/png'].includes(preview.attachment.mimeType)
          ? <img src={preview.url} alt={preview.attachment.name} className="max-h-[65vh] w-full rounded bg-slate-50 object-contain" />
          : preview.attachment.mimeType === 'application/pdf'
            ? <object data={preview.url} type="application/pdf" aria-label={preview.attachment.name} className="h-[60vh] w-full"><p className="text-sm">{uiText('PDF preview is unavailable in this browser. Use the file link below.')}</p></object>
            : <p className="text-sm">{uiText('Preview unavailable for this file type.')}</p>}
        <a href={preview.url} download={preview.attachment.name} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded border border-slate-200 px-3 text-sm text-navy-700"><Download size={16} />{uiText('Download file')}</a>
      </DialogContent>}
    </Dialog>
  </div>;
}
